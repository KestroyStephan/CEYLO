import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, Dimensions, Animated, TouchableOpacity,
  Image, ScrollView, TextInput, FlatList, Alert, Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapViewDirections } from '../components/Map';
import { Text, Surface, Button, Avatar, IconButton, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { doc, addDoc, collection, onSnapshot, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { calculateDistance, estimateFare, estimateAllFares } from '../utils/fareCalculator';

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const VEHICLE_OPTIONS = [
  { id: 'Tuk', label: 'TUK TUK', icon: 'bus-outline' },
  { id: 'Bike', label: 'BIKE', icon: 'bicycle-outline' },
  { id: 'Car', label: 'CAR', icon: 'car-outline' },
  { id: 'Van', label: 'VAN', icon: 'car-sport-outline' },
];

export default function TransportScreen({ route, navigation }) {
  const { destination: passedDestination } = route.params || {};

  const [bookingStep, setBookingStep] = useState('input');
  // 'input' | 'vehicleSelect' | 'searching' | 'driverAssigned'

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropAddress, setDropAddress] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [focusedField, setFocusedField] = useState('drop');

  const [selectedVehicle, setSelectedVehicle] = useState('Tuk');
  const [estimatedFares, setEstimatedFares] = useState({});
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [assignedDriver, setAssignedDriver] = useState(null);

  // Search autocomplete states
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [canTouristCancel, setCanTouristCancel] = useState(true);

  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize Pickup Location and Reverse Geocode
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setPickupCoords(coords);

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.results?.length > 0) {
          setPickupAddress(data.results[0].formatted_address);
        } else {
          setPickupAddress("Current Location");
        }
      } catch (e) {
        setPickupAddress("Current Location");
      }
    })();
  }, []);

  // Prepopulate if passed from elsewhere (e.g. MapScreen)
  useEffect(() => {
    if (passedDestination && passedDestination.coords && pickupCoords) {
      const lat = passedDestination.coords.latitude;
      const lng = passedDestination.coords.longitude;
      const address = passedDestination.name || "Destination";

      const destObj = { latitude: lat, longitude: lng };
      setDropoffCoords(destObj);
      setDropAddress(address);

      calculateFares(pickupCoords, destObj);
    }
  }, [passedDestination, pickupCoords]);

  // Adjust map viewport to fit pickup and destination
  useEffect(() => {
    if (pickupCoords && dropoffCoords && mapRef.current) {
      mapRef.current.fitToCoordinates([
        { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
        { latitude: dropoffCoords.latitude, longitude: dropoffCoords.longitude }
      ], {
        edgePadding: { top: 100, right: 50, bottom: 420, left: 50 },
        animated: true,
      });
    }
  }, [pickupCoords, dropoffCoords]);

  // Pulsing animation for Searching state
  useEffect(() => {
    if (bookingStep === 'searching') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [bookingStep]);

  // Real-time listener on active booking
  useEffect(() => {
    if (!activeBookingId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', activeBookingId),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setActiveBooking({ id: snap.id, ...data });

        if (data.status === 'Confirmed' && data.driverId) {
          setBookingStep('driverAssigned');
          // Fetch driver details
          const driverSnap = await getDoc(doc(db, 'drivers', data.driverId));
          if (driverSnap.exists()) {
            setAssignedDriver(driverSnap.data());
          }
        }

        if (data.status === 'Cancelled') {
          setBookingStep('input');
          setActiveBookingId(null);
          setActiveBooking(null);
          setAssignedDriver(null);
          Alert.alert('Ride Cancelled', 'Your ride has been cancelled.');
        }

        if (data.status === 'Completed') {
          setBookingStep('input');
          setActiveBookingId(null);
          setActiveBooking(null);
          setAssignedDriver(null);
          Alert.alert(
            'Ride Completed!',
            `Total Fare: LKR ${data.finalFare?.toLocaleString() || data.price?.toLocaleString()}`,
            [{ text: 'OK' }]
          );
        }
      }
    );
    return () => unsubscribe();
  }, [activeBookingId]);

  // Half-way cancellation restriction logic
  useEffect(() => {
    if (!activeBooking || !assignedDriver || !activeBooking.driverLocation) return;

    if (activeBooking.status === 'InProgress') {
      // Calculate total route distance (pickup to dropoff)
      const totalDistance = calculateDistance(
        activeBooking.pickupCoords.latitude,
        activeBooking.pickupCoords.longitude,
        activeBooking.dropoffCoords.latitude,
        activeBooking.dropoffCoords.longitude,
      );

      // Calculate remaining distance (driver to dropoff)
      const remainingDistance = calculateDistance(
        activeBooking.driverLocation.latitude,
        activeBooking.driverLocation.longitude,
        activeBooking.dropoffCoords.latitude,
        activeBooking.dropoffCoords.longitude,
      );

      // If driver has traveled more than 50% of route, disable cancel
      const percentRemaining = remainingDistance / totalDistance;
      setCanTouristCancel(percentRemaining > 0.5);
    } else {
      // Before InProgress: tourist can always cancel
      setCanTouristCancel(true);
    }
  }, [activeBooking?.driverLocation, activeBooking?.status]);

  // Reset pickup to current location
  const resetPickupToCurrent = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setPickupCoords(coords);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.results?.length > 0) {
        setPickupAddress(data.results[0].formatted_address);
      } else {
        setPickupAddress("Current Location");
      }
      if (dropoffCoords) {
        calculateFares(coords, dropoffCoords);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve current location.');
    }
  };

  // Google Places Autocomplete Search
  const searchPlaces = async (text, type) => {
    if (type === 'pickup') {
      setPickupAddress(text);
    } else {
      setDropAddress(text);
    }

    if (text.length < 3) {
      setDestinationSuggestions([]);
      return;
    }
    setSearchingPlaces(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:lk`
      );
      const data = await response.json();
      if (data.predictions) {
        setDestinationSuggestions(data.predictions);
      }
    } catch (e) {
      console.error('Autocomplete search error:', e);
    } finally {
      setSearchingPlaces(false);
    }
  };

  // Select place from autocomplete
  const selectPlace = async (placeId, description, type) => {
    setDestinationSuggestions([]);
    if (type === 'pickup') {
      setPickupAddress(description);
    } else {
      setDropAddress(description);
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.result?.geometry?.location) {
        const coords = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
        if (type === 'pickup') {
          setPickupCoords(coords);
          if (dropoffCoords) {
            calculateFares(coords, dropoffCoords);
          }
        } else {
          setDropoffCoords(coords);
          if (pickupCoords) {
            calculateFares(pickupCoords, coords);
          }
        }
      }
    } catch (e) {
      console.error('Place details fetch error:', e);
      Alert.alert('Error', 'Failed to retrieve location details');
    }
  };

  const calculateFares = (pCoords, dCoords) => {
    const distance = calculateDistance(
      pCoords.latitude,
      pCoords.longitude,
      dCoords.latitude,
      dCoords.longitude
    );
    const fares = estimateAllFares(distance);
    setEstimatedFares(fares);
    setBookingStep('vehicleSelect');
  };

  const handleBookRide = async () => {
    try {
      // Fetch the user's phone from users collection
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userPhone = userDoc.data()?.phone || '';

      // The selectedVehicle key ('Tuk' | 'Bike' | 'Car' | 'Van') matches the driver collection filters
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        userId: auth.currentUser.uid,
        userName: userDoc.data()?.name || auth.currentUser.displayName || 'Tourist',
        userPhone: userPhone, // needed for driver to call customer
        driverId: null,
        status: 'pending',
        pickup: pickupAddress,
        pickupCoords: pickupCoords,
        dropoff: dropAddress,
        dropoffCoords: dropoffCoords,
        vehicleType: selectedVehicle, // matches driver filtered query
        price: estimatedFares[selectedVehicle],
        createdAt: serverTimestamp(),
      });
      setActiveBookingId(bookingRef.id);
      setBookingStep('searching');

      // SIMULATION: Automatically assign a mock driver after 5 seconds
      setTimeout(async () => {
        try {
          const bookingCheck = await getDoc(bookingRef);
          if (bookingCheck.exists() && bookingCheck.data().status === 'pending') {
            await updateDoc(bookingRef, {
              status: 'Confirmed',
              driverId: 'mock_driver_123',
              driverLocation: {
                latitude: pickupCoords.latitude + 0.005,
                longitude: pickupCoords.longitude + 0.005,
              }
            });
            // Ensure the mock driver exists in the drivers collection for the UI to display details
            const { setDoc } = require('firebase/firestore');
            const mockDriverRef = doc(db, 'drivers', 'mock_driver_123');
            await setDoc(mockDriverRef, {
              name: 'Kamal (Mock Driver)',
              phone: '+94712345678',
              vehicleType: selectedVehicle,
              licensePlate: 'WP-ABC-1234'
            }, { merge: true });
          }
        } catch (simError) {
          console.log("Mock driver simulation failed:", simError);
        }
      }, 5000);
      
    } catch (error) {
      Alert.alert('Booking Failed', error.message);
    }
  };

  const handleCancelBooking = async () => {
    if (activeBookingId) {
      try {
        await updateDoc(doc(db, 'bookings', activeBookingId), {
          status: 'Cancelled'
        });
      } catch (e) {
        console.error('Cancel booking error:', e);
      }
    }
    setBookingStep('input');
    setDropAddress('');
    setDropoffCoords(null);
    setActiveBookingId(null);
    setAssignedDriver(null);
  };

  const handleTouristCancel = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', activeBookingId), {
                status: 'Cancelled',
                cancelledBy: 'tourist',
                cancelReason: 'Tourist cancelled',
                cancelledAt: new Date().toISOString(),
              });
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  function getBookingStatusText(status) {
    const texts = {
      Confirmed: 'Driver is on the way to your pickup',
      Arrived: 'Driver has arrived at your pickup!',
      InProgress: 'Trip in progress...',
      Completed: 'Trip completed!',
      Cancelled: 'Ride cancelled',
    };
    return texts[status] || 'Connecting...';
  }

  const RenderVehicle = ({ item }) => {
    const isSelected = selectedVehicle === item.id;
    return (
      <TouchableOpacity
        onPress={() => setSelectedVehicle(item.id)}
        style={[styles.vehicleBtn, isSelected && styles.selectedVehicle]}
      >
        <Ionicons name={item.icon} size={32} color={isSelected ? '#FFF' : '#006A3B'} />
        <Text style={[styles.vName, isSelected && { color: '#FFF' }]}>{item.label}</Text>
        <Text style={[styles.vPrice, isSelected && { color: '#FFF' }]}>
          LKR {estimatedFares[item.id] ? estimatedFares[item.id].toLocaleString() : '...'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.mainHeading}>Let's Ride</Text>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: pickupCoords ? pickupCoords.latitude : 6.9271,
          longitude: pickupCoords ? pickupCoords.longitude : 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {pickupCoords && <Marker coordinate={pickupCoords} title="Pickup" pinColor="#006A3B" />}
        {dropoffCoords && <Marker coordinate={dropoffCoords} title="Dropoff" pinColor="#BA1A1A" />}

        {pickupCoords && dropoffCoords && (
          <MapViewDirections
            origin={pickupCoords}
            destination={dropoffCoords}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor="#006A3B"
          />
        )}

        {/* Driver live tracking marker */}
        {bookingStep === 'driverAssigned' && activeBooking?.driverLocation && (
          <Marker
            coordinate={{
              latitude: activeBooking.driverLocation.latitude,
              longitude: activeBooking.driverLocation.longitude,
            }}
            title="Your Driver"
            description={assignedDriver?.name}
          >
            <View style={styles.driverMapMarker}>
              <Ionicons name="car" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      <IconButton icon="arrow-left" mode="contained" containerColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />

      <Surface style={styles.bottomSheet} elevation={5}>
        <View style={styles.dragBar} />

        {bookingStep === 'input' && (
          <View style={styles.content}>
            <Text style={styles.sheetTitle}>Where to?</Text>

            {/* Pickup input */}
            <View style={styles.searchContainer}>
              <Ionicons name="ellipse" size={12} color="#006A3B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInputField}
                placeholder="Enter pickup address..."
                placeholderTextColor="#6F7A70"
                value={pickupAddress}
                onFocus={() => setFocusedField('pickup')}
                onChangeText={(text) => {
                  setFocusedField('pickup');
                  searchPlaces(text, 'pickup');
                }}
              />
              <TouchableOpacity onPress={resetPickupToCurrent} style={{ paddingHorizontal: 4 }}>
                <Ionicons name="locate-outline" size={20} color="#006A3B" />
              </TouchableOpacity>
            </View>

            {/* Dropoff input */}
            <View style={styles.searchContainer}>
              <Ionicons name="location" size={12} color="#BA1A1A" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInputField}
                placeholder="Enter destination..."
                placeholderTextColor="#6F7A70"
                value={dropAddress}
                onFocus={() => setFocusedField('drop')}
                onChangeText={(text) => {
                  setFocusedField('drop');
                  searchPlaces(text, 'drop');
                }}
              />
              {searchingPlaces && <ActivityIndicator size="small" color="#006A3B" style={{ marginRight: 8 }} />}
            </View>

            {/* Auto Suggestions List */}
            {destinationSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                <FlatList
                  data={destinationSuggestions}
                  keyExtractor={(item) => item.place_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => selectPlace(item.place_id, item.description, focusedField)}
                    >
                      <Ionicons name="map-outline" size={18} color="#6F7A70" />
                      <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        )}

        {bookingStep === 'vehicleSelect' && (
          <View style={styles.content}>
            <View style={styles.selectedDestRow}>
              <Ionicons name="location" size={18} color="#BA1A1A" />
              <Text style={styles.selectedDestText} numberOfLines={1}>{dropAddress}</Text>
              <TouchableOpacity onPress={() => setBookingStep('input')}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Select Vehicle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
              {VEHICLE_OPTIONS.map(v => <RenderVehicle key={v.id} item={v} />)}
            </ScrollView>

            <Button mode="contained" onPress={handleBookRide} style={styles.bookBtn} buttonColor="#006A3B">
              Book {VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.label}
            </Button>
          </View>
        )}

        {bookingStep === 'searching' && (
          <View style={styles.loadingArea}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.pulseIndicator}>
                <Ionicons name="radio" size={48} color="#006A3B" />
              </View>
            </Animated.View>
            <Text style={styles.loadingText}>Searching for nearby drivers...</Text>
            <Button mode="outlined" style={styles.cancelBtn} textColor="#BA1A1A" onPress={handleCancelBooking}>
              Cancel Request
            </Button>
          </View>
        )}

        {/* Embedded active driver tracking info */}
        {bookingStep === 'driverAssigned' && (
          <>
            {/* Status banner */}
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>
                {getBookingStatusText(activeBooking?.status)}
              </Text>
            </View>

            {/* Driver details card */}
            <View style={styles.driverCard}>
              <View style={styles.driverCardHeader}>
                <View style={styles.driverAvatarCircle}>
                  <Text style={styles.driverAvatarLetter}>
                    {(assignedDriver?.name || 'D').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {assignedDriver?.name || 'Your Driver'}
                  </Text>
                  <Text style={styles.driverVehicle}>
                    {assignedDriver?.vehicleType} • {assignedDriver?.licensePlate}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.callDriverButton}
                  onPress={() => Linking.openURL(`tel:${assignedDriver?.phone || ''}`)}
                >
                  <Ionicons name="call" size={20} color="#006A3B" />
                </TouchableOpacity>
              </View>

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Estimated Fare</Text>
                <Text style={styles.fareAmount}>
                  LKR {activeBooking?.price?.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Cancel button — with half-way restriction */}
            {canTouristCancel && (
              <TouchableOpacity
                style={styles.cancelRideButton}
                onPress={handleTouristCancel}
              >
                <Ionicons name="close-circle-outline" size={18} color="#BA1A1A" />
                <Text style={styles.cancelRideText}>Cancel Ride</Text>
              </TouchableOpacity>
            )}

            {!canTouristCancel && activeBooking?.status === 'InProgress' && (
              <View style={styles.cannotCancelBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#FF8F00" />
                <Text style={styles.cannotCancelText}>
                  Cannot cancel — driver has passed the halfway point
                </Text>
              </View>
            )}
          </>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  mainHeading: {
    fontSize: 28, fontWeight: '800', color: '#181D19',
    fontFamily: 'Outfit-Bold',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  map: { flex: 1 },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, minHeight: 350 },
  dragBar: { width: 40, height: 4, backgroundColor: '#EEE', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  content: { gap: 15 },
  sheetTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#333' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7F9', borderRadius: 15, paddingHorizontal: 12, height: 50 },
  searchIcon: { marginRight: 8 },
  searchInputField: { flex: 1, fontSize: 15, color: '#333', fontFamily: 'Outfit-Regular' },
  suggestionsBox: { maxHeight: 200, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 10 },
  suggestionText: { fontSize: 13, color: '#333', flex: 1 },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pickupText: { fontSize: 12, color: '#6F7A70' },
  selectedDestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7F9', padding: 12, borderRadius: 10, gap: 8 },
  selectedDestText: { flex: 1, fontSize: 13, color: '#333' },
  editBtn: { fontSize: 13, color: '#006A3B', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#333', marginTop: 10 },
  vehicleScroll: { gap: 12, paddingVertical: 10 },
  vehicleBtn: { width: 100, padding: 15, borderRadius: 20, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  selectedVehicle: { backgroundColor: '#006A3B', borderColor: '#004D40' },
  vName: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#006A3B', marginTop: 8 },
  vPrice: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666' },
  bookBtn: { marginTop: 10, borderRadius: 15, height: 55, justifyContent: 'center' },
  loadingArea: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  pulseIndicator: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,106,59,0.12)', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Outfit-Medium', color: '#006A3B', fontSize: 16 },
  cancelBtn: { borderRadius: 15, borderColor: '#BA1A1A', width: '100%' },

  // Driver assigned styles
  statusBanner: {
    backgroundColor: '#006A3B', marginHorizontal: 16,
    marginTop: 12, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  statusBannerText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  driverCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16,
    padding: 16, elevation: 3, shadowColor: '#181D19',
    shadowOpacity: 0.08, shadowRadius: 10,
  },
  driverCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,106,59,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  driverAvatarLetter: { fontSize: 18, fontWeight: '700', color: '#006A3B' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#181D19' },
  driverVehicle: { fontSize: 12, color: '#6F7A70', marginTop: 2 },
  callDriverButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,106,59,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EBEFE8' },
  fareLabel: { fontSize: 13, color: '#6F7A70' },
  fareAmount: { fontSize: 20, fontWeight: '800', color: '#006A3B' },
  cancelRideButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#BA1A1A', marginBottom: 16,
  },
  cancelRideText: { color: '#BA1A1A', fontWeight: '600', fontSize: 14 },
  cannotCancelBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,143,0,0.1)', borderRadius: 10, marginBottom: 16,
  },
  cannotCancelText: { fontSize: 12, color: '#FF8F00', flex: 1 },
  driverMapMarker: {
    backgroundColor: '#006A3B', borderRadius: 14, padding: 6,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
});
