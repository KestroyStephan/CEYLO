import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

let locationSubscription = null;

export async function startLocationTracking(driverId, bookingId) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Location permission not granted');
    return;
  }

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // update every 5 seconds
      distanceInterval: 10, // or every 10 meters
    },
    async (location) => {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          driverLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading || 0,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    }
  );
}

export function stopLocationTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

// ---------------------------------------------------------------- availability while online
// While a driver is online their approximate position (about 100 m, rounded for privacy) is kept
// on drivers/{uid}.location so riders see nearby cars and only nearby drivers get requests.
let availabilitySubscription = null;
let availabilityHeartbeat = null;
// Position updates only arrive after the driver moves, so a parked driver re-sends the last
// position on this interval to stay inside the rider app's freshness window (LOCATION_FRESH_MS)
const HEARTBEAT_MS = 60 * 1000;

export async function startAvailability(driverId, onPosition) {
  stopAvailability();
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  let lastCoords = null;
  const publish = async (coords) => {
    lastCoords = coords;
    onPosition && onPosition({ latitude: coords.latitude, longitude: coords.longitude });
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        location: {
          latitude: Math.round(coords.latitude * 1000) / 1000,
          longitude: Math.round(coords.longitude * 1000) / 1000,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.log('Availability update failed:', e.message);
    }
  };
  try {
    const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await publish(first.coords);
  } catch (e) {
    console.log('No first position:', e.message);
  }
  availabilitySubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 100 },
    (loc) => publish(loc.coords),
  );
  availabilityHeartbeat = setInterval(() => {
    if (lastCoords) publish(lastCoords);
  }, HEARTBEAT_MS);
  return true;
}

export function stopAvailability() {
  if (availabilityHeartbeat) {
    clearInterval(availabilityHeartbeat);
    availabilityHeartbeat = null;
  }
  if (availabilitySubscription) {
    availabilitySubscription.remove();
    availabilitySubscription = null;
  }
}
