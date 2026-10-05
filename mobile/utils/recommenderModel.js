/**
 * recommenderModel.js
 * Inference for the CEYLO content-based recommender (ai_models/training/train_content_recommender.py).
 * Pure JavaScript with no dependencies: the phone uses it to build itineraries offline and the
 * backend keeps an identical copy in backend/ai/recommenderModel.js (a test checks they match).
 */

// App moods (onboarding ids and chatbot labels) -> mood profiles the model was trained on
const MOOD_PROFILES = {
  eco: ['Nature', 'Wildlife'],
  adventurer: ['Adventure'],
  culture: ['Culture'],
  spiritual: ['Culture', 'Relaxation'],
  family: ['Relaxation', 'Wildlife'],
  relaxed: ['Relaxation'],
  romantic: ['Relaxation'],
  wildlife: ['Wildlife'],
  nightlife: ['Nightlife'],
};

function moodKeyOf(mood) {
  const m = String(mood || '').toLowerCase();
  if (m.includes('cultur')) return 'culture';
  if (m.includes('spirit')) return 'spiritual';
  if (m.includes('famil')) return 'family';
  if (m.includes('relax')) return 'relaxed';
  if (m.includes('romant')) return 'romantic';
  if (m.includes('advent')) return 'adventurer';
  if (m.includes('wildlife')) return 'wildlife';
  if (m.includes('night')) return 'nightlife';
  if (m.includes('eco') || m.includes('nature')) return 'eco';
  return null;
}

/** Traveller profile in the model's terms from what the app knows about the user. */
function profileFromApp({ mood, budget, days, ecoInterest } = {}) {
  const key = moodKeyOf(mood);
  const b = String(budget || '').toLowerCase();
  return {
    moods: key ? MOOD_PROFILES[key] : [],
    eco: key === 'eco' || Number(ecoInterest) >= 60,
    budget: b.includes('lux') ? 'Luxury' : (b.includes('budget') || b.includes('econom')) ? 'Budget' : 'Mid-Range',
    days: parseInt(days, 10) || 5,
  };
}

// Seasonal availability values in the dataset: "Year-Round", "Nov-April", "May-Oct" (month 1-12)
function inSeasonMonth(availability, month) {
  if (availability === 'Nov-April') return month >= 11 || month <= 4 ? 1 : 0;
  if (availability === 'May-Oct') return month >= 5 && month <= 10 ? 1 : 0;
  return 1;
}

const truthy = (v) => v === true || v === 'True' || v === 'true' || v === 1 || v === '1';

function userFeatures(model, profile, month) {
  const f = model.moods.map(m => (profile.moods.includes(m) ? 1 : 0));
  f.push(profile.eco ? 1 : 0);
  model.budgets.forEach(b => f.push(profile.budget === b ? 1 : 0));
  f.push(Math.min(Math.max(profile.days, 1), 21) / 21);
  f.push(Math.sin((2 * Math.PI * (month - 1)) / 12));
  f.push(Math.cos((2 * Math.PI * (month - 1)) / 12));
  return f;
}

function destinationFeatures(model, d, month) {
  const f = model.categories.map(c => (d.category === c ? 1 : 0));
  f.push(Number(d.eco_score) / 100);
  model.ecoFeatures.forEach(x => f.push(Number(d[x]) / 100));
  f.push(truthy(d.carrying_capacity_adherence) ? 1 : 0);
  f.push(1 - (parseInt(d.popularity_rank, 10) - 1) / (model.destinationCount - 1));
  f.push((Number(d.avg_rating) || model.ratingImpute || 4.5) / 5);   // median for unrated places
  f.push(truthy(d.hidden_gem) ? 1 : 0);
  f.push(inSeasonMonth(d.seasonal_availability, month));
  return f;
}

function forward(model, x) {
  let v = x;
  for (const layer of model.layers) {
    const out = layer.b.slice();
    for (let i = 0; i < v.length; i++) {
      if (v[i] === 0) continue;
      const row = layer.w[i];
      for (let j = 0; j < out.length; j++) out[j] += v[i] * row[j];
    }
    if (layer.activation === 'relu') v = out.map(z => (z > 0 ? z : 0));
    else if (layer.activation === 'sigmoid') v = out.map(z => 1 / (1 + Math.exp(-z)));
    else v = out;
  }
  return v[0];
}

/**
 * Predicted engagement (0-1) of a traveller with each destination in a given month.
 * @param {object} model - parsed content_recommender.json
 * @param {object} profile - from profileFromApp()
 * @param {object[]} destinations - dataset rows
 * @param {number} month - 1-12
 */
function scoreDestinations(model, profile, destinations, month) {
  const u = userFeatures(model, profile, month);
  return destinations.map(d => forward(model, u.concat(destinationFeatures(model, d, month))));
}

/**
 * Input for the TensorFlow Lite model: a Float32Array of model.tflite.batch rows x features,
 * one row per destination, zero-padded when there are fewer destinations than the batch.
 */
function tfliteInput(model, profile, destinations, month) {
  const { batch, features } = model.tflite;
  const input = new Float32Array(batch * features);
  const u = userFeatures(model, profile, month);
  destinations.slice(0, batch).forEach((d, i) => input.set(u.concat(destinationFeatures(model, d, month)), i * features));
  return input;
}

/**
 * Forecast crowd level (0-1) of a destination for a month, from the per-destination LSTM.
 * Beyond the forecast horizon it uses the same calendar month of the latest forecast year.
 */
function crowdFor(forecast, year, month) {
  if (!forecast) return 0;
  const mm = String(month).padStart(2, '0');
  if (forecast[`${year}-${mm}`] != null) return forecast[`${year}-${mm}`];
  const keys = Object.keys(forecast).filter(k => k.endsWith(`-${mm}`)).sort();
  return keys.length ? forecast[keys[keys.length - 1]] : 0;
}

module.exports = {
  profileFromApp, moodKeyOf, scoreDestinations, userFeatures, destinationFeatures, forward, inSeasonMonth,
  tfliteInput, crowdFor, MOOD_PROFILES,
};
