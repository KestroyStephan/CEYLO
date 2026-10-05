const { nearbyDrivers } = require('../dispatch');

const now = Date.parse('2026-10-05T10:00:00Z');
const fresh = new Date(now - 60 * 1000).toISOString();
const stale = new Date(now - 10 * 60 * 1000).toISOString();
const pickup = { latitude: 6.9271, longitude: 79.8612 };   // Colombo Fort

describe('ride dispatch', () => {
    it('offers the ride to free, online drivers with a fresh location within 8 km, nearest first', () => {
        const drivers = [
            { id: 'far', isOnline: true, location: { latitude: 7.2906, longitude: 80.6337, updatedAt: fresh } },     // Kandy
            { id: 'near', isOnline: true, location: { latitude: 6.9300, longitude: 79.8650, updatedAt: fresh } },
            { id: 'mid', isOnline: true, location: { latitude: 6.9000, longitude: 79.8600, updatedAt: fresh } },
            { id: 'busy', isOnline: true, isBusy: true, location: { latitude: 6.9280, longitude: 79.8620, updatedAt: fresh } },
            { id: 'stale', isOnline: true, location: { latitude: 6.9280, longitude: 79.8620, updatedAt: stale } },
            { id: 'offline', isOnline: false, location: { latitude: 6.9280, longitude: 79.8620, updatedAt: fresh } },
        ];
        expect(nearbyDrivers(drivers, pickup, now).map(d => d.id)).toEqual(['near', 'mid']);
    });

    it('returns nobody without a pickup location', () => {
        expect(nearbyDrivers([{ id: 'a', isOnline: true, location: { latitude: 6.93, longitude: 79.86, updatedAt: fresh } }], null, now)).toEqual([]);
    });
});
