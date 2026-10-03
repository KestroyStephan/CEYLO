/**
 * ItineraryService.js
 * Builds an eco-cultural itinerary from the backend recommender, falling back to the
 * bundled destination dataset when the backend is unreachable (offline mode).
 */
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { recommendDestinations } from './aiClient';
import localDestinations from '../assets/data/ai_destinations.json';

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

// Seasonal availability values in the dataset: "Year-Round", "Nov-April", "May-Oct"
function inSeason(availability, month = new Date().getMonth()) {
  if (!availability || availability === 'Year-Round') return true;
  if (availability.startsWith('Nov')) return month >= 10 || month <= 3;
  if (availability.startsWith('May')) return month >= 4 && month <= 9;
  return true;
}

function localRecommendations({ mood, days, destination }) {
  const categories = MOOD_CATEGORIES[moodKey(mood)];
  const place = String(destination || '').toLowerCase();
  let candidates = localDestinations.filter(d =>
    categories.includes(d.category) && inSeason(d.seasonal_availability));
  if (place) {
    const local = candidates.filter(d =>
      d.name.toLowerCase().includes(place) || d.province.toLowerCase().includes(place));
    if (local.length >= days) candidates = local;
  }
  return [...candidates]
    .sort((a, b) => b.eco_score - a.eco_score)
    .slice(0, days)
    .map(d => ({
      id: d.destination_id, name: d.name, category: d.category, province: d.province,
      lat: parseFloat(d.lat), lon: parseFloat(d.lon), ecoScore: Math.round(d.eco_score),
    }));
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
export async function generateItinerary({ mood, days, budget, destination }) {
  const dayCount = Math.min(14, Math.max(1, parseInt(days, 10) || 5));
  // FR-011: 5-10 recommended locations per itinerary
  const stopCount = Math.min(10, Math.max(5, dayCount));
  let stops;
  let offline = false;
  try {
    const matches = await recommendDestinations({ mood: moodKey(mood), days: stopCount, destination });
    stops = matches.map(d => ({
      id: d.id, name: d.name, category: d.category, province: d.province,
      lat: d.lat, lon: d.lon, ecoScore: d.ecoScore,
    }));
    if (stops.length === 0) throw new Error('No recommendations returned');
  } catch (e) {
    console.warn('Recommendation backend unavailable, using on-device dataset:', e.message);
    stops = localRecommendations({ mood, days: stopCount, destination });
    offline = true;
  }

  const plan = buildPlan(stops, budget, dayCount);
  const itinerary = {
    title: `Your ${mood || 'Eco'} trip to ${destination || 'Sri Lanka'}`,
    userId: auth.currentUser?.uid,
    createdAt: new Date().toISOString(),
    mood: mood || null,
    budget: budget || 'Standard',
    destination: destination || null,
    source: offline ? 'on-device' : 'backend',
    plan,
    ...summarizePlan(plan, budget),
  };

  const docRef = await addDoc(collection(db, 'itineraries'), itinerary);
  return { id: docRef.id, offline, ...itinerary };
}
