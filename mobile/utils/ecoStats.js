/**
 * ecoStats.js
 * Eco Passport numbers derived from the traveller's real activity in Firestore.
 */
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// kg CO2 per passenger-km (typical averages); savings are measured against a private car
const KG_CO2_PER_KM = { car: 0.17, bus: 0.10, train: 0.04, walk: 0 };

export const RANKS = [
  { name: 'Explorer', min: 0 },
  { name: 'Eco Friend', min: 300 },
  { name: 'Eco Expert', min: 800 },
  { name: 'Eco Legend', min: 1500 },
];

const EMPTY = { points: 0, itineraries: 0, reviews: 0, co2SavedKg: 0, greenKm: 0, usedTransit: false, walked: false };

export async function loadEcoStats(uid) {
  if (!uid) return withRank(EMPTY);
  const [itinSnap, reviewCount] = await Promise.all([
    getDocs(query(collection(db, 'itineraries'), where('userId', '==', uid))),
    getCountFromServer(query(collection(db, 'reviews'), where('touristId', '==', uid)))
      .then(s => s.data().count).catch(() => 0),
  ]);

  let co2SavedKg = 0;
  let greenKm = 0;
  let usedTransit = false;
  let walked = false;
  itinSnap.forEach(d => {
    (d.data().plan || []).forEach(item => {
      const km = Number(item.distanceKm) || 0;
      const mode = item.transport || 'car';
      if (mode !== 'car') greenKm += km;
      if (mode === 'bus' || mode === 'train') usedTransit = true;
      if (mode === 'walk') walked = true;
      co2SavedKg += km * (KG_CO2_PER_KM.car - (KG_CO2_PER_KM[mode] ?? KG_CO2_PER_KM.car));
    });
  });

  const itineraries = itinSnap.size;
  return withRank({
    points: itineraries * 100 + reviewCount * 50 + Math.round(co2SavedKg * 10),
    itineraries,
    reviews: reviewCount,
    co2SavedKg: Math.round(co2SavedKg * 10) / 10,
    greenKm: Math.round(greenKm),
    usedTransit,
    walked,
  });
}

function withRank(stats) {
  const current = [...RANKS].reverse().find(r => stats.points >= r.min);
  const next = RANKS.find(r => r.min > stats.points);
  const progress = next ? (stats.points - current.min) / (next.min - current.min) : 1;
  return { ...stats, rank: current.name, nextRank: next?.name || null, pointsToNext: next ? next.min - stats.points : 0, progress };
}
