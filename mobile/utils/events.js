/**
 * events.js
 * Cultural events and holidays. The admin portal publishes them to Firestore (cultural_events)
 * from the maintained Sri Lankan calendar (assets/data/sri_lanka_calendar.json: gazetted public
 * holidays and Poya days, officially announced festivals, recurring seasons). If the database
 * cannot be reached, the bundled calendar is used so the app still shows correct dates offline.
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import calendar from '../assets/data/sri_lanka_calendar.json';
import { distanceKm } from '../services/ItineraryService';

// Approximate town centres for events saved without coordinates (first match in the location text wins)
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
const DAY = 24 * 60 * 60 * 1000;

export function coordsForLocation(location) {
  const text = String(location || '').toLowerCase();
  const key = Object.keys(PLACE_COORDS).find(k => text.includes(k));
  return key ? PLACE_COORDS[key] : null;
}

const toDate = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null);

// A recurring season (months only): the next month it is on, from today
function nextSeasonStart(months, from = new Date()) {
  if (!months?.length) return null;
  for (let i = 0; i < 12; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    if (months.includes(d.getMonth() + 1)) return d;
  }
  return null;
}

function normalise(id, e, origin) {
  const seasonal = e.dateConfirmed === false || (!e.date && e.months?.length);
  const start = seasonal ? nextSeasonStart(e.months) : toDate(e.date);
  const coords = e.lat != null && e.lng != null && e.lat !== '' && e.lng !== ''
    ? { latitude: Number(e.lat), longitude: Number(e.lng) }
    : coordsForLocation(e.location);
  return {
    id,
    title: e.title || 'Event',
    location: e.location || 'Sri Lanka',
    allIsland: !coords && /all island/i.test(e.location || ''),
    category: e.category || 'Cultural',
    type: e.category || 'Cultural',
    tags: e.tags || [],
    date: start ? start.toISOString() : null,
    endDate: !seasonal && e.endDate ? toDate(e.endDate).toISOString() : null,
    months: seasonal ? (e.months || []) : null,
    // Only the month is known for recurring seasons; screens show "Aug 2027" instead of a day
    dateApprox: Boolean(seasonal),
    publicHoliday: Boolean(e.publicHoliday),
    description: e.description || '',
    imageUrl: e.imageUrl || null,
    imageCredit: e.imageCredit || null,
    source: e.source || null,
    sourceUrl: e.sourceUrl || null,
    coords,
    radiusKm: Number(e.geofenceRadius) || DEFAULT_ALERT_RADIUS_KM,
    origin,
  };
}

const published = (e) => {
  const s = e.status || (e.approvalStatus === 'approved' ? 'published' : e.approvalStatus ? 'draft' : 'published');
  return s === 'published';
};

/** Published events (or the bundled calendar when offline), upcoming and in progress, by date. */
export async function loadEvents() {
  let list;
  try {
    const snap = await getDocs(collection(db, 'cultural_events'));
    list = snap.docs.filter(d => published(d.data())).map(d => normalise(d.id, d.data(), 'admin'));
    // Nothing published yet (new install of the portal): show the maintained calendar meanwhile
    if (list.length === 0) list = calendar.events.map(e => normalise(e.id, e, 'calendar'));
  } catch (e) {
    console.log('Could not load cultural_events, using the bundled calendar:', e.message);
    list = calendar.events.map(e => normalise(e.id, e, 'calendar'));
  }
  const cutoff = Date.now() - DAY;
  return list
    .filter(e => !e.date || new Date(e.endDate || e.date).getTime() >= cutoff || e.months)
    .sort((a, b) => new Date(a.date || 8.64e15) - new Date(b.date || 8.64e15));
}

/**
 * Is the event on at any point between start and end (inclusive)? Dated events must overlap the
 * window; recurring seasons must include one of the window's months. Used so a festival is never
 * suggested for a trip it does not fall in.
 */
export function eventOverlaps(event, start, end) {
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const t = new Date(end || start); t.setHours(23, 59, 59, 999);
  if (event.months) {
    for (let d = new Date(s.getFullYear(), s.getMonth(), 1); d <= t; d.setMonth(d.getMonth() + 1)) {
      if (event.months.includes(d.getMonth() + 1)) return true;
    }
    return false;
  }
  if (!event.date) return false;
  const from = new Date(event.date).getTime();
  const to = new Date(event.endDate || event.date).getTime() + DAY - 1;
  return from <= t.getTime() && to >= s.getTime();
}

export const eventsDuring = (events, start, end) => events.filter(e => eventOverlaps(e, start, end));
export const happeningNow = (events) => eventsDuring(events, new Date(), new Date());

/** Events whose alert radius contains the given position, nearest first. */
export function eventsNear(events, position) {
  if (!position) return [];
  return events
    .filter(e => e.coords)
    .map(e => ({ ...e, distanceKm: distanceKm(position.latitude, position.longitude, e.coords.latitude, e.coords.longitude) }))
    .filter(e => e.distanceKm <= e.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Filter chips built from the categories actually present. */
export function eventCategories(events) {
  const set = new Set();
  events.forEach(e => String(e.category || '').split('&').forEach(c => c.trim() && set.add(c.trim())));
  return ['All', 'Near Me', ...[...set].sort()];
}
