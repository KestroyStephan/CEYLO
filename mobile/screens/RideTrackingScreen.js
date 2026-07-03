import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Linking, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Surface, Avatar, Divider } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE, MapViewDirections } from '../components/Map';
import { doc, onSnapshot, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function RideTrackingScreen({ route, navigation }) {
  const { bookingId } = route.params || {};
  const [bookingData, setBookingData] = useState(null);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [rated, setRated] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No Booking ID provided');
      navigation.goBack();
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBookingData(data);

        // Fetch driver info once if not yet loaded
        if (data.driverId && !assignedDriver) {
          try {
            const driverSnap = await getDoc(doc(db, 'drivers', data.driverId));
            if (driverSnap.exists()) {
              setAssignedDriver(driverSnap.data());
            }
          } catch (e) {
            console.error('Driver fetch error:', e);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Booking listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId, assignedDriver]);

  // Keep camera centered on relevant points
  useEffect(() => {
    if (bookingData && mapRef.current) {
      const coords = [];
      if (bookingData.driverLocation) {
        coords.push({
          latitude: bookingData.driverLocation.latitude,
          longitude: bookingData.driverLocation.longitude,
        });
      }
      if (bookingData.pickupCoords) {
        coords.push({
          latitude: bookingData.pickupCoords.latitude,
          longitude: bookingData.pickupCoords.longitude,
        });
      }
      if (bookingData.dropoffCoords) {
        coords.push({
          latitude: bookingData.dropoffCoords.latitude,
          longitude: bookingData.dropoffCoords.longitude,
        });
      }

      if (coords.length > 1) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 50, bottom: 280, left: 50 },
          animated: true,
        });
      }
    }
  }, [bookingData]);

  const handleCall = () => {
    const phone = assignedDriver?.phone || bookingData?.driverPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Error', 'Driver phone number is not available');
    }
  };

  const handleSubmitRating = async () => {
    try {
      await addDoc(collection(db, 'reviews'), {
        vendorId: bookingData.driverId, 
        touristId: auth.currentUser.uid,
        rating: rating,
        comment: 'Driver review rating',
        createdAt: serverTimestamp(),
        type: 'driver_review',
      });
      setRated(true);
      Alert.alert('Success', 'Thank you for your rating!');
    } catch (error) {
      console.error('Rating submission error:', error);
    }
  };

  const getStatusText = () => {
    switch (bookingData?.status) {
      case 'Confirmed': return 'Your driver is on the way!';
      case 'Arrived': return 'Your driver has arrived at pickup!';
      case 'InProgress': return 'Trip in progress...';
      case 'Completed': return 'Trip completed!';
      default: return 'Waiting for driver...';
    }
  };

  if (loading || !bookingData) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  const { status, driverLocation } = bookingData;

  // Directions routing: If InProgress route pickup -> dropoff, else driver location -> pickup
  const origin = status === 'InProgress'
    ? { latitude: bookingData.pickupCoords?.latitude, longitude: bookingData.pickupCoords?.longitude }
    : (driverLocation || { latitude: bookingData.pickupCoords?.latitude, longitude: bookingData.pickupCoords?.longitude });

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
        {driverLocation && (
          <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Driver">
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

      <Surface style={styles.statusBanner} elevation={4}>
        <MaterialCommunityIcons 
          name={status === 'Completed' ? 'check-circle' : 'navigation'} 
          size={18} 
          color="#006A3B" 
        />
        <Text style={styles.statusBannerText}>{getStatusText()}</Text>
      </Surface>

      <Surface style={styles.bottomSheet} elevation={5}>
        {status === 'Completed' ? (
          <View style={styles.completedContainer}>
            <Text style={styles.summaryTitle}>Trip Completed!</Text>
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>Final Fare</Text>
              <Text style={styles.fareVal}>LKR {bookingData.finalFare?.toLocaleString() || '0'}</Text>
            </View>
            <Divider style={{ marginVertical: 12, width: '100%' }} />
            
            {!rated ? (
              <View style={styles.ratingArea}>
                <Text style={styles.ratingPrompt}>Rate your ride</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <MaterialCommunityIcons 
                        name={star <= rating ? 'star' : 'star-outline'} 
                        size={32} 
                        color="#FFD600" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Button mode="contained" buttonColor="#006A3B" style={styles.ratingBtn} onPress={handleSubmitRating}>
                  Submit Rating
                </Button>
              </View>
            ) : (
              <Text style={styles.ratedThanks}>Thank you for your feedback!</Text>
            )}
            
            <Button
              mode="outlined"
              textColor="#006A3B"
              style={styles.doneBtn}
              onPress={() => navigation.goBack()}
            >
              Done
            </Button>
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <View style={styles.driverInfo}>
              <Avatar.Image size={50} source={{ uri: 'https://i.pravatar.cc/150?u=driver' }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>{assignedDriver?.name || 'Your Driver'}</Text>
                <Text style={styles.subtext}>
                  {assignedDriver?.licensePlate || 'WP BCD-1234'} • {assignedDriver?.vehicleType || 'Vehicle'}
                </Text>
              </View>
              <IconButton 
                icon="phone" 
                mode="contained" 
                containerColor="rgba(0,106,59,0.08)" 
                iconColor="#006A3B" 
                onPress={handleCall}
              />
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#006A3B" />
              <Text style={styles.routeValue} numberOfLines={1}>To: {status === 'InProgress' ? bookingData.dropoff : bookingData.pickup}</Text>
            </View>
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
  statusBanner: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  statusBannerText: { fontSize: 14, fontWeight: '700', color: '#181D19' },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, minHeight: 160 },
  activeContainer: { gap: 4 },
  completedContainer: { gap: 10, alignItems: 'center', width: '100%' },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#006A3B' },
  fareContainer: { alignItems: 'center' },
  fareLabel: { fontSize: 11, color: '#6F7A70', textTransform: 'uppercase', letterSpacing: 0.5 },
  fareVal: { fontSize: 28, fontWeight: '800', color: '#006A3B', marginTop: 2 },
  ratingArea: { width: '100%', alignItems: 'center', gap: 8 },
  ratingPrompt: { fontSize: 13, fontWeight: '700', color: '#3F4941' },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 5 },
  ratingBtn: { borderRadius: 10, width: '100%', height: 45, justifyContent: 'center' },
  ratedThanks: { fontSize: 14, color: '#006A3B', fontWeight: '700', marginVertical: 10 },
  doneBtn: { borderRadius: 10, width: '100%', height: 45, justifyContent: 'center', marginTop: 5 },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#181D19' },
  subtext: { fontSize: 12, color: '#6F7A70' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeValue: { fontSize: 13, color: '#3F4941', flex: 1 },
});
