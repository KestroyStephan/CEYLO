/**
 * rideDispatch.js
 * Ride matching rules shared by the rider and driver screens (PickMe / Uber style):
 * only online drivers with a fresh location near the pickup are offered a ride, requests expire
 * if nobody accepts, and a ride is claimed atomically so two drivers can never take the same one.
 */
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { calculateDistance } from './fareCalculator';

export const MATCH_RADIUS_KM = 8;              // drivers further than this are not offered the ride
export const REQUEST_TTL_MS = 3 * 60 * 1000;    // a request nobody accepts expires after 3 minutes
export const LOCATION_FRESH_MS = 3 * 60 * 1000; // a driver location older than this is ignored
const CITY_SPEED_KMH = 22;                      // average urban speed for pickup estimates

const millis = (t) => (t?.toMillis ? t.toMillis() : t ? new Date(t).getTime() : 0);

/** Minutes for a driver this far away to reach the pickup (at least 1). */
export function etaMinutes(km) {
  return Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60));
}

export function isFresh(location, now = Date.now()) {
  return Boolean(location && Number.isFinite(location.latitude) && now - millis(location.updatedAt) <= LOCATION_FRESH_MS);
}

/**
 * Online, free drivers with a recent location within MATCH_RADIUS_KM of the point, nearest first.
 * drivers: [{ id, vehicleType, isOnline, isBusy, location: { latitude, longitude, updatedAt } }]
 */
export function nearbyDrivers(drivers, point, vehicleType = null, now = Date.now()) {
  if (!point) return [];
  return drivers
    .filter(d => d.isOnline && !d.isBusy && isFresh(d.location, now) && (!vehicleType || d.vehicleType === vehicleType))
    .map(d => {
      const km = calculateDistance(point.latitude, point.longitude, d.location.latitude, d.location.longitude);
      return { ...d, km, eta: etaMinutes(km) };
    })
    .filter(d => d.km <= MATCH_RADIUS_KM)
    .sort((a, b) => a.km - b.km);
}

/** Open requests a driver at `position` should see: still pending, not expired, near enough. */
export function requestsForDriver(requests, position, now = Date.now()) {
  return requests
    .filter(r => r.status === 'pending' && !r.driverId)
    .filter(r => !r.createdAt || now - millis(r.createdAt) <= REQUEST_TTL_MS)
    .map(r => {
      const p = r.pickupCoords;
      const km = position && p ? calculateDistance(position.latitude, position.longitude, p.latitude, p.longitude) : null;
      return { ...r, km, eta: km == null ? null : etaMinutes(km) };
    })
    .filter(r => r.km == null || r.km <= MATCH_RADIUS_KM)
    .sort((a, b) => (a.km ?? 99) - (b.km ?? 99));
}

/**
 * Claims a ride for this driver in a transaction. Throws RideTakenError when another driver
 * got there first or the rider cancelled.
 */
export class RideTakenError extends Error {}

export async function acceptRide(bookingId, driverId, extra = {}) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'bookings', bookingId);
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : null;
    if (!data || data.status !== 'pending' || data.driverId) {
      throw new RideTakenError('This ride was just taken by another driver or cancelled by the rider.');
    }
    tx.update(ref, { driverId, status: 'Confirmed', acceptedAt: new Date().toISOString(), ...extra });
  });
}
