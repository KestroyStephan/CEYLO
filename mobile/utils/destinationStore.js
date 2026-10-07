/**
 * destinationStore.js
 * The bundled destination dataset with the admin portal's changes applied: edits and removals of
 * dataset places (Firestore destinations/{destination_id}) and new places added by staff.
 * Falls back to the bundled data when the database cannot be reached.
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import bundled from '../assets/data/ai_destinations.json';

const DATASET_CATEGORIES = new Set(bundled.map(d => d.category));
const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, list: null };

// Admin records use the portal's field names; convert them to the dataset's
function applyEdit(base, e) {
  const out = { ...base };
  if (e.name) out.name = e.name;
  if (e.description) out.description = e.description;
  if (e.imageUrl) out.image = e.imageUrl;
  if (e.province) out.province = /province$/i.test(e.province) ? e.province : `${e.province} Province`;
  if (e.category && DATASET_CATEGORIES.has(e.category)) out.category = e.category;
  if (e.ecoScore != null && e.ecoScore !== '') out.eco_score = Number(e.ecoScore);
  if (e.latitude != null && e.latitude !== '') out.lat = String(e.latitude);
  if (e.longitude != null && e.longitude !== '') out.lon = String(e.longitude);
  if (e.isHiddenGem != null) out.hidden_gem = Boolean(e.isHiddenGem);
  return out;
}

function fromAdmin(id, e) {
  return applyEdit({
    destination_id: id, name: '', category: 'Heritage & Culture', province: '', lat: '', lon: '',
    hidden_gem: false, avg_rating: '', popularity_rank: '999', seasonal_availability: 'Year-Round',
    eco_score: 70, image: '', description: '',
  }, e);
}

export async function loadDestinations() {
  if (cache.list && Date.now() - cache.at < CACHE_MS) return cache.list;
  let edits = {};
  try {
    const snap = await getDocs(collection(db, 'destinations'));
    edits = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
  } catch (e) {
    console.log('Destination changes unavailable, using bundled data:', e.message);
    return bundled;
  }
  const ids = new Set(bundled.map(d => d.destination_id));
  const list = bundled
    .filter(d => !edits[d.destination_id]?.removed)
    .map(d => (edits[d.destination_id] ? applyEdit(d, edits[d.destination_id]) : d))
    .concat(Object.entries(edits)
      .filter(([id, e]) => !ids.has(id) && !e.removed && e.name && e.latitude != null && e.longitude != null)
      .map(([id, e]) => fromAdmin(id, e)));
  cache = { at: Date.now(), list };
  return list;
}
