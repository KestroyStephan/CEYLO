import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Linking, ActivityIndicator
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { 
  collection, query, where, onSnapshot, 
  doc, updateDoc 
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { stopLocationTracking } from '../../services/DriverLocationService';

export default function DriverRideRequestsScreen() {
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const CANCEL_REASONS = [
    'Customer not at pickup',
    'Vehicle breakdown',
    'Emergency',
    'Customer request',
    'Other',
  ];

  // Watch driver location for the map
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Listen for any booking where THIS driver is assigned and ride is not yet completed or cancelled
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['Confirmed', 'Arrived', 'InProgress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rideDoc = snapshot.docs[0];
        setActiveRide({ id: rideDoc.id, ...rideDoc.data() });
      } else {
        setActiveRide(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Active ride fetch error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleArrived = async () => {
    try {
      await updateDoc(doc(db, 'bookings', activeRide.id), {
        status: 'Arrived',
        arrivedAt: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleStartTrip = async () => {
    try {
      await updateDoc(doc(db, 'bookings', activeRide.id), {
        status: 'InProgress',
        startedAt: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      stopLocationTracking();
      await updateDoc(doc(db, 'bookings', activeRide.id), {
        status: 'Completed',
        completedAt: new Date().toISOString(),
        finalFare: activeRide.price,
      });
      Alert.alert(
        'Trip Completed!',
        `Fare: LKR ${activeRide.price?.toLocaleString()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelRide = async () => {
    if (!cancelReason) {
      Alert.alert('Please select a reason');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', activeRide.id), {
        status: 'Cancelled',
        cancelledBy: 'driver',
        cancelReason: cancelReason,
        cancelledAt: new Date().toISOString(),
      });
      stopLocationTracking();
      setCancelDialogVisible(false);
      setCancelReason('');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel: ' + error.message);
    }
  };

  function getStatusLabel(status) {
    const labels = {
      Confirmed: 'Heading to Pickup',
      Arrived: 'Waiting at Pickup',
      InProgress: 'Trip in Progress',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  function getStatusColor(status) {
    const colors = {
      Confirmed: '#006A6A',
      Arrived: '#FF8F00',
      InProgress: '#006A3B',
      Completed: '#3F4941',
      Cancelled: '#BA1A1A',
    };
    return colors[status] || '#6F7A70';
  }

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  if (!activeRide) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="car-outline" size={52} color="#6F7A70" />
        <Text style={styles.emptyTitle}>No Active Ride</Text>
        <Text style={styles.emptySubtitle}>
          Accept a ride from the Dashboard to see it here
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ride</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: getStatusColor(activeRide?.status) + '20' 
          }]}>
            <Text style={[styles.statusText, { 
              color: getStatusColor(activeRide?.status) 
            }]}>
              {getStatusLabel(activeRide?.status)}
            </Text>
          </View>
        </View>

        {/* MAP — turn-by-turn navigation to pickup or dropoff */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: activeRide?.pickupCoords?.latitude || 6.9271,
              longitude: activeRide?.pickupCoords?.longitude || 79.8612,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{
                latitude: activeRide?.pickupCoords?.latitude || 6.9271,
                longitude: activeRide?.pickupCoords?.longitude || 79.8612,
              }}
              title="Pickup"
              pinColor="#006A3B"
            />
            <Marker
              coordinate={{
                latitude: activeRide?.dropoffCoords?.latitude || 6.9271,
                longitude: activeRide?.dropoffCoords?.longitude || 79.8612,
              }}
              title="Dropoff"
              pinColor="#BA1A1A"
            />
            {activeRide?.status === 'InProgress' && (
              <MapViewDirections
                origin={activeRide.pickupCoords}
                destination={activeRide.dropoffCoords}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
                strokeWidth={4}
                strokeColor="#006A3B"
              />
            )}
            {activeRide?.status === 'Confirmed' && driverLocation && (
              <MapViewDirections
                origin={driverLocation}
                destination={activeRide.pickupCoords}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
                strokeWidth={4}
                strokeColor="#006A6A"
              />
            )}
          </MapView>
        </View>

        {/* Customer Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionLabel}>CUSTOMER</Text>
          <Text style={styles.customerName}>
            {activeRide?.userName || 'Customer'}
          </Text>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${activeRide?.userPhone || ''}`)}
          >
            <Ionicons name="call-outline" size={16} color="#006A3B" />
            <Text style={styles.callButtonText}>
              {activeRide?.userPhone || 'No phone number'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>PICKUP</Text>
          <Text style={styles.locationText}>{activeRide?.pickup}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>DROPOFF</Text>
          <Text style={styles.locationText}>{activeRide?.dropoff}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>FARE</Text>
          <Text style={styles.fareText}>
            LKR {activeRide?.price?.toLocaleString() || '0'}
          </Text>
        </View>

        {/* Action Button based on status */}
        {activeRide?.status === 'Confirmed' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleArrived}>
            <Text style={styles.actionButtonText}>Arrived at Pickup</Text>
          </TouchableOpacity>
        )}
        {activeRide?.status === 'Arrived' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleStartTrip}>
            <Text style={styles.actionButtonText}>Start Trip</Text>
          </TouchableOpacity>
        )}
        {activeRide?.status === 'InProgress' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCompleteTrip}>
            <Text style={styles.actionButtonText}>Complete Trip</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Ride Button — driver can cancel anytime */}
        {activeRide && !['Completed', 'Cancelled'].includes(activeRide.status) && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => setCancelDialogVisible(true)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#BA1A1A" />
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Cancel Reason Picker Modal */}
      <Modal visible={cancelDialogVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSubtitle}>
              Select a reason for cancellation
            </Text>
            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  cancelReason === reason && styles.reasonSelected
                ]}
                onPress={() => setCancelReason(reason)}
              >
                <Text style={[
                  styles.reasonText,
                  cancelReason === reason && styles.reasonTextSelected
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.confirmCancelButton, !cancelReason && styles.disabledButton]}
              onPress={handleCancelRide}
              disabled={!cancelReason}
            >
              <Text style={styles.confirmCancelText}>Confirm Cancellation</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={() => {
                setCancelDialogVisible(false);
                setCancelReason('');
              }}
            >
              <Text style={styles.dismissText}>Keep Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6FBF3' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, 
    paddingTop: 60, paddingBottom: 16 
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#181D19' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  mapContainer: { height: 260, marginHorizontal: 0 },
  map: { flex: 1 },
  detailsCard: { 
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, margin: 16, elevation: 3,
    shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 10,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#6F7A70',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  customerName: { fontSize: 18, fontWeight: '700', color: '#181D19', marginBottom: 8 },
  callButton: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,106,59,0.08)', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start',
  },
  callButtonText: { color: '#006A3B', fontWeight: '600', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#EBEFE8', marginVertical: 12 },
  locationText: { fontSize: 14, color: '#181D19', lineHeight: 20 },
  fareText: { fontSize: 22, fontWeight: '800', color: '#006A3B' },
  actionButton: {
    backgroundColor: '#006A3B', marginHorizontal: 16,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#BA1A1A',
    marginBottom: 100,
  },
  cancelButtonText: { color: '#BA1A1A', fontSize: 14, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#181D19', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#6F7A70', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#181D19', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6F7A70', marginBottom: 16 },
  reasonOption: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#BECABE', marginBottom: 8 },
  reasonSelected: { borderColor: '#006A3B', backgroundColor: 'rgba(0,106,59,0.08)' },
  reasonText: { fontSize: 14, color: '#181D19' },
  reasonTextSelected: { color: '#006A3B', fontWeight: '600' },
  confirmCancelButton: { backgroundColor: '#BA1A1A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  disabledButton: { opacity: 0.4 },
  confirmCancelText: { color: '#FFFFFF', fontWeight: '700' },
  dismissButton: { padding: 14, alignItems: 'center' },
  dismissText: { color: '#3F4941', fontWeight: '600' },
});
