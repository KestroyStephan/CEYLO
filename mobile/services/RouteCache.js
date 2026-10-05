/**
 * RouteCache.js
 * FR-021 offline navigation. While online, the road route through an itinerary's stops is
 * fetched once from OSRM (OpenStreetMap routing, no key) with turn-by-turn steps and stored
 * on the phone, so RouteGuideScreen can guide the traveller with no signal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const key = (id) => `route_${id}`;

export const stopsOf = (plan = []) => plan
  .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
  .map(p => ({ name: p.title || p.activity || 'Stop', latitude: Number(p.lat), longitude: Number(p.lon) }));

const signature = (stops) => stops.map(s => `${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`).join('|');

const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const compass = (deg) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Readable instruction for one OSRM step. */
function instruction(step, nextStopName) {
  const m = step.maneuver || {};
  const road = step.name ? `onto ${step.name}` : '';
  const mod = m.modifier || '';
  switch (m.type) {
    case 'depart': return `Head ${compass(m.bearing_after || 0)}${step.name ? ` on ${step.name}` : ''}`;
    case 'arrive': return `Arrive at ${nextStopName || 'your stop'}`;
    case 'roundabout':
    case 'rotary': return `At the roundabout, take exit ${m.exit || 1}${step.name ? ` to ${step.name}` : ''}`;
    case 'fork': return `Keep ${mod.replace('slight ', '') || 'straight'} at the fork ${road}`.trim();
    case 'merge': return `Merge ${road || 'ahead'}`.trim();
    case 'on ramp': return `Take the ramp ${road}`.trim();
    case 'off ramp': return `Take the exit ${road}`.trim();
    case 'continue':
    case 'new name': return mod && mod !== 'straight' ? `Bear ${mod} ${road}`.trim() : `Continue ${road || 'straight'}`.trim();
    default:
      if (mod === 'uturn') return 'Make a U-turn';
      if (mod === 'straight') return `Go straight ${road}`.trim();
      return `Turn ${mod || 'ahead'} ${road}`.trim();
  }
}

/** Straight lines between stops: used when the routing service cannot be reached. */
function straightRoute(itineraryId, stops) {
  return {
    itineraryId, stops, signature: signature(stops), straight: true, fetchedAt: new Date().toISOString(),
    line: stops.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
    steps: stops.slice(1).map((s, i) => ({ text: `Head to ${s.name}`, latitude: s.latitude, longitude: s.longitude, leg: i, arrive: true })),
    legs: [],
  };
}

export async function getCachedRoute(itineraryId) {
  try {
    const raw = await AsyncStorage.getItem(key(itineraryId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetches and stores the route for an itinerary. Re-uses the stored copy while the stops are
 * unchanged. Never throws: without a connection it returns the stored or straight-line route.
 */
export async function cacheRoute(itineraryId, plan) {
  const stops = stopsOf(plan);
  if (!itineraryId || stops.length < 2) return null;
  const existing = await getCachedRoute(itineraryId);
  if (existing && !existing.straight && existing.signature === signature(stops)) return existing;

  try {
    const coords = stops.map(s => `${s.longitude},${s.latitude}`).join(';');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let json;
    try {
      const res = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson&steps=true`, { signal: controller.signal });
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }
    if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.message || json.code);
    const r = json.routes[0];
    const steps = [];
    r.legs.forEach((leg, legIndex) => {
      leg.steps.forEach(step => {
        const [lon, lat] = step.maneuver.location;
        steps.push({
          text: instruction(step, stops[legIndex + 1]?.name),
          latitude: lat, longitude: lon, leg: legIndex,
          distance: Math.round(step.distance), arrive: step.maneuver.type === 'arrive',
        });
      });
    });
    const route = {
      itineraryId, stops, signature: signature(stops), straight: false, fetchedAt: new Date().toISOString(),
      line: r.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
      steps,
      legs: r.legs.map(l => ({ distance: Math.round(l.distance), duration: Math.round(l.duration) })),
      distance: Math.round(r.distance), duration: Math.round(r.duration),
    };
    await AsyncStorage.setItem(key(itineraryId), JSON.stringify(route));
    return route;
  } catch (e) {
    console.log('Route not fetched, using the stored or straight-line route:', e.message);
    if (existing && existing.signature === signature(stops)) return existing;
    return straightRoute(itineraryId, stops);
  }
}

/** Bounding box around the route, padded, for downloading offline map tiles. */
export function routeBounds(route, pad = 0.05) {
  const lats = route.line.map(p => p.latitude);
  const lons = route.line.map(p => p.longitude);
  return {
    minLat: Math.min(...lats) - pad, maxLat: Math.max(...lats) + pad,
    minLon: Math.min(...lons) - pad, maxLon: Math.max(...lons) + pad,
  };
}
