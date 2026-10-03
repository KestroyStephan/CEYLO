/**
 * Inference for the CEYLO trained models, exported to JSON by
 * ai_models/training/export_models.py. Plain JavaScript so the Render backend
 * needs no Python, TensorFlow or external AI service.
 */
const fs = require('fs');
const path = require('path');

const load = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'models', file), 'utf-8'));

const chatbotModel = load('chatbot.json');
const recommenderModel = load('recommender.json');
const demandModel = load('demand_lstm.json');
const ecoModel = load('eco_scorer.json');
const metrics = load('metrics.json');

// ---------------------------------------------------------------- small linear algebra
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const relu = (v) => v.map(x => (x > 0 ? x : 0));

// v (n) x W (n x m) + b (m)
function affine(v, W, b) {
    const out = b.slice();
    for (let i = 0; i < v.length; i++) {
        const vi = v[i];
        if (vi === 0) continue;
        const row = W[i];
        for (let j = 0; j < out.length; j++) out[j] += vi * row[j];
    }
    return out;
}

// ---------------------------------------------------------------- intent classifier
// Mirrors scikit-learn's TfidfVectorizer (word 1-2 grams and char_wb 3-5 grams, sublinear tf, l2 norm)
function tfidfBlock(terms, block) {
    const counts = new Map();
    for (const t of terms) {
        const idx = block.vocabulary[t];
        if (idx !== undefined) counts.set(idx, (counts.get(idx) || 0) + 1);
    }
    const features = new Map();
    let norm = 0;
    for (const [idx, c] of counts) {
        const v = (1 + Math.log(c)) * block.idf[idx];
        features.set(idx, v);
        norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [idx, v] of features) features.set(idx, v / norm);
    return features;
}

function wordTerms(text) {
    const tokens = text.match(new RegExp(chatbotModel.tokenPattern, 'g')) || [];
    const terms = [...tokens];
    for (let i = 0; i + 1 < tokens.length; i++) terms.push(`${tokens[i]} ${tokens[i + 1]}`);
    return terms;
}

function charTerms(text, min, max) {
    const terms = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const w = ` ${word} `;
        for (let n = min; n <= max; n++) {
            let offset = 0;
            terms.push(w.slice(offset, offset + n));
            while (offset + n < w.length) {
                offset += 1;
                terms.push(w.slice(offset, offset + n));
            }
            if (offset === 0) break; // short word counted once
        }
    }
    return terms;
}

/** Ranked intents for a message: [{ intent, confidence }], highest first. */
function classifyIntent(message) {
    const text = String(message || '').toLowerCase();
    const { word, char, coef, intercept, classes } = chatbotModel;
    const wordFeatures = tfidfBlock(wordTerms(text), word);
    const charFeatures = tfidfBlock(charTerms(text, char.min, char.max), char);
    const offset = word.idf.length;

    const logits = classes.map((_, k) => {
        let z = intercept[k];
        const row = coef[k];
        for (const [i, v] of wordFeatures) z += row[i] * v;
        for (const [i, v] of charFeatures) z += row[offset + i] * v;
        return z;
    });
    const top = Math.max(...logits);
    const exp = logits.map(z => Math.exp(z - top));
    const sum = exp.reduce((a, b) => a + b, 0);
    return classes
        .map((intent, k) => ({ intent, confidence: exp[k] / sum }))
        .sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------- recommender
const destIndex = new Map(recommenderModel.destinationIds.map((id, i) => [id, i]));

function cohortFor(mood) {
    const m = String(mood || '').toLowerCase();
    const key = Object.keys(recommenderModel.moodCohorts).find(k => m.includes(k)) ||
        (m.includes('cultur') ? 'culture' : m.includes('advent') ? 'adventurer' : m.includes('relax') ? 'relaxed'
            : m.includes('famil') ? 'family' : m.includes('spirit') ? 'spiritual' : m.includes('eco') || m.includes('nature') ? 'eco' : 'all');
    return { key, vector: recommenderModel.cohorts[key] || recommenderModel.cohorts.all };
}

/** Predicted engagement score (1-5 scale) of a traveller cohort for one destination. */
function predictEngagement(userVector, destinationId) {
    const d = destIndex.get(destinationId);
    if (d === undefined) return null;
    const [l1, l2, out] = recommenderModel.layers;
    const x = userVector.concat(recommenderModel.destinationEmbedding[d]);
    const h1 = relu(affine(x, l1.w, l1.b));
    const h2 = relu(affine(h1, l2.w, l2.b));
    return affine(h2, out.w, out.b)[0];
}

// ---------------------------------------------------------------- demand LSTM
function lstmLayer(sequence, layer) {
    const u = layer.units;
    let h = new Array(u).fill(0);
    let c = new Array(u).fill(0);
    const outputs = [];
    for (const x of sequence) {
        const z = affine(x, layer.kernel, layer.bias);
        const r = affine(h, layer.recurrentKernel, new Array(4 * u).fill(0));
        const nh = new Array(u);
        const nc = new Array(u);
        for (let j = 0; j < u; j++) {
            const i = sigmoid(z[j] + r[j]);
            const f = sigmoid(z[u + j] + r[u + j]);
            const g = Math.tanh(z[2 * u + j] + r[2 * u + j]);
            const o = sigmoid(z[3 * u + j] + r[3 * u + j]);
            nc[j] = f * c[j] + i * g;
            nh[j] = o * Math.tanh(nc[j]);
        }
        h = nh;
        c = nc;
        outputs.push(h);
    }
    return outputs;
}

function predictNextScaled(window) {
    let seq = window.map(v => [v]);
    for (const layer of demandModel.lstm) seq = lstmLayer(seq, layer);
    let v = seq[seq.length - 1];
    for (const d of demandModel.dense) v = affine(v, d.w, d.b);
    return v[0];
}

/** Recursive island-wide booking forecast for the days after the last observed day. */
function forecastDemand(days = 14, history = demandModel.history.map(h => h.bookings)) {
    const { min, max } = demandModel.scaler;
    const n = Math.min(60, Math.max(1, parseInt(days, 10) || 14));
    const window = history.slice(-demandModel.lookBack).map(v => (v - min) / (max - min));
    const out = [];
    for (let i = 0; i < n; i++) {
        const next = predictNextScaled(window.slice(-demandModel.lookBack));
        window.push(next);
        out.push(next * (max - min) + min);
    }
    return out;
}

// ---------------------------------------------------------------- eco scorer
/** Eco score (0-100) from the five sustainability features, averaged over the forest. */
function predictEcoScore(features) {
    const x = ecoModel.features.map(f => {
        const v = features[f];
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (v === 'True' || v === 'true') return 1;
        if (v === 'False' || v === 'false') return 0;
        return Number(v);
    });
    if (x.some(v => !Number.isFinite(v))) return null;
    let sum = 0;
    for (const t of ecoModel.trees) {
        let node = 0;
        while (t.left[node] !== -1) node = x[t.feature[node]] <= t.threshold[node] ? t.left[node] : t.right[node];
        sum += t.value[node];
    }
    return sum / ecoModel.trees.length;
}

module.exports = {
    classifyIntent,
    chatbotResponses: chatbotModel.responses,
    faqCategories: chatbotModel.faqCategories,
    cohortFor,
    predictEngagement,
    forecastDemand,
    demandHistory: demandModel.history,
    predictEcoScore,
    ecoFeatures: ecoModel.features,
    ecoImportances: ecoModel.importances,
    metrics,
    checks: {
        chatbot: chatbotModel.checks,
        recommender: recommenderModel.checks,
        demand: demandModel.checks,
        eco: ecoModel.checks,
    },
};
