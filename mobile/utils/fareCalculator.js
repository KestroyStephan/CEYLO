// Simple distance-based fare estimation
// Base fare + per-km rate, varies by vehicle type

const VEHICLE_RATES = {
  Tuk: { base: 100, perKm: 60 },
  Bike: { base: 80, perKm: 40 },
  Car: { base: 200, perKm: 90 },
  Van: { base: 300, perKm: 120 },
};

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateFare(vehicleType, distanceKm) {
  const rate = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.Car;
  const fare = rate.base + rate.perKm * distanceKm;
  return Math.round(fare / 10) * 10; // round to nearest 10
}

export function estimateAllFares(distanceKm) {
  return Object.keys(VEHICLE_RATES).reduce((acc, type) => {
    acc[type] = estimateFare(type, distanceKm);
    return acc;
  }, {});
}
