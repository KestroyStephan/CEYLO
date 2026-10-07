/**
 * DiscoverService.js
 * Builds the Home screen's discovery sections for this traveller and this trip: who they are
 * (saved preferences -> mood, budget, eco interest), where they are (GPS), and when they travel
 * (the dates of their next saved trip, or the coming week). Destinations are ranked with the same
 * trained content model used for itineraries; events come from the published calendar and are
 * only shown for the dates they actually fall on.
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { loadDestinations } from '../utils/destinationStore';
import { inSeasonMonth, profileFromApp } from '../utils/recommenderModel';
import { loadEvents, eventsDuring } from '../utils/events';
import { loadPreferences, moodFromPreferences } from './PreferencesService';
import { getLatestCachedItinerary } from './ItineraryCache';
import { distanceKm, modelScores, MOOD_CATEGORIES, moodKey } from './ItineraryService';

const DAY = 86400000;
const NEAR_KM = 50;
const isGem = (d) => d.hidden_gem === true || String(d.hidden_gem).toLowerCase() === 'true';
const SEASON_LABEL = { 'Nov-April': 'Best November–April', 'May-Oct': 'Best May–October' };

/** Dates of the traveller's next saved trip; otherwise the coming week. */
export async function tripWindow() {
  try {
    const it = await getLatestCachedItinerary(auth.currentUser?.uid);
    if (it?.startDate) {
      const start = new Date(`${it.startDate}T00:00:00`);
      const days = it.days || it.plan?.reduce((m, p) => Math.max(m, p.day || 1), 1) || 1;
      const end = new Date(start.getTime() + (days - 1) * DAY);
      if (end.getTime() >= Date.now() - DAY) return { start, end, fromTrip: true, title: it.title };
    }
  } catch (e) {
    // fall back to the coming week
  }
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return { start, end: new Date(start.getTime() + 6 * DAY), fromTrip: false };
}

const card = (d, reason, dist) => ({
  kind: 'place',
  id: d.destination_id,
  title: d.name,
  subtitle: reason,
  image: d.image,
  dist,
  place: { ...d, ecoScore: d.eco_score != null ? Math.round(d.eco_score) : null },
});

const eventCard = (e, reason) => ({ kind: 'event', id: e.id, title: e.title, subtitle: reason, image: e.imageUrl, event: e });

const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const eventWhen = (e) => (e.months ? 'This season' : e.endDate ? `${fmtDay(e.date)} – ${fmtDay(e.endDate)}` : fmtDay(e.date));

/**
 * @returns {Promise<{ window, sections: Array<{ key, title, items }> }>} empty sections are dropped
 */
export async function buildDiscover(position) {
  const [prefs, window, events, destinations] = await Promise.all([loadPreferences(), tripWindow(), loadEvents().catch(() => []), loadDestinations()]);
  const month = window.start.getMonth() + 1;
  const mood = moodFromPreferences(prefs);
  const moodCats = MOOD_CATEGORIES[moodKey(mood)] || [];

  // Places open/in season during the trip, with distance when the position is known
  const pool = destinations
    .filter(d => inSeasonMonth(d.seasonal_availability, month))
    .map(d => {
      const lat = parseFloat(d.lat);
      const lon = parseFloat(d.lon);
      return { d, dist: position ? distanceKm(position.latitude, position.longitude, lat, lon) : null };
    });

  // Personal ranking: trained model + eco interest + the categories that suit the mood + nearness
  const profile = profileFromApp({ mood, budget: prefs.budget, days: prefs.days, ecoInterest: prefs.ecoPct });
  let raw = [];
  try {
    ({ scores: raw } = await modelScores(profile, pool.map(p => p.d), month));
  } catch (e) {
    raw = pool.map(p => p.d.eco_score / 100);
  }
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  const ranked = pool.map((p, i) => {
    const model = hi > lo ? (raw[i] - lo) / (hi - lo) : 0.5;
    const near = p.dist == null ? 0 : Math.max(0, 1 - p.dist / 200);
    const score = 0.45 * model + 0.2 * ((prefs.ecoPct / 100) * (p.d.eco_score / 100)) + 0.2 * (moodCats.includes(p.d.category) ? 1 : 0) + 0.15 * near;
    return { ...p, score };
  }).sort((a, b) => b.score - a.score);

  const used = new Set();
  const take = (list, n, reason) => list.filter(x => !used.has(x.d.destination_id)).slice(0, n)
    .map(x => { used.add(x.d.destination_id); return card(x.d, reason(x), x.dist); });
  const kmText = (x) => (x.dist != null ? `${x.dist < 10 ? x.dist.toFixed(1) : Math.round(x.dist)} km away` : x.d.province.replace(' Province', ''));

  const sections = [];
  const add = (key, title, items) => { if (items.length) sections.push({ key, title, items }); };

  // Events inside the trip window come first: they are time-bound
  const during = eventsDuring(events, window.start, window.end);
  add('during', window.fromTrip ? 'Happening during your trip' : 'Happening this week',
    during.slice(0, 8).map(e => eventCard(e, `${eventWhen(e)}${e.location && !/all island/i.test(e.location) ? ` · ${e.location.split(',')[0]}` : ''}`)));

  add('forYou', 'Recommended for you', take(ranked, 8, x => `${Math.round(x.score * 100)}% match · ${kmText(x)}`));

  if (position) {
    add('nearby', 'Nearby', take([...ranked].filter(x => x.dist <= NEAR_KM).sort((a, b) => a.dist - b.dist), 8, kmText));
  }

  add('popular', 'Popular places', take([...ranked].sort((a, b) => parseInt(a.d.popularity_rank, 10) - parseInt(b.d.popularity_rank, 10)), 8,
    x => `★ ${x.d.avg_rating} · ${kmText(x)}`));

  add('gems', 'Hidden gems', take(ranked.filter(x => isGem(x.d)), 8, x => `Hidden gem · eco ${Math.round(x.d.eco_score)}`));

  const seasonalPlaces = take(ranked.filter(x => SEASON_LABEL[x.d.seasonal_availability]), 6, x => SEASON_LABEL[x.d.seasonal_availability]);
  const seasonalEvents = during.filter(e => e.months).map(e => eventCard(e, 'In season now'));
  add('seasonal', 'Seasonal activities', [...seasonalEvents, ...seasonalPlaces]);

  const culturalEvents = during.filter(e => (e.tags || []).some(t => ['religious', 'cultural', 'perahera', 'poya', 'festival'].includes(t)) && !e.months);
  add('culture', 'Cultural experiences', [
    ...culturalEvents.slice(0, 3).map(e => eventCard(e, eventWhen(e))),
    ...take(ranked.filter(x => x.d.category === 'Heritage & Culture'), 6, x => `Heritage · ${kmText(x)}`),
  ]);

  add('eco', 'Eco & nature', take(ranked.filter(x => ['Nature & Viewpoint', 'Waterfall'].includes(x.d.category)).sort((a, b) => b.d.eco_score - a.d.eco_score), 8,
    x => `Eco score ${Math.round(x.d.eco_score)} · ${kmText(x)}`));

  add('wildlife', 'Wildlife', take(ranked.filter(x => x.d.category === 'Wildlife'), 8, kmText));

  add('adventure', 'Adventure', [
    ...during.filter(e => (e.tags || []).some(t => ['adventure', 'sports', 'hiking'].includes(t))).map(e => eventCard(e, eventWhen(e))),
    ...take(ranked.filter(x => x.d.category === 'Waterfall' || /peak|rock|trail|hike|mountain|falls/i.test(x.d.name)), 6, x => `Hike / outdoors · ${kmText(x)}`),
  ]);

  add('beaches', 'Beaches', take(ranked.filter(x => x.d.category === 'Beach'), 8, kmText));

  // Coming up after the window (dated events only, next 90 days)
  const after = events.filter(e => !e.months && e.date && new Date(e.date) > window.end && new Date(e.date) - window.end < 90 * DAY);
  add('events', 'Events & festivals coming up', after.slice(0, 8).map(e => eventCard(e, eventWhen(e))));

  // Community experiences: services offered by approved local vendors (never pending ones)
  try {
    const vendorSnap = await getDocs(query(collection(db, 'vendors'), where('status', '==', 'approved'), limit(8)));
    const lists = await Promise.all(vendorSnap.docs.map(async v => {
      const svc = await getDocs(collection(db, 'vendors', v.id, 'services')).catch(() => null);
      return (svc?.docs || []).map(s => ({ id: s.id, vendorId: v.id, vendor: v.data().businessName, ...s.data() }));
    }));
    const services = lists.flat().filter(s => s.name && s.isAvailable !== false);
    add('community', 'Community experiences', services.slice(0, 8).map(s => ({
      kind: 'service', id: `${s.vendorId}_${s.id}`, title: s.name,
      subtitle: [s.vendor, s.price ? `LKR ${Number(s.price).toLocaleString()}` : null].filter(Boolean).join(' · '),
      image: (s.photos && s.photos[0]) || s.imageUrl || null, service: s,
    })));
  } catch (e) {
    console.log('Community experiences unavailable:', e.message);
  }

  return { window, mood, sections };
}
