/**
 * dispatch.js
 * Same matching rule as mobile/utils/rideDispatch.js: free online drivers with a location from the
 * last 3 minutes within 8 km of the pickup, nearest first.
 */
const MATCH_RADIUS_KM = 8;
const LOCATION_FRESH_MS = 3 * 60 * 1000;

function km(a, b) {
    const R = 6371;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function nearbyDrivers(drivers, pickup, now = Date.now()) {
    if (!pickup || !Number.isFinite(pickup.latitude)) return [];
    return drivers
        .filter(d => d.isOnline && !d.isBusy && d.location && Number.isFinite(d.location.latitude)
            && now - new Date(d.location.updatedAt || 0).getTime() <= LOCATION_FRESH_MS)
        .map(d => ({ ...d, km: km(pickup, d.location) }))
        .filter(d => d.km <= MATCH_RADIUS_KM)
        .sort((a, b) => a.km - b.km);
}

module.exports = { nearbyDrivers, MATCH_RADIUS_KM, LOCATION_FRESH_MS };
