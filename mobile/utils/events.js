/**
 * events.js
 * Cultural events from Firestore (managed in the admin portal) merged with the bundled
 * AI events dataset, with coordinates so events can be matched to the user's GPS position.
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import aiEventsData from '../assets/data/ai_events.json';
import { distanceKm } from '../services/ItineraryService';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Approximate town centres for event locations (first match in the location text wins)
const PLACE_COORDS = {
  'arugam bay': { latitude: 6.8400, longitude: 81.8360 },
  'nuwara eliya': { latitude: 6.9497, longitude: 80.7891 },
  anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  polonnaruwa: { latitude: 7.9403, longitude: 81.0188 },
  kataragama: { latitude: 6.4134, longitude: 81.3346 },
  trincomalee: { latitude: 8.5874, longitude: 81.2152 },
  batticaloa: { latitude: 7.7310, longitude: 81.6747 },
  hikkaduwa: { latitude: 6.1395, longitude: 80.1063 },
  mihintale: { latitude: 8.3509, longitude: 80.5050 },
  kurunegala: { latitude: 7.4818, longitude: 80.3609 },
  ratnapura: { latitude: 6.7056, longitude: 80.3847 },
  dambulla: { latitude: 7.8731, longitude: 80.6511 },
  sigiriya: { latitude: 7.9570, longitude: 80.7603 },
  negombo: { latitude: 7.2008, longitude: 79.8737 },
  badulla: { latitude: 6.9934, longitude: 81.0550 },
  colombo: { latitude: 6.9271, longitude: 79.8612 },
  mannar: { latitude: 8.9810, longitude: 79.9044 },
  jaffna: { latitude: 9.6615, longitude: 80.0255 },
  matara: { latitude: 5.9549, longitude: 80.5550 },
  kandy: { latitude: 7.2906, longitude: 80.6337 },
  galle: { latitude: 6.0535, longitude: 80.2210 },
  ella: { latitude: 6.8667, longitude: 81.0466 },
};

export const DEFAULT_ALERT_RADIUS_KM = 25;

export function coordsForLocation(location) {
  const text = String(location || '').toLowerCase();
  const key = Object.keys(PLACE_COORDS).find(k => text.includes(k));
  return key ? PLACE_COORDS[key] : null;
}

// Next time a yearly festival happens (mid-month, since the dataset only has the month)
function nextOccurrence(monthName) {
  const month = MONTHS.indexOf(monthName);
  if (month === -1) return null;
  const now = new Date();
  const year = month < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, month, 15);
}

function fromAiEvent(e) {
  const date = nextOccurrence(e.occurrence_month);
  return {
    id: e.event_id,
    title: e.name,
    location: e.location,
    category: e.category,
    type: e.category,
    date: date ? date.toISOString() : null,
    dateApprox: true,
    description: `Experience the ${e.name} in ${e.location}. Expected attendance: ${Number(e.expected_attendance).toLocaleString()}.`,
    imageUrl: e.image || null,
    ecoScore: Number(e.eco_impact_score) || null,
    coords: coordsForLocation(e.location),
    radiusKm: DEFAULT_ALERT_RADIUS_KM,
    source: 'dataset',
  };
}

function fromFirestore(id, e) {
  const coords = e.lat && e.lng
    ? { latitude: Number(e.lat), longitude: Number(e.lng) }
    : coordsForLocation(e.location);
  return {
    id,
    title: e.title || 'Cultural Event',
    location: e.location || 'Sri Lanka',
    category: e.category || 'Cultural',
    type: e.category || 'Cultural',
    date: e.date ? new Date(e.date).toISOString() : null,
    dateApprox: false,
    description: e.description || '',
    imageUrl: e.imageUrl || null,
    ecoScore: e.ecoScore || null,
    coords,
    radiusKm: Number(e.geofenceRadius) || DEFAULT_ALERT_RADIUS_KM,
    source: 'admin',
  };
}

/** Admin-approved Firestore events first, then dataset events not already listed; sorted by date. */
export async function loadEvents() {
  let adminEvents = [];
  try {
    const snap = await getDocs(collection(db, 'cultural_events'));
    adminEvents = snap.docs
      .filter(d => !d.data().approvalStatus || d.data().approvalStatus === 'approved')
      .map(d => fromFirestore(d.id, d.data()));
  } catch (e) {
    console.log('Could not load cultural_events, using bundled events only:', e.message);
  }
  const titles = new Set(adminEvents.map(e => e.title.toLowerCase()));
  const all = [...adminEvents, ...aiEventsData.map(fromAiEvent).filter(e => !titles.has(e.title.toLowerCase()))];
  const now = Date.now() - 24 * 60 * 60 * 1000;
  return all
    .filter(e => !e.date || new Date(e.date).getTime() >= now)
    .sort((a, b) => new Date(a.date || 8.64e15) - new Date(b.date || 8.64e15));
}

/** Events whose alert radius contains the given position, nearest first. */
export function eventsNear(events, position) {
  if (!position) return [];
  return events
    .filter(e => e.coords)
    .map(e => ({ ...e, distanceKm: distanceKm(position.latitude, position.longitude, e.coords.latitude, e.coords.longitude) }))
    .filter(e => e.distanceKm <= e.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Filter chips built from the categories actually present ("Cultural & Religious" -> Cultural, Religious). */
export function eventCategories(events) {
  const set = new Set();
  events.forEach(e => String(e.category || '').split('&').forEach(c => c.trim() && set.add(c.trim())));
  return ['All', 'Near Me', ...[...set].sort()];
}
