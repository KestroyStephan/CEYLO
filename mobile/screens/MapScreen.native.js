import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity, Image, Platform, ScrollView, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/Map';
import * as Location from 'expo-location';
import { IconButton, Text, Surface, Chip, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All Island');
  const sheetAnim = useRef(new Animated.Value(0)).current; // Initially visible
  
  const filters = ['All Island', 'Western', 'Central', 'Southern', 'Northern', 'Eastern'];

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

      fetchNearbyPlaces(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const fetchNearbyPlaces = async (lat, lng) => {
    setLoadingPlaces(true);
    try {
      const query = 'restaurant OR museum OR temple OR church OR botanical garden OR tourist attraction OR hidden gem';
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=5000&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if(data.results) {
        const places = data.results.slice(0, 15).map(p => ({
          id: p.place_id,
          title: p.name,
          type: getPlaceType(p.types || []),
          coords: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng },
          rating: p.rating || (Math.random() * (5 - 4) + 4).toFixed(1), // Random fallback rating
          photo_reference: p.photos ? p.photos[0].photo_reference : null,
          categoryText: (p.types && p.types[0]) ? p.types[0].replace(/_/g, ' ') : 'Destination',
          distance: getDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng)
        }));
        setNearbyPlaces(places);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const getPlaceType = (types) => {
    if(types.includes('restaurant') || types.includes('cafe')) return 'restaurant';
    if(types.includes('museum') || types.includes('hindu_temple') || types.includes('church') || types.includes('place_of_worship')) return 'cultural';
    if(types.includes('park') || types.includes('natural_feature') || types.includes('botanical_garden')) return 'nature';
    return 'gem';
  };

  const getMarkerIcon = (type) => {
    switch(type) {
      case 'cultural': return 'asterisk'; // the red asterisk/flower from the screenshot
      case 'nature': return 'castle'; // the green castle from screenshot
      case 'restaurant': return 'silverware-fork-knife';
      default: return 'map-marker-star';
    }
  };

  const getMarkerColor = (type) => {
    switch(type) {
      case 'cultural': return '#D32F2F'; // Red
      case 'nature': return '#00695C'; // Green
      case 'restaurant': return '#F57C00'; // Orange
      default: return '#7B1FA2'; // Purple
    }
  };

  const getPhotoUrl = (ref) => {
    if (!ref) return 'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a'; // Fallback
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${ref}&key=${GOOGLE_API_KEY}`;
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
        {nearbyPlaces.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coords}
            onPress={() => {
              navigation.navigate('DestinationDetail', { 
                place: {
                  name: marker.title,
                  image: getPhotoUrl(marker.photo_reference),
                  category: marker.categoryText,
                  ecoScore: 85,
                  coords: marker.coords
                }
              });
            }}
          >
            <View style={[styles.customMarker, { backgroundColor: getMarkerColor(marker.type) }]}>
              <MaterialCommunityIcons 
                name={getMarkerIcon(marker.type)} 
                size={16} 
                color="#FFF" 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer ? navigation.openDrawer() : console.log('Menu pressed')}>
          <MaterialCommunityIcons name="menu" size={26} color="#00695C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore Sri Lanka</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <MaterialCommunityIcons name="magnify" size={26} color="#00695C" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterRowContainer, { top: insets.top + 60 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Right Side Floating Buttons */}
      <View style={[styles.rightFloatingStack, { top: insets.top + 120 }]}>
        <TouchableOpacity style={styles.floatingBtnWhite}>
          <MaterialCommunityIcons name="wifi-off" size={22} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtnGold}>
          <MaterialCommunityIcons name="cube-scan" size={22} color="#5C4033" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.floatingBtnWhite}
          onPress={() => location && mapRef.current.animateToRegion({ ...location, latitudeDelta: 0.05, longitudeDelta: 0.05 })}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#00695C" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}>
        
        {/* Floating SOS Button attached to bottom sheet */}
        <TouchableOpacity style={styles.sosButton}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>

        <Surface style={styles.sheetContent} elevation={5}>
          <View style={styles.dragBarContainer}>
            <View style={styles.dragBar} />
          </View>
          
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>Nearby Discoveries</Text>
              <Text style={styles.sheetSubtitle}>
                {loadingPlaces ? "Searching area..." : `Found ${nearbyPlaces.length} locations within 5km`}
              </Text>
            </View>
            <TouchableOpacity style={styles.filterIconBtn}>
              <MaterialCommunityIcons name="tune-vertical" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {loadingPlaces ? (
              <ActivityIndicator size="large" color="#00695C" style={{marginTop: 40}} />
            ) : nearbyPlaces.map(place => (
              <TouchableOpacity 
                key={place.id} 
                style={styles.discoveryCard}
                onPress={() => {
                  navigation.navigate('DestinationDetail', { 
                    place: {
                      name: place.title,
                      image: getPhotoUrl(place.photo_reference),
                      category: place.categoryText,
                      ecoScore: 85,
                      coords: place.coords
                    }
                  });
                }}
              >
                <Image source={{ uri: getPhotoUrl(place.photo_reference) }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{place.title}</Text>
                  <Text style={styles.cardMeta}>
                    <MaterialCommunityIcons name="star-circle-outline" size={12} color="#666" /> {place.rating} • {place.distance} km away
                  </Text>
                  <View style={styles.cardTagRow}>
                    <View style={styles.hiddenGemTag}>
                      <Text style={styles.hiddenGemText}>{place.type === 'gem' ? 'HIDDEN GEM' : 'POPULAR'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {/* Spacer for bottom tab bar */}
            <View style={{height: 100}} />
          </ScrollView>
        </Surface>
      </Animated.View>
    </View>
  );
}

const mapStyle = [
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "labels", "stylers": [{ "visibility": "off" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  map: { ...StyleSheet.absoluteFillObject },
  
  // Header
  header: { position: 'absolute', width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, zIndex: 10 },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#00695C' },

  // Filter Chips
  filterRowContainer: { position: 'absolute', width: '100%', zIndex: 10 },
  filterScroll: { paddingHorizontal: 15, gap: 10 },
  filterChip: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2, height: 36, justifyContent: 'center' },
  activeFilterChip: { backgroundColor: '#00695C', borderColor: '#00695C' },
  filterText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  activeFilterText: { color: '#FFF' },

  // Map Markers
  customMarker: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 4 },
  
  // Floating Buttons Right
  rightFloatingStack: { position: 'absolute', right: 15, gap: 15, zIndex: 10 },
  floatingBtnWhite: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
  floatingBtnGold: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },

  // Bottom Sheet
  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.45, zIndex: 20 },
  sheetContent: { flex: 1, backgroundColor: '#F9FBF9', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  dragBarContainer: { width: '100%', alignItems: 'center', paddingTop: 15, paddingBottom: 10 },
  dragBar: { width: 50, height: 5, backgroundColor: '#D0D0D0', borderRadius: 3 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sheetTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111' },
  sheetSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 2 },
  filterIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EBEBEB', justifyContent: 'center', alignItems: 'center' },
  
  // SOS Button
  sosButton: { position: 'absolute', top: -30, right: 20, width: 66, height: 66, borderRadius: 33, backgroundColor: '#C62828', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#C62828', shadowOpacity: 0.4, shadowRadius: 6, zIndex: 30 },
  sosText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16, letterSpacing: 1 },

  // Cards
  cardsScroll: { paddingHorizontal: 20, gap: 15 },
  discoveryCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, padding: 12, elevation: 2, alignItems: 'center' },
  cardImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#EEE' },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#222', marginBottom: 4 },
  cardMeta: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#777', marginBottom: 8 },
  cardTagRow: { flexDirection: 'row' },
  hiddenGemTag: { borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  hiddenGemText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#777', letterSpacing: 0.5 },
});
