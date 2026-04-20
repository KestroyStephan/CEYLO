import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity, Image, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { IconButton, Text, Surface, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const sheetAnim = useRef(new Animated.Value(height)).current;
  
  const [markers] = useState([
    { id: 1, title: 'Sigiriya Rock', type: 'cultural', coords: { latitude: 7.9570, longitude: 80.7603 }, ecoScore: 85 },
    { id: 2, title: 'Sinharaja Forest', type: 'eco', coords: { latitude: 6.3889, longitude: 80.5000 }, ecoScore: 98 },
    { id: 3, title: 'Diyaluma Falls', type: 'gem', coords: { latitude: 6.7214, longitude: 81.0286 }, ecoScore: 92 },
    { id: 4, title: 'Local Tea Shop', type: 'vendor', coords: { latitude: 6.9497, longitude: 80.7891 }, ecoScore: 70 },
  ]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    })();
  }, []);

  const getMarkerColor = (type) => {
    switch (type) {
      case 'eco': return '#4CAF50';
      case 'cultural': return '#FFB300';
      case 'gem': return '#9C27B0';
      case 'vendor': return '#F44336';
      default: return '#00695C';
    }
  };

  const handleMarkerPress = (marker) => {
    setSelectedPlace(marker);
    setShowDetails(true);
    Animated.spring(sheetAnim, {
      toValue: height - 350,
      useNativeDriver: true,
    }).start();
  };

  const closeDetails = () => {
    setShowDetails(false);
    Animated.spring(sheetAnim, {
      toValue: height,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 7.8731,
          longitude: 80.7718,
          latitudeDelta: 2.0,
          longitudeDelta: 2.0,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard"
        customMapStyle={mapStyle}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coords}
            onPress={() => handleMarkerPress(marker)}
          >
            <View style={[styles.customMarker, { backgroundColor: getMarkerColor(marker.type) }]}>
              <MaterialCommunityIcons 
                name={marker.type === 'eco' ? 'leaf' : marker.type === 'cultural' ? 'castle' : marker.type === 'gem' ? 'diamond-stone' : 'store'} 
                size={18} 
                color="#FFF" 
              />
            </View>
          </Marker>
        ))}

        {selectedPlace && location && (
          <MapViewDirections
            origin={location}
            destination={selectedPlace.coords}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor="#00695C"
          />
        )}
      </MapView>

      <View style={[styles.searchBox, { top: insets.top + 10 }]}>
        <GooglePlacesAutocomplete
          placeholder="Where to explore?"
          onPress={(data, details = null) => {
            const coords = {
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
            };
            mapRef.current.animateToRegion({
              ...coords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }}
          query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:lk' }}
          styles={searchStyles}
          fetchDetails
          enablePoweredByContainer={false}
          leftButton={<IconButton icon="menu" onPress={() => navigation.openDrawer()} />}
        />
      </View>

      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
        <Surface style={styles.sheetContent} elevation={5}>
          <View style={styles.sheetHeader}>
            <View style={styles.dragBar} />
          </View>
          
          {selectedPlace && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeTitle}>{selectedPlace.title}</Text>
                  <Text style={styles.placeType}>{selectedPlace.type.toUpperCase()}</Text>
                </View>
                <Surface style={styles.ecoBadge} elevation={1}>
                  <Text style={styles.ecoScore}>{selectedPlace.ecoScore}</Text>
                  <Text style={styles.ecoLabel}>ECO</Text>
                </Surface>
              </View>

              <View style={styles.statsRow}>
                <Chip icon="clock-outline" style={styles.chip}>Open Now</Chip>
                <Chip icon="account-group" style={styles.chip}>Low Crowd</Chip>
              </View>

              <View style={styles.buttonRow}>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('DestinationDetail', { place: selectedPlace })}
                  style={styles.mainBtn}
                  buttonColor="#00695C"
                >
                  View Details
                </Button>
                <IconButton 
                  icon="navigation-variant" 
                  mode="contained" 
                  containerColor="#E0F2F1" 
                  iconColor="#00695C"
                  size={28}
                  onPress={() => {}}
                />
              </View>
            </View>
          )}
          <IconButton icon="close" style={styles.closeBtn} onPress={closeDetails} />
        </Surface>
      </Animated.View>

      <TouchableOpacity 
        style={[styles.myLocationBtn, { bottom: showDetails ? 370 : 100 }]} 
        onPress={() => location && mapRef.current.animateToRegion({ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 })}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#00695C" />
      </TouchableOpacity>
    </View>
  );
}

const mapStyle = [
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] }
];

const searchStyles = {
  container: { flex: 0, backgroundColor: 'transparent' },
  textInputContainer: { backgroundColor: 'transparent', borderTopWidth: 0, borderBottomWidth: 0 },
  textInput: {
    backgroundColor: '#FFF',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  listView: { backgroundColor: '#FFF', borderRadius: 15, marginTop: 5, elevation: 4 },
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  searchBox: { position: 'absolute', width: '90%', alignSelf: 'center', zIndex: 1 },
  customMarker: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: height, zIndex: 2 },
  sheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: 400 },
  sheetHeader: { alignItems: 'center', marginBottom: 20 },
  dragBar: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  detailsContainer: { gap: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placeTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#333' },
  placeType: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#666', letterSpacing: 1 },
  ecoBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', borderWeight: 2, borderColor: '#4CAF50' },
  ecoScore: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  ecoLabel: { fontSize: 8, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  statsRow: { flexDirection: 'row', gap: 10 },
  chip: { backgroundColor: '#F5F5F5' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  mainBtn: { flex: 1, borderRadius: 15, paddingVertical: 5 },
  closeBtn: { position: 'absolute', top: 10, right: 10 },
  myLocationBtn: { position: 'absolute', right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
