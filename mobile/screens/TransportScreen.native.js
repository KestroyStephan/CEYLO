import React, { useState, useEffect, useRef } from 'react';
import i18n from '../i18n';
import {
  View, StyleSheet, Dimensions, Animated, TouchableOpacity,
  Image, ScrollView, TextInput, FlatList, Alert, Linking, Keyboard
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapViewDirections } from '../components/Map';
import { Text, Surface, Button, Avatar, IconButton, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { doc, addDoc, collection, onSnapshot, getDoc, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { calculateDistance, estimateFare, estimateAllFares } from '../utils/fareCalculator';
import { nearbyDrivers, REQUEST_TTL_MS, MATCH_RADIUS_KM } from '../utils/rideDispatch';
import { notifyBooking } from '../services/aiClient';
import { logEvent } from '../services/Analytics';

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
  const [routeInfo, setRouteInfo] = useState(null);
  const [onlineDrivers, setOnlineDrivers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [ratingFor, setRatingFor] = useState(null);     // completed booking waiting for a rating
  const [myRating, setMyRating] = useState(0);
  const [driverRating, setDriverRating] = useState(null);
  const expiryTimer = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Lift the bottom sheet above the keyboard so destination suggestions stay visible
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => () => clearTimeout(expiryTimer.current), []);

  // Online drivers and their approximate positions (PickMe-style cars on the map)
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'drivers'), where('isOnline', '==', true)), (snap) => {
      setOnlineDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.log('Online drivers unavailable:', e.message));
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { unsub(); clearInterval(tick); };
  }, []);
  const nearby = nearbyDrivers(onlineDrivers, pickupCoords, null, now);
  const nearbyByType = (type) => nearby.filter(d => d.vehicleType === type);

  const mapRef = useRef(null);
  const demoDriverTimer = useRef(null);
  useEffect(() => () => clearTimeout(demoDriverTimer.current), []);
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

  // Centre the map on the pickup as soon as it is known
  useEffect(() => {
    if (pickupCoords && !dropoffCoords && mapRef.current) {
      mapRef.current.animateToRegion({ ...pickupCoords, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 600);
    }
  }, [pickupCoords]);

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
          clearTimeout(demoDriverTimer.current);
          clearTimeout(expiryTimer.current);
          setBookingStep('driverAssigned');
          // Fetch driver details
          if (data.demoDriver) {
            setAssignedDriver(data.demoDriver);
          } else {
            const driverSnap = await getDoc(doc(db, 'drivers', data.driverId));
            if (driverSnap.exists()) {
              setAssignedDriver(driverSnap.data());
            }
            // Driver's rating from riders' reviews
            getDocs(query(collection(db, 'reviews'), where('driverId', '==', data.driverId)))
              .then(rs => {
                const vals = rs.docs.map(r => Number(r.data().rating)).filter(Boolean);
                setDriverRating(vals.length ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length } : null);
              })
              .catch(() => setDriverRating(null));
          }
        }

        if (data.status === 'Expired') {
          setBookingStep('vehicleSelect');
          setActiveBookingId(null);
          setActiveBooking(null);
          Alert.alert('No driver yet', 'No nearby driver accepted in time. Try again, or choose another vehicle type.');
          return;
        }

        if (data.status === 'Cancelled') {
          clearTimeout(expiryTimer.current);
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
          // Ask for a driver rating (shown as a card on the map screen)
          setRatingFor({ id: snap.id, driverId: data.driverId, fare: data.finalFare || data.price });
          setMyRating(0);
          logEvent('ride_completed', { bookingId: snap.id, vehicleType: data.vehicleType });
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

  // --- NEW SEARCH IMPLEMENTATION (SECTION 1) ---
  const searchDestination = async (text) => {
    setDropAddress(text);

    if (!text || text.length < 2) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&components=country:lk&language=en&types=geocode|establishment`;

      const response = await fetch(url);
      const data = await response.json();

      console.log('=== TRANSPORT SEARCH DEBUG ===');
      console.log('Query:', text);
      console.log('URL:', url);
      console.log('Response status:', data.status);
      console.log('Error message:', data.error_message || 'none');
      console.log('Results count:', data.predictions?.length || 0);
      console.log('==============================');

      if (data.status === 'OK' && data.predictions?.length > 0) {
        setDestinationSuggestions(data.predictions);
      } else if (data.status === 'ZERO_RESULTS') {
        setDestinationSuggestions([]);
      } else {
        console.log('Places API status:', data.status);
        console.log('Error message:', data.error_message);
        setDestinationSuggestions([]);
      }
    } catch (error) {
      console.error('Destination search error:', error);
      setDestinationSuggestions([]);
    }
  };

  const selectDestination = async (placeId, description) => {
    setDropAddress(description);
    setDestinationSuggestions([]);

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${apiKey}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const coords = { latitude: lat, longitude: lng };

        setDropoffCoords(coords);

        if (pickupCoords) {
          await calculateRoute(pickupCoords, coords);
        }

        if (mapRef?.current) {
          mapRef.current.fitToCoordinates(
            [pickupCoords, coords],
            {
              edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
              animated: true,
            }
          );
        }
      } else {
        console.log('Place details error:', data.status);
        Alert.alert('Location Error', 'Could not get coordinates for this location.', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Place details error:', error);
      Alert.alert('Error', 'Could not load location details.');
    }
  };

  const calculateRoute = async (origin, destination) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&mode=driving&region=lk`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes?.length > 0) {
        const leg = data.routes[0].legs[0];
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
        });

        const distanceKm = leg.distance.value / 1000;
        if (typeof estimateAllFares === 'function') {
          const fares = estimateAllFares(distanceKm);
          setEstimatedFares(fares);
        }
      } else {
        console.log('Directions API status:', data.status);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };
  // --- END NEW SEARCH IMPLEMENTATION ---

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
    if (!pickupCoords || !dropoffCoords) {
      Alert.alert('Choose a destination', 'Set where you are going first.');
      return;
    }
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
        routeDistanceKm: routeInfo?.distanceValue ? Math.round(routeInfo.distanceValue / 100) / 10 : null,
        routeDurationMin: routeInfo?.durationMin || null,
        createdAt: serverTimestamp(),
      });
      setActiveBookingId(bookingRef.id);
      setBookingStep('searching');
      logEvent('ride_requested', { bookingId: bookingRef.id, vehicleType: selectedVehicle, nearbyDrivers: nearbyByType(selectedVehicle).length });
      // The backend pushes the request to online drivers of this type near the pickup
      notifyBooking(bookingRef.id);
      // Nobody accepted in time: expire the request so no driver can take a stale ride
      clearTimeout(expiryTimer.current);
      expiryTimer.current = setTimeout(async () => {
        try {
          const latest = await getDoc(bookingRef);
          if (latest.exists() && latest.data().status === 'pending') {
            await updateDoc(bookingRef, { status: 'Expired', expiredAt: new Date().toISOString() });
          }
        } catch (e) {
          console.log('Could not expire the request:', e.message);
        }
      }, REQUEST_TTL_MS);

      // Demo builds only (EXPO_PUBLIC_DEMO_MODE=true): if no real driver accepts within 15s,
      // assign a clearly-labelled demo driver so the ride flow can be presented.
      if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
        demoDriverTimer.current = setTimeout(async () => {
          try {
            const bookingCheck = await getDoc(bookingRef);
            if (bookingCheck.exists() && bookingCheck.data().status === 'pending') {
              await updateDoc(bookingRef, {
                status: 'Confirmed',
                driverId: 'demo_driver',
                demoDriver: {
                  name: 'Kamal (Demo Driver)',
                  phone: '+94712345678',
                  vehicleType: selectedVehicle,
                  licensePlate: 'WP-ABC-1234',
                },
                driverLocation: {
                  latitude: pickupCoords.latitude + 0.005,
                  longitude: pickupCoords.longitude + 0.005,
                }
              });
            }
          } catch (simError) {
            console.log("Demo driver assignment failed:", simError);
          }
        }, 15000);
      }

    } catch (error) {
      Alert.alert('Booking Failed', error.message);
    }
  };

  const handleCancelBooking = async () => {
    clearTimeout(demoDriverTimer.current);
    clearTimeout(expiryTimer.current);
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
        <Text style={[styles.vEta, isSelected && { color: '#FFF' }]}>
          {nearbyByType(item.id).length ? `${nearbyByType(item.id).length} near · ${nearbyByType(item.id)[0].eta} min` : 'None nearby'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Resolves the destination and shows the vehicle choice with fares and nearby drivers
  const handleFindRide = async () => {
    try {
      let pick = pickupCoords;
      if (!pick) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        pick = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setPickupCoords(pick);
      }
      const currentLat = pick.latitude;
      const currentLng = pick.longitude;

      let destLat, destLng;
      if (dropoffCoords) {
        destLat = dropoffCoords.latitude;
        destLng = dropoffCoords.longitude;
      } else {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(dropAddress)}&key=${GOOGLE_API_KEY}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          destLat = data.results[0].geometry.location.lat;
          destLng = data.results[0].geometry.location.lng;
          setDropoffCoords({ latitude: destLat, longitude: destLng });
        } else {
          Alert.alert('Error', 'Could not find destination. Please try another address.');
          return;
        }
      }

      const dirRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${currentLat},${currentLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}`);
      const dirData = await dirRes.json();
      let distanceKm = 0;
      let durationMins = 0;
      if (dirData.routes && dirData.routes.length > 0) {
        const leg = dirData.routes[0].legs[0];
        distanceKm = leg.distance.value / 1000;
        durationMins = Math.ceil(leg.duration.value / 60);
        setRouteInfo({ distance: distanceKm.toFixed(1), duration: durationMins });
      }

      const km = distanceKm || calculateDistance(currentLat, currentLng, destLat, destLng);
      setEstimatedFares(estimateAllFares(km));
      setBookingStep('vehicleSelect');
    } catch (error) {
      console.error('Find Ride Error:', error);
      Alert.alert('Error', 'Could not plan this ride. Check the destination and your connection.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.mainHeading}>{i18n.t('ui_let_s_ride')}</Text>

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
        {pickupCoords && dropoffCoords && (
          <MapViewDirections
            origin={pickupCoords}
            destination={dropoffCoords}
            apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#006A3B"
            onError={(errorMessage) => {
              console.log('Directions error:', errorMessage);
            }}
            onReady={(result) => {
              setRouteInfo({
                distance: `${result.distance.toFixed(1)} km`,
                duration: `${Math.ceil(result.duration)} mins`,
                distanceValue: result.distance * 1000,
                durationMin: Math.ceil(result.duration),
              });
              // Fares follow the road distance, not the straight line
              setEstimatedFares(estimateAllFares(result.distance));
            }}
          />
        )}

        {/* Nearby online drivers (positions rounded to ~100 m) */}
        {(bookingStep === 'input' || bookingStep === 'vehicleSelect' || bookingStep === 'searching') && nearby.map(d => (
          <Marker key={d.id} coordinate={{ latitude: d.location.latitude, longitude: d.location.longitude }} title={`${d.vehicleType || 'Driver'} · ~${d.eta} min`}>
            <View style={styles.nearbyCar}>
              <Ionicons name={d.vehicleType === 'Bike' ? 'bicycle' : 'car'} size={14} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* Pickup marker */}
        {pickupCoords && (
          <Marker coordinate={pickupCoords} title="Pickup">
            <View style={styles.pickupMarker}>
              <Ionicons name="ellipse" size={12} color="#006A3B" />
            </View>
          </Marker>
        )}

        {/* Destination marker */}
        {dropoffCoords && (
          <Marker coordinate={dropoffCoords} title="Destination">
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={20} color="#BA1A1A" />
            </View>
          </Marker>
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

      <IconButton accessibilityLabel="Go back" icon="arrow-left" mode="contained" containerColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />

      <Surface style={[styles.bottomSheet, keyboardHeight ? { bottom: keyboardHeight, maxHeight: height - keyboardHeight - 130, overflow: 'hidden' } : null]} elevation={5}>
        <View style={styles.dragBar} />

        {bookingStep === 'input' && (
          <View style={styles.content}>
            <Text style={styles.sheetTitle}>{i18n.t('ui_where_to')}</Text>

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
                onChangeText={searchDestination}
              />
              {searchingPlaces && <ActivityIndicator size="small" color="#006A3B" style={{ marginRight: 8 }} />}
            </View>

            {/* Auto Suggestions List */}
            {destinationSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {destinationSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.place_id}
                    style={styles.suggestionItem}
                    onPress={() => selectDestination(
                      suggestion.place_id,
                      suggestion.description
                    )}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#006A3B"
                    />
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {suggestion.structured_formatting?.main_text ||
                         suggestion.description}
                      </Text>
                      <Text style={styles.suggestionSecondary} numberOfLines={1}>
                        {suggestion.structured_formatting?.secondary_text || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ADD route info card when route is calculated */}
            {routeInfo && (
              <View style={styles.routeInfoCard}>
                <View style={styles.routeInfoItem}>
                  <Ionicons name="navigate-outline" size={18} color="#006A3B" />
                  <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <Ionicons name="time-outline" size={18} color="#006A6A" />
                  <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
                </View>
              </View>
            )}

            <Button
              mode="contained"
              buttonColor="#00695C"
              disabled={!pickupCoords || !dropAddress}
              style={{ marginTop: 15, borderRadius: 12, height: 50, justifyContent: 'center' }}
              labelStyle={{ fontSize: 16, fontFamily: 'Outfit-Bold' }}
              onPress={handleFindRide}
            >
              Find Ride
            </Button>
          </View>
        )}

        {bookingStep === 'vehicleSelect' && (
          <View style={styles.content}>
            <View style={styles.selectedDestRow}>
              <Ionicons name="location" size={18} color="#BA1A1A" />
              <Text style={styles.selectedDestText} numberOfLines={1}>{dropAddress}</Text>
              <TouchableOpacity onPress={() => setBookingStep('input')}>
                <Text style={styles.editBtn}>{i18n.t('ui_edit')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{i18n.t('ui_select_vehicle')}</Text>
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
            {routeInfo && (
              <View style={{ backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, width: '100%', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Outfit-Bold', color: '#181D19', marginBottom: 4 }}>{dropAddress}</Text>
                <Text style={{ fontSize: 14, color: '#6F7A70' }}>{routeInfo.distance} km - {routeInfo.duration} mins</Text>
              </View>
            )}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.pulseIndicator}>
                <Ionicons name="radio" size={48} color="#006A3B" />
              </View>
            </Animated.View>
            <Text style={styles.loadingText}>{i18n.t('ui_searching_for_nearby_drivers')}</Text>
            <Text style={{ fontSize: 13, color: '#3F4941', marginBottom: 8, textAlign: 'center' }}>
              {nearbyByType(selectedVehicle).length
                ? `Offered to ${nearbyByType(selectedVehicle).length} ${selectedVehicle} driver${nearbyByType(selectedVehicle).length > 1 ? 's' : ''} within ${MATCH_RADIUS_KM} km`
                : `No ${selectedVehicle} drivers online near you right now. We'll keep looking for 3 minutes.`}
            </Text>
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
                    {driverRating ? `  •  ★ ${driverRating.avg.toFixed(1)} (${driverRating.n})` : '  •  New driver'}
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
                <Text style={styles.fareLabel}>{i18n.t('ui_estimated_fare')}</Text>
                <Text style={styles.fareAmount}>
                  LKR {activeBooking?.price?.toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.rideSos} onPress={() => navigation.navigate('SOSScreen')} accessibilityLabel="Emergency SOS">
              <Ionicons name="warning" size={16} color="#FFF" />
              <Text style={styles.rideSosText}>SOS</Text>
            </TouchableOpacity>

            {/* Cancel button — with half-way restriction */}
            {canTouristCancel && (
              <TouchableOpacity
                style={styles.cancelRideButton}
                onPress={handleTouristCancel}
              >
                <Ionicons name="close-circle-outline" size={18} color="#BA1A1A" />
                <Text style={styles.cancelRideText}>{i18n.t('ui_cancel_ride')}</Text>
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
        {ratingFor && (
          <View style={styles.rateCard}>
            <Text style={styles.rateTitle}>Trip complete · LKR {Number(ratingFor.fare || 0).toLocaleString()}</Text>
            <Text style={styles.rateSub}>How was your driver?</Text>
            <View style={styles.rateStars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setMyRating(n)} accessibilityLabel={`${n} stars`}>
                  <Ionicons name={n <= myRating ? 'star' : 'star-outline'} size={34} color={n <= myRating ? '#F5A623' : '#B0BEC5'} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button mode="text" onPress={() => setRatingFor(null)}>Skip</Button>
              <Button mode="contained" buttonColor="#006A3B" disabled={!myRating} onPress={async () => {
                const r = ratingFor;
                setRatingFor(null);
                try {
                  await addDoc(collection(db, 'reviews'), {
                    type: 'ride', bookingId: r.id, driverId: r.driverId || null,
                    touristId: auth.currentUser.uid, name: auth.currentUser.displayName || 'Rider',
                    rating: myRating, createdAt: serverTimestamp(),
                  });
                  await updateDoc(doc(db, 'bookings', r.id), { riderRating: myRating });
                } catch (e) {
                  console.log('Rating not saved:', e.message);
                }
              }}>Submit</Button>
            </View>
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  nearbyCar: { backgroundColor: '#1B2B28', borderRadius: 12, padding: 5, borderWidth: 2, borderColor: '#FFF' },
  vEta: { fontSize: 11, color: '#3F4941', marginTop: 2, fontFamily: 'Outfit-Medium' },
  rideSos: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#C62828', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10 },
  rideSosText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 13 },
  rateCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0F2F1' },
  rateTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  rateSub: { fontSize: 13, color: '#3F4941', marginTop: 4 },
  rateStars: { flexDirection: 'row', gap: 6, marginVertical: 10 },
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  mainHeading: {
    fontSize: 28, fontWeight: '800', color: '#181D19',
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    paddingTop: 60, paddingBottom: 12,
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
  suggestionText: { fontSize: 13, color: '#333', flex: 1 },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pickupText: { fontSize: 12, color: '#6B7280' },
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

  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#181D19',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 1000,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5EE',
    gap: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#181D19',
  },
  suggestionSecondary: {
    fontSize: 11,
    color: '#6F7A70',
    marginTop: 2,
  },
  routeInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F5EE',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#181D19',
  },
  routeInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#BECABE',
  },
  pickupMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: '#006A3B',
  },
  destinationMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
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
  driverVehicle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  callDriverButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,106,59,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EBEFE8' },
  fareLabel: { fontSize: 13, color: '#6B7280' },
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
