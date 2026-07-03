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
