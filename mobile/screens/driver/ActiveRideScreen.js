import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Surface, Divider } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE, MapViewDirections } from '../../components/Map';
import * as Location from 'expo-location';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { calculateDistance } from '../../utils/fareCalculator';
import { startLocationTracking, stopLocationTracking } from '../../services/DriverLocationService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function ActiveRideScreen({ route, navigation }) {
  const { bookingId } = route.params || {};
  const [bookingData, setBookingData] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No Booking ID provided');
      navigation.goBack();
      return;
    }

    // Start location tracking
    startLocationTracking(auth.currentUser.uid, bookingId);

    // Watch local driver location for display
    let localLocSubscription = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      localLocSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setDriverLoc({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    })();

    // Listen to booking document
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      if (snap.exists()) {
        setBookingData(snap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Booking listener error:', error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopLocationTracking();
      if (localLocSubscription) {
        localLocSubscription.remove();
      }
    };
  }, [bookingId]);

  // Keep map camera viewport updated
  useEffect(() => {
    if (bookingData && mapRef.current) {
      const coords = [];
      if (driverLoc) coords.push(driverLoc);
      if (bookingData.pickupCoords) coords.push({ latitude: bookingData.pickupCoords.latitude, longitude: bookingData.pickupCoords.longitude });
      if (bookingData.dropoffCoords) coords.push({ latitude: bookingData.dropoffCoords.latitude, longitude: bookingData.dropoffCoords.longitude });

      if (coords.length > 1) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 50, bottom: 280, left: 50 },
          animated: true,
        });
      }
    }
  }, [bookingData, driverLoc]);

  const handleArrived = async () => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Arrived',
        arrivedAt: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to update status: ' + e.message);
    }
  };

  const handleStartTrip = async () => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'InProgress',
        startedAt: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to start trip: ' + e.message);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Completed',
        completedAt: new Date().toISOString(),
        finalFare: bookingData.price,
      });
      stopLocationTracking();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete trip: ' + error.message);
    }
  };

  const getTripDuration = () => {
    if (!bookingData?.startedAt || !bookingData?.completedAt) return '0 min';
    const start = new Date(bookingData.startedAt);
    const end = new Date(bookingData.completedAt);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
  };

  const getTripDistance = () => {
    if (!bookingData?.pickupCoords || !bookingData?.dropoffCoords) return '0 km';
    const dist = calculateDistance(
      bookingData.pickupCoords.latitude,
      bookingData.pickupCoords.longitude,
      bookingData.dropoffCoords.latitude,
      bookingData.dropoffCoords.longitude
    );
    return `${dist.toFixed(1)} km`;
  };

  if (loading || !bookingData) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  const { status } = bookingData;

  // Directions routing: If InProgress route pickup -> dropoff, else driver location -> pickup
  const origin = status === 'InProgress'
    ? { latitude: bookingData.pickupCoords?.latitude, longitude: bookingData.pickupCoords?.longitude }
    : (driverLoc || { latitude: bookingData.pickupCoords?.latitude, longitude: bookingData.pickupCoords?.longitude });

  const destination = status === 'InProgress'
    ? { latitude: bookingData.dropoffCoords?.latitude, longitude: bookingData.dropoffCoords?.longitude }
    : { latitude: bookingData.pickupCoords?.latitude, longitude: bookingData.pickupCoords?.longitude };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: bookingData.pickupCoords?.latitude || 6.9271,
          longitude: bookingData.pickupCoords?.longitude || 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {bookingData.pickupCoords && (
          <Marker coordinate={{ latitude: bookingData.pickupCoords.latitude, longitude: bookingData.pickupCoords.longitude }} title="Pickup" pinColor="#006A3B" />
        )}
        {bookingData.dropoffCoords && (
          <Marker coordinate={{ latitude: bookingData.dropoffCoords.latitude, longitude: bookingData.dropoffCoords.longitude }} title="Dropoff" pinColor="#D32F2F" />
        )}
        {driverLoc && (
          <Marker coordinate={driverLoc} title="You">
            <View style={styles.driverMarker}>
              <MaterialCommunityIcons name="car" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor="#006A3B"
          />
        )}
      </MapView>

      <Surface style={styles.bottomSheet} elevation={5}>
        {status === 'Completed' ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Trip Completed!</Text>
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>Final Fare</Text>
              <Text style={styles.fareVal}>LKR {bookingData.finalFare?.toLocaleString() || '0'}</Text>
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{getTripDistance()}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{getTripDuration()}</Text>
              </View>
            </View>
            <Button
              mode="contained"
              buttonColor="#006A3B"
              style={styles.actionBtn}
              onPress={() => navigation.navigate('DriverDashboard')}
            >
              Back to Dashboard
            </Button>
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#6F7A70" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.routeLabel}>
                  {status === 'InProgress' ? 'Heading to Dropoff' : 'Heading to Pickup'}
                </Text>
                <Text style={styles.routeValue} numberOfLines={1}>
                  {status === 'InProgress' ? bookingData.dropoff : bookingData.pickup}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.passengerInfo}>
              <View style={styles.avatarMini}>
                <MaterialCommunityIcons name="account" size={24} color="#006A3B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.passengerName}>{bookingData.userName || 'Passenger'}</Text>
                <Text style={styles.subtext}>Vehicle Type: {bookingData.vehicleType}</Text>
              </View>
            </View>

            {status === 'Confirmed' && (
              <Button mode="contained" buttonColor="#006A3B" style={styles.actionBtn} onPress={handleArrived}>
                Arrived at Pickup
              </Button>
            )}
            {status === 'Arrived' && (
              <Button mode="contained" buttonColor="#006A3B" style={styles.actionBtn} onPress={handleStartTrip}>
                Start Trip
              </Button>
            )}
            {status === 'InProgress' && (
              <Button mode="contained" buttonColor="#006A3B" style={styles.actionBtn} onPress={handleCompleteTrip}>
                Complete Trip
              </Button>
            )}
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6FBF3' },
  driverMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#006A3B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, minHeight: 200 },
  activeContainer: { gap: 8 },
  summaryContainer: { gap: 10, alignItems: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#006A3B', marginBottom: 5 },
  fareContainer: { alignItems: 'center' },
  fareLabel: { fontSize: 11, color: '#6F7A70', textTransform: 'uppercase', letterSpacing: 0.5 },
  fareVal: { fontSize: 28, fontWeight: '800', color: '#006A3B', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 15 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#6F7A70' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#181D19', marginTop: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLabel: { fontSize: 11, color: '#6F7A70', textTransform: 'uppercase' },
  routeValue: { fontSize: 14, color: '#181D19', fontWeight: '600' },
  passengerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarMini: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,106,59,0.08)', alignItems: 'center', justifyContent: 'center' },
  passengerName: { fontSize: 15, fontWeight: '700', color: '#181D19' },
  subtext: { fontSize: 12, color: '#6F7A70' },
  actionBtn: { marginTop: 10, borderRadius: 12, height: 50, justifyContent: 'center', width: '100%' },
});
