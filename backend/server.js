const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { rateLimit } = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Load 100,000 destinations into memory for fast retrieval
console.log('Loading 100,000 dataset into memory...');
const destinations = JSON.parse(fs.readFileSync(path.join(__dirname, 'destinations.json'), 'utf-8'));
console.log('Dataset loaded successfully.');

// Firebase Web API key is public by design; it is only used to validate ID tokens.
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyACNB5L3HjIjZIwuYA4T-f6cUFt-G4NOk8';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ceylo-app';
const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'support', 'content_manager'];

// Vibes that exist in the dataset: "Eco Explorer", "Culture Seeker", "Family Trip".
// The app sends onboarding ids (eco, culture, ...) or chatbot labels (Eco Explorer, ...).
const MOOD_TO_VIBE = {
    eco: 'Eco Explorer', 'eco explorer': 'Eco Explorer', 'eco-friendly': 'Eco Explorer', nature: 'Eco Explorer',
    adventurer: 'Eco Explorer', adventure: 'Eco Explorer',
    culture: 'Culture Seeker', 'culture seeker': 'Culture Seeker', cultural: 'Culture Seeker',
    spiritual: 'Culture Seeker',
    family: 'Family Trip', 'family trip': 'Family Trip', relaxed: 'Family Trip', romantic: 'Family Trip',
};

function moodToVibe(mood) {
    return MOOD_TO_VIBE[String(mood || '').trim().toLowerCase()] || 'Eco Explorer';
}

function recommend({ mood, days, destination }) {
    const targetVibe = moodToVibe(mood);
    const count = Math.min(10, Math.max(5, parseInt(days, 10) || 5));
    const place = String(destination || '').trim().toLowerCase();

    let candidates = destinations.filter(d => d.vibe === targetVibe);
    if (place) {
        const local = candidates.filter(d =>
            d.name.toLowerCase().includes(place) || d.province.toLowerCase().includes(place));
        if (local.length >= count) candidates = local;
    }

    const score = d => (d.ecoScore * 0.7) + ((10000 - d.popularity) * 0.003);
    candidates.sort((a, b) => score(b) - score(a));

    return {
        vibe: targetVibe,
        top_matches: candidates.slice(0, count).map(d => ({
            ...d,
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
            rating: parseFloat(d.rating),
        })),
    };
}

// Verifies a Firebase ID token by asking the Identity Toolkit who it belongs to.
async function verifyIdToken(idToken) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId || null;
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });
    try {
        const uid = await verifyIdToken(idToken);
        if (!uid) return res.status(401).json({ error: 'Invalid auth token' });
        req.uid = uid;
        req.idToken = idToken;
        next();
    } catch (e) {
        res.status(503).json({ error: 'Auth service unavailable' });
    }
}

// Reads the caller's role through the Firestore REST API with their own token,
// so the server needs no service account.
async function getUserRole(uid, idToken) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.fields?.role?.stringValue || null;
}

async function requireStaff(req, res, next) {
    try {
        const role = await getUserRole(req.uid, req.idToken);
        if (!STAFF_ROLES.includes(role)) return res.status(403).json({ error: 'Admin access required' });
        next();
    } catch (e) {
        res.status(503).json({ error: 'Could not verify role' });
    }
}

const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api/', apiLimiter);

// Recommendation endpoint: best destinations for a mood, 5-10 items (one per trip day)
app.post('/api/recommend', (req, res) => {
    const { mood, days, destination } = req.body || {};
    const start = performance.now();
    const result = recommend({ mood, days, destination });
    console.log(`Recommendation for mood "${mood}" -> ${result.vibe} in ${(performance.now() - start).toFixed(2)}ms`);
    res.json({ success: true, mood, ...result });
});

const safeParseJSON = (raw) => {
    const text = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(text);
};

// LLM proxy: keeps provider API keys on the server instead of inside the mobile app.
// Body: { system: string, messages: [{ role: 'user'|'assistant', content: string }] }
app.post('/api/chat', aiLimiter, requireAuth, async (req, res) => {
    const { system = '', messages = [] } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages is required' });
    }
    const history = messages.slice(-20).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 4000),
    }));

    const providers = [
        { name: 'Groq', key: process.env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
        { name: 'OpenAI', key: process.env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
        { name: 'Gemini', key: process.env.GEMINI_API_KEY, gemini: true, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    ];

    for (const p of providers) {
        if (!p.key) continue;
        try {
            let response;
            if (p.gemini) {
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent?key=${p.key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: system }] },
                        contents: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                        generationConfig: { responseMimeType: 'application/json' },
                    }),
                    signal: AbortSignal.timeout(20000),
                });
            } else {
                response = await fetch(p.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
                    body: JSON.stringify({
                        model: p.model,
                        messages: [{ role: 'system', content: system }, ...history],
                        response_format: { type: 'json_object' },
                    }),
                    signal: AbortSignal.timeout(20000),
                });
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const text = p.gemini
                ? data?.candidates?.[0]?.content?.parts?.[0]?.text
                : data?.choices?.[0]?.message?.content;
            if (!text) throw new Error('empty response');
            return res.json({ provider: p.name, result: safeParseJSON(text) });
        } catch (e) {
            console.warn(`${p.name} failed:`, e.message);
        }
    }
    res.status(502).json({ error: 'All AI providers failed or none are configured' });
});

// Push broadcast proxy: Expo's push API cannot be called from a browser (CORS),
// and only staff may broadcast.
app.post('/api/push', requireAuth, requireStaff, async (req, res) => {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages is required' });
    }
    const valid = messages.filter(m => typeof m.to === 'string' && m.to.startsWith('ExponentPushToken'));
    const tickets = [];
    try {
        for (let i = 0; i < valid.length; i += 100) {
            const r = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(valid.slice(i, i + 100)),
            });
            const data = await r.json();
            tickets.push(...(data.data || []));
        }
        res.json({ success: true, sent: valid.length, tickets });
    } catch (e) {
        res.status(502).json({ error: 'Expo push service failed: ' + e.message });
    }
});

// Health check endpoint for system monitoring and frontend integration
app.get('/api/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'CEYLO AI RAG Backend',
        destinationsLoaded: destinations ? destinations.length : 0,
        aiProviders: {
            groq: !!process.env.GROQ_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
        },
        timestamp: new Date().toISOString()
    });
});

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`CEYLO AI RAG Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
module.exports.moodToVibe = moodToVibe;
module.exports.recommend = recommend;
