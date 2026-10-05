/**
 * ItineraryService.js
 * Builds an eco-cultural itinerary from the backend recommender. When the backend is
 * unreachable (offline mode) the same trained recommender runs on the phone over the bundled
 * destination dataset, as a TensorFlow Lite model (react-native-fast-tflite), or in plain
 * JavaScript where the native module is missing (Expo Go, web). Every generated itinerary is logged to recommendation_records
 * (model version, inputs, results, strategy) for the evaluation.
 */
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import { auth, db } from '../firebaseConfig';
import { recommendDestinations } from './aiClient';
import { loadPreferences } from './PreferencesService';
import { cacheItinerary } from './ItineraryCache';
import { logEvent } from './Analytics';
import localDestinations from '../assets/data/ai_destinations.json';
import contentModel from '../assets/data/content_recommender.json';
import crowdForecast from '../assets/data/crowd_forecast.json';
import { profileFromApp, scoreDestinations, inSeasonMonth, tfliteInput, crowdFor } from '../utils/recommenderModel';

// The TFLite runtime is a native module; it is absent in Expo Go and on web
let fastTflite = null;
try {
  fastTflite = require('react-native-fast-tflite');
} catch (e) {
  fastTflite = null;
}

let tfliteModel = null;
async function loadTflite() {
  if (!fastTflite) return null;
  if (!tfliteModel) {
    tfliteModel = fastTflite.loadTensorflowModel(require('../assets/models/content_recommender.tflite'))
      .catch(e => {
        console.log('TFLite model unavailable, using JavaScript inference:', e.message);
        return null;
      });
  }
  return tfliteModel;
}

/** Model scores for each candidate, plus which engine produced them. */
async function modelScores(profile, candidates, month) {
  const tfl = await loadTflite();
  if (tfl) {
    try {
      const [out] = await tfl.run([tfliteInput(contentModel, profile, candidates, month)]);
      return { scores: Array.from(out).slice(0, candidates.length), engine: 'tflite' };
    } catch (e) {
      console.log('TFLite inference failed, using JavaScript inference:', e.message);
    }
  }
  return { scores: scoreDestinations(contentModel, profile, candidates, month), engine: 'js' };
}

// Rough per-day spend (stay + food + local transport) in LKR for each budget tier
const DAILY_COST_LKR = { budget: 6000, standard: 15000, luxury: 40000 };

// Local dataset categories that suit each mood
const MOOD_CATEGORIES = {
  eco: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
  adventurer: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
  culture: ['Heritage & Culture'],
  spiritual: ['Heritage & Culture'],
  family: ['Beach', 'Wildlife', 'Nature & Viewpoint'],
};

export function moodKey(mood) {
  const m = String(mood || '').toLowerCase();
  if (m.includes('cultur')) return 'culture';
  if (m.includes('spirit')) return 'spiritual';
  if (m.includes('family') || m.includes('relax')) return 'family';
  if (m.includes('advent')) return 'adventurer';
  return 'eco';
}

const MOOD_TITLES = { eco: 'Eco Explorer', culture: 'Culture Seeker', spiritual: 'Spiritual', family: 'Family', adventurer: 'Adventure' };
/** Display label for a mood key or label ("culture" -> "Culture Seeker"). */
export function moodLabel(mood) {
  return mood ? MOOD_TITLES[moodKey(mood)] : 'Eco';
}

function budgetKey(budget) {
  const b = String(budget || '').toLowerCase();
  if (b.includes('lux')) return 'luxury';
  if (b.includes('budget') || b.includes('econom')) return 'budget';
  return 'standard';
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// On-device ranking with the trained content-based model (offline mode). Mirrors the
// backend's balanced strategy: model 50%, eco score 30%, mood category 20%.
async function localRecommendations({ mood, days, destination, budget, ecoInterest, avoidCrowds, mobility, month, year }) {
  const categories = MOOD_CATEGORIES[moodKey(mood)];
  const place = String(destination || '').toLowerCase();
  let candidates = localDestinations.filter(d => inSeasonMonth(d.seasonal_availability, month));
  if (place) {
    const local = candidates.filter(d =>
      d.name.toLowerCase().includes(place) || d.province.toLowerCase().includes(place));
    if (local.length >= days) candidates = local;
  }
  const profile = profileFromApp({ mood, budget, days, ecoInterest });
  const { scores: raw, engine } = await modelScores(profile, candidates, month);
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  const ranked = candidates
    .map((d, i) => {
      const model = hi > lo ? (raw[i] - lo) / (hi - lo) : 0.5;
      const crowd = crowdFor(crowdForecast[d.destination_id], year, month);
      let score = 0.5 * model + 0.3 * (d.eco_score / 100) + 0.2 * (categories.includes(d.category) ? 1 : 0);
      if (avoidCrowds) score -= 0.15 * crowd;
      if (mobility === 'low' && (d.category === 'Waterfall' || d.category === 'Nature & Viewpoint')) score -= 0.25;
      return { d, score };
    })
    .sort((a, b) => b.score - a.score);
  // Walking only: keep stops close to the best pick
  let picks = ranked;
  if (mobility === 'walking' && ranked.length > 0) {
    const first = ranked[0].d;
    const close = ranked.filter(r => distanceKm(parseFloat(first.lat), parseFloat(first.lon), parseFloat(r.d.lat), parseFloat(r.d.lon)) <= 15);
    if (close.length >= Math.min(days, 3)) picks = close;
  }
  const stops = picks
    .slice(0, days)
    .map(({ d, score }) => ({
      id: d.destination_id, name: d.name, category: d.category, province: d.province,
      lat: parseFloat(d.lat), lon: parseFloat(d.lon), ecoScore: Math.round(d.eco_score),
      matchScore: Math.round(score * 100),
    }));
  return { stops, engine };
}

// Facts the evaluation needs about a recommended place (RQ5, Objective 6)
const BY_NAME = new Map(localDestinations.map(d => [d.name, d]));
function destinationFacts(name) {
  const d = BY_NAME.get(name);
  if (!d) return { hiddenGem: false, eco: null };
  return { hiddenGem: String(d.hidden_gem).toLowerCase() === 'true', eco: Math.round(d.eco_score) };
}

// RQ3: each traveller is assigned one recommendation strategy, kept on their profile
const STRATEGIES = ['mood', 'location', 'seasonal'];
async function getStrategy(uid) {
  if (!uid) return 'balanced';
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data().recStrategy : null;
    if (STRATEGIES.includes(existing)) return existing;
    // Stable assignment from the user id, so it never changes between sessions
    const hash = [...uid].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const strategy = STRATEGIES[hash % STRATEGIES.length];
    await setDoc(ref, { recStrategy: strategy }, { merge: true });
    return strategy;
  } catch (e) {
    console.log('Could not read recommendation strategy:', e.message);
    return 'balanced';
  }
}

// Last known position, without prompting (used by the location strategy)
async function knownPosition() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getLastKnownPositionAsync();
    return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

// Order stops so each leg goes to the nearest unvisited destination
function orderByProximity(stops) {
  if (stops.length < 3) return stops;
  const remaining = [...stops];
  const ordered = [remaining.shift()];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let best = 0;
    remaining.forEach((s, i) => {
      if (distanceKm(last.lat, last.lon, s.lat, s.lon) <
          distanceKm(last.lat, last.lon, remaining[best].lat, remaining[best].lon)) best = i;
    });
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return ordered;
}

function transportFor(km) {
  if (km < 2) return 'walk';
  if (km < 40) return 'bus';
  if (km < 150) return 'train';
  return 'car';
}

const SPEED_KMH = { walk: 4.5, bus: 30, train: 40, car: 45 };

// Spreads the stops across the trip days (several stops a day on short trips)
export function buildPlan(stops, budget, days = stops.length) {
  const dailyCost = DAILY_COST_LKR[budgetKey(budget)];
  return orderByProximity(stops).map((dest, index, arr) => {
    const prev = arr[index - 1];
    const km = prev ? distanceKm(prev.lat, prev.lon, dest.lat, dest.lon) : 0;
    const transport = transportFor(km);
    return {
      id: `${dest.id}_${index}`,
      day: Math.floor((index * days) / arr.length) + 1,
      title: dest.name,
      activity: `Explore ${dest.name} in ${dest.province} (${dest.category})`,
      category: dest.category,
      province: dest.province,
      eco: dest.ecoScore,
      lat: dest.lat,
      lon: dest.lon,
      destinationId: dest.id,
      transport,
      distanceKm: Math.round(km * 10) / 10,
      travelMinutes: Math.round((km / SPEED_KMH[transport]) * 60),
      fee: `~LKR ${Math.round((dailyCost * days) / arr.length).toLocaleString()}`,
    };
  });
}

export function summarizePlan(plan, budget) {
  const ecoScore = plan.length
    ? Math.round(plan.reduce((sum, p) => sum + (Number(p.eco) || 0), 0) / plan.length)
    : 0;
  const days = plan.length ? Math.max(...plan.map(p => p.day || 1)) : 0;
  const total = days * DAILY_COST_LKR[budgetKey(budget)];
  return {
    ecoScore,
    duration: `${days} Day${days === 1 ? '' : 's'}`,
    cost: `LKR ${Math.round(total / 1000)}k`,
    totalDistanceKm: Math.round(plan.reduce((s, p) => s + (p.distanceKm || 0), 0)),
  };
}

/**
 * Generate, save and return an itinerary.
 * @returns {Promise<{id: string, offline: boolean, ...itinerary}>}
 */
export async function generateItinerary({ mood, days, budget, destination, ecoInterest, avoidCrowds, mobility }) {
  const started = Date.now();
  // Saved preferences (FR-010) fill in anything this request does not say
  const prefs = await loadPreferences();
  ecoInterest = ecoInterest ?? prefs.ecoPct;
  avoidCrowds = avoidCrowds ?? prefs.avoidCrowds;
  mobility = mobility ?? prefs.mobility;
  budget = budget || prefs.budget;
  const dayCount = Math.min(14, Math.max(1, parseInt(days, 10) || 5));
  // FR-011: 5-10 recommended locations per itinerary
  const stopCount = Math.min(10, Math.max(5, dayCount));
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const uid = auth.currentUser?.uid;
  const [strategy, position] = await Promise.all([getStrategy(uid), knownPosition()]);

  let stops;
  let offline = false;
  let modelVersion = contentModel.version;
  let rainyShare = null;
  let engine = 'backend';
  try {
    const result = await recommendDestinations({
      mood: moodKey(mood), days: stopCount, destination, budget, ecoInterest, month, strategy,
      lat: position?.lat, lon: position?.lon, avoidCrowds, mobility,
    });
    stops = (result.top_matches || []).map(d => ({
      id: d.id, name: d.name, category: d.category, province: d.province,
      lat: d.lat, lon: d.lon, ecoScore: d.ecoScore, matchScore: d.matchScore, reason: d.reason,
    }));
    modelVersion = result.modelVersion || modelVersion;
    rainyShare = result.weather ? result.weather.rainyShare : null;
    if (stops.length === 0) throw new Error('No recommendations returned');
  } catch (e) {
    console.warn('Recommendation backend unavailable, using the on-device model:', e.message);
    ({ stops, engine } = await localRecommendations({ mood, days: stopCount, destination, budget, ecoInterest, avoidCrowds, mobility, month, year }));
    offline = true;
  }

  const plan = buildPlan(stops, budget, dayCount);
  const itinerary = {
    title: `Your ${moodLabel(mood)} trip to ${destination || 'Sri Lanka'}`,
    userId: uid,
    createdAt: new Date().toISOString(),
    startDate: new Date().toISOString().slice(0, 10),
    mood: mood || null,
    budget: budget || 'Standard',
    destination: destination || null,
    source: offline ? 'on-device' : 'backend',
    modelVersion,
    strategy,
    plan,
    ...summarizePlan(plan, budget),
  };

  const docRef = await addDoc(collection(db, 'itineraries'), itinerary);
  const latencyMs = Date.now() - started;

  // Design section 4.4: one record per generated itinerary, for the evaluation (RQ2, RQ3, NFR-001)
  if (uid) {
    addDoc(collection(db, 'recommendation_records'), {
      userId: uid,
      itineraryId: docRef.id,
      createdAt: serverTimestamp(),
      modelVersion,
      strategy,
      source: itinerary.source,
      engine,
      latencyMs,
      inputs: {
        mood: mood || null, days: dayCount, budget: budget || null, destination: destination || null,
        ecoInterest: ecoInterest ?? null, month, avoidCrowds, mobility, hasLocation: Boolean(position),
      },
      rainyShare,
      results: stops.map(s => ({ id: s.id, name: s.name, matchScore: s.matchScore ?? null, ...destinationFacts(s.name) })),
    }).catch(e => console.log('Could not log recommendation record:', e.message));
  }

  const facts = stops.map(s => destinationFacts(s.name));
  logEvent('recommendation_shown', {
    itineraryId: docRef.id, stops: stops.length, engine, offline, latencyMs,
    hiddenGems: facts.filter(f => f.hiddenGem).length,
    avgEco: facts.length ? Math.round(facts.reduce((a, f) => a + (f.eco || 0), 0) / facts.length) : null,
  });

  const saved = { id: docRef.id, offline, latencyMs, ...itinerary };
  // FR-012: keep a copy on the phone so it opens without a connection
  cacheItinerary(saved);
  return saved;
}
