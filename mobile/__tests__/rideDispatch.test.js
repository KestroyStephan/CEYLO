jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), runTransaction: jest.fn() }));

import { nearbyDrivers, requestsForDriver, etaMinutes, REQUEST_TTL_MS } from '../utils/rideDispatch';

const now = Date.parse('2026-10-05T10:00:00Z');
const fresh = new Date(now - 30 * 1000).toISOString();
const pickup = { latitude: 6.9271, longitude: 79.8612 };

describe('ride matching', () => {
  test('pickup estimates are at least a minute and grow with distance', () => {
    expect(etaMinutes(0.1)).toBe(1);
    expect(etaMinutes(5.5)).toBe(15);
  });

  test('riders only see free online drivers of the chosen type nearby', () => {
    const drivers = [
      { id: 'tuk', vehicleType: 'Tuk', isOnline: true, location: { latitude: 6.93, longitude: 79.865, updatedAt: fresh } },
      { id: 'car', vehicleType: 'Car', isOnline: true, location: { latitude: 6.93, longitude: 79.865, updatedAt: fresh } },
      { id: 'kandy', vehicleType: 'Tuk', isOnline: true, location: { latitude: 7.29, longitude: 80.63, updatedAt: fresh } },
    ];
    expect(nearbyDrivers(drivers, pickup, 'Tuk', now).map(d => d.id)).toEqual(['tuk']);
    expect(nearbyDrivers(drivers, pickup, null, now).map(d => d.id).sort()).toEqual(['car', 'tuk']);
  });

  test('drivers see open, unexpired requests near them, nearest first', () => {
    const at = (ms) => new Date(now - ms).toISOString();
    const requests = [
      { id: 'old', status: 'pending', createdAt: at(REQUEST_TTL_MS + 1000), pickupCoords: pickup },
      { id: 'taken', status: 'Confirmed', driverId: 'x', createdAt: at(1000), pickupCoords: pickup },
      { id: 'far', status: 'pending', createdAt: at(1000), pickupCoords: { latitude: 7.29, longitude: 80.63 } },
      { id: 'mid', status: 'pending', createdAt: at(1000), pickupCoords: { latitude: 6.90, longitude: 79.86 } },
      { id: 'near', status: 'pending', createdAt: at(1000), pickupCoords: { latitude: 6.928, longitude: 79.862 } },
    ];
    expect(requestsForDriver(requests, pickup, now).map(r => r.id)).toEqual(['near', 'mid']);
  });
});
