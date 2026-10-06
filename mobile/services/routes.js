/**
 * Road routes between two points from the Google Directions API, with alternatives, so the
 * traveller can see the shortest path and other suggested routes before booking.
 */
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Google encoded polyline -> [{ latitude, longitude }] */
export function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/**
 * Up to three driving routes, shortest first. Each has
 * { id, summary, km, minutes, coords, isShortest, isFastest }.
 */
export async function fetchRoutes(origin, destination) {
  const url = 'https://maps.googleapis.com/maps/api/directions/json'
    + `?origin=${origin.latitude},${origin.longitude}`
    + `&destination=${destination.latitude},${destination.longitude}`
    + `&mode=driving&alternatives=true&region=lk&key=${GOOGLE_API_KEY}`;
  const data = await (await fetch(url)).json();
  if (data.status !== 'OK' || !data.routes?.length) {
    throw new Error(data.error_message || data.status || 'No route found');
  }
  const routes = data.routes.map((r, i) => {
    const leg = r.legs[0];
    return {
      id: `route_${i}`,
      summary: r.summary ? `via ${r.summary}` : `Route ${i + 1}`,
      km: Math.round((leg.distance.value / 1000) * 10) / 10,
      minutes: Math.max(1, Math.round((leg.duration_in_traffic || leg.duration).value / 60)),
      coords: decodePolyline(r.overview_polyline.points),
    };
  }).sort((a, b) => a.km - b.km);
  const fastest = routes.reduce((best, r) => (r.minutes < best.minutes ? r : best), routes[0]);
  return routes.map((r, i) => ({ ...r, isShortest: i === 0, isFastest: r.id === fastest.id }));
}
