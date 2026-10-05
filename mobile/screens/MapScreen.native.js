import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity, Image, Platform, ScrollView, ActivityIndicator, Modal, Alert, Linking, TextInput } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapViewDirections, LocalTile } from '../components/Map';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { loadRegions, getRegionTilePathTemplate } from '../utils/offlineMapUtils';
import * as Location from 'expo-location';
import { IconButton, Text, Surface, Chip, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ecoScoreFor } from '../utils/destinations';

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;


export default function MapScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All Island');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showTypeFilterModal, setShowTypeFilterModal] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchedPlace, setSearchedPlace] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showDirections, setShowDirections] = useState(false); // Initially visible

  const [offlineRegions, setOfflineRegions] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  const filters = ['All Island', 'Western', 'Central', 'Southern', 'Northern', 'Eastern'];
  const REGION_CENTERS = {
    'All Island': { latitude: 7.8731, longitude: 80.7718, delta: 2.0 },
    Western: { latitude: 6.9271, longitude: 79.8612, delta: 0.4 },
    Central: { latitude: 7.2906, longitude: 80.6337, delta: 0.4 },
    Southern: { latitude: 6.0535, longitude: 80.2210, delta: 0.4 },
    Northern: { latitude: 9.6615, longitude: 80.0255, delta: 0.4 },
    Eastern: { latitude: 7.7310, longitude: 81.6747, delta: 0.4 },
  };

  // Downloaded regions are drawn from local tiles whenever the device is offline
  useFocusEffect(useCallback(() => {
    loadRegions().then(setOfflineRegions).catch(() => {});
  }, []));
  useEffect(() => NetInfo.addEventListener(state => {
    setIsOffline(!state.isConnected || state.isInternetReachable === false);
  }), []);

  const selectRegion = (filter) => {
    setActiveFilter(filter);
    const center = REGION_CENTERS[filter];
    mapRef.current?.animateToRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: center.delta,
      longitudeDelta: center.delta,
    }, 800);
    if (filter === 'All Island') {
      if (location) fetchNearbyPlaces(location.latitude, location.longitude);
    } else {
      fetchNearbyPlaces(center.latitude, center.longitude, 30000);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'CEYLO needs your location to show nearby places on the map. Please enable location in Settings ? Apps ? CEYLO ? Permissions ? Location.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
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
      } catch (error) {
        console.error('Location error in Map:', error);
        Alert.alert(
          'Location Error',
          'Could not get your location. Please check your GPS is turned on.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const searchPlace = async (query) => {
    if (!query || query.trim().length < 2) return;

    setIsSearchLoading(true);

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

      const searchQueryText = query.includes('Sri Lanka') ? query : `${query}, Sri Lanka`;
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQueryText)}&key=${apiKey}&region=lk&language=en`;

      const response = await fetch(textSearchUrl);
      const data = await response.json();

      console.log('=== MAP SEARCH DEBUG ===');
      console.log('Query:', query); // Using 'query' instead of 'searchQuery' to avoid stale state in closure
      console.log('URL:', textSearchUrl);
      console.log('Response status:', data.status);
      console.log('Error message:', data.error_message || 'none');
      console.log('Results count:', data.results?.length || 0);
      console.log('========================');

      if (data.status === 'OK' && data.results?.length > 0) {
        const place = data.results[0];
        const loc = place.geometry.location;
        const coords = { latitude: loc.lat, longitude: loc.lng };

        if (mapRef?.current) {
          mapRef.current.animateToRegion({
            latitude: loc.lat,
            longitude: loc.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }

        setSearchResult({
          coords: coords,
          name: place.name,
          address: place.formatted_address,
          rating: place.rating,
        });

        if (location) {
          const R = 6371;
          const dLat = (loc.lat - location.latitude) * Math.PI / 180;
          const dLon = (loc.lng - location.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(location.latitude * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distanceKm = R * c;

          setSearchResult(prev => ({
            ...prev,
            distance: distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m away` : `${distanceKm.toFixed(1)}km away`,
          }));
        }

      } else if (data.status === 'ZERO_RESULTS') {
        Alert.alert('Place Not Found', `Could not find "${query}" in Sri Lanka. Try a more specific name like "Colombo Fort" or "Kandy Lake".`, [{ text: 'OK' }]);
      } else if (data.status === 'REQUEST_DENIED') {
        Alert.alert('Search Error', 'Places API request was denied. Please check the API key configuration.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Search Error', 'Search failed. Please check your connection and try again.', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Map search error:', error);
      Alert.alert('Connection Error', 'Could not connect to search service. Please check your internet connection.', [{ text: 'OK' }]);
    } finally {
      setIsSearchLoading(false);
    }
  };

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

  const fetchNearbyPlaces = async (lat, lng, radius = 5000) => {
    setLoadingPlaces(true);
    try {
      const query = 'restaurant OR museum OR temple OR church OR botanical garden OR tourist attraction OR hidden gem';
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radius}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if(data.results) {
        const places = data.results.slice(0, 15).map(p => ({
          id: p.place_id,
          title: p.name,
          type: getPlaceType(p.types || []),
          coords: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng },
          rating: p.rating || null,
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
        mapType={isOffline && offlineRegions.length > 0 ? 'none' : 'standard'}
      >
        {isOffline && offlineRegions.map(region => (
          <LocalTile key={region.id} pathTemplate={getRegionTilePathTemplate(region.id)} tileSize={256} zIndex={-1} />
        ))}
        {nearbyPlaces.filter(p => typeFilter === 'All' || p.type === typeFilter).map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coords}
            onPress={() => {
              navigation.navigate('DestinationDetail', {
                place: {
                  name: marker.title,
                  image: getPhotoUrl(marker.photo_reference),
                  category: marker.categoryText,
                  ecoScore: ecoScoreFor(marker.title),
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
        {searchedPlace && (
          <Marker coordinate={searchedPlace.coords} title={searchedPlace.title}>
            <View style={[styles.customMarker, { backgroundColor: '#00695C', width: 40, height: 40, borderRadius: 20 }]}>
              <MaterialCommunityIcons name="star" size={24} color="#FFF" />
            </View>
          </Marker>
        )}
        {showDirections && searchedPlace && location && (
          <MapViewDirections
            origin={{ latitude: location.latitude, longitude: location.longitude }}
            destination={searchedPlace.coords}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor="#00695C"
            onReady={(result) => {
              setRouteInfo({
                distance: (result.distance).toFixed(1),
                duration: Math.ceil(result.duration)
              });
              mapRef.current.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 150, right: 50, bottom: height * 0.45 + 20, left: 50 },
                animated: true,
              });
            }}
          />
        )}

        {searchResult?.coords && (
          <Marker
            coordinate={searchResult.coords}
            title={searchResult.name}
            description={searchResult.address}
          >
            <View style={styles.searchMarker}>
              <Ionicons name="location" size={24} color="#BA1A1A" />
            </View>
          </Marker>
        )}
      </MapView>

      {searchResult && (
        <View style={styles.searchResultCard}>
          <View style={styles.searchResultHeader}>
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultName} numberOfLines={1}>
                {searchResult.name}
              </Text>
              <Text style={styles.searchResultAddress} numberOfLines={2}>
                {searchResult.address}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearResultButton}
              onPress={() => setSearchResult(null)}
            >
              <Ionicons name="close" size={20} color="#6F7A70" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchResultStats}>
            {searchResult.distance && (
              <View style={styles.searchStat}>
                <Ionicons name="navigate-outline" size={14} color="#006A3B" />
                <Text style={styles.searchStatText}>
                  {searchResult.distance}
                </Text>
              </View>
            )}
            {searchResult.rating && (
              <View style={styles.searchStat}>
                <Ionicons name="star" size={14} color="#735C00" />
                <Text style={styles.searchStatText}>
                  {searchResult.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Top Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        {!isSearching ? (
          <>
            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer ? navigation.openDrawer() : console.log('Menu pressed')}>
              <MaterialCommunityIcons name="menu" size={26} color="#00695C" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Explore Sri Lanka</Text>
            <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearching(true)}>
              <MaterialCommunityIcons name="magnify" size={26} color="#00695C" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, flex: 1, paddingHorizontal: 10, elevation: 4 }}>
            <MaterialCommunityIcons name="magnify" size={22} color="#00695C" />
            <TextInput
              style={{ flex: 1, height: 40, paddingHorizontal: 10, fontFamily: 'Outfit-Regular', color: '#333' }}
              placeholder="Search destination..."
              placeholderTextColor="#999"
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => searchPlace(searchQuery)}
              returnKeyType="search"
            />

            <TouchableOpacity
              style={{ paddingHorizontal: 8 }}
              onPress={() => searchPlace(searchQuery)}
              disabled={isSearchLoading}
            >
              {isSearchLoading
                ? <ActivityIndicator size="small" color="#006A3B" />
                : <Ionicons name="search" size={20} color="#006A3B" />
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setIsSearching(false);
              setSearchQuery('');
              setSearchResult(null);
              setShowDirections(false);
            }}>
              <MaterialCommunityIcons name="close-circle" size={22} color="#999" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterRowContainer, { top: insets.top + 60 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => selectRegion(filter)}
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
        <TouchableOpacity style={styles.floatingBtnWhite} onPress={() => navigation.navigate('OfflineMapSettings')}>
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
            <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowTypeFilterModal(true)}>
              <MaterialCommunityIcons name="tune-vertical" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {searchedPlace && (
              <View style={[styles.discoveryCard, { borderColor: '#00695C', borderWidth: 2 }]}>
                <View style={[styles.cardImage, { backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={40} color="#00695C" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{searchedPlace.title}</Text>
                  {searchedPlace.address && <Text style={{fontSize: 11, color: '#555', marginBottom: 4}} numberOfLines={2}>{searchedPlace.address}</Text>}
                  <Text style={styles.cardMeta}>
                    {searchedPlace.rating ? <><MaterialCommunityIcons name="star-circle-outline" size={12} color="#666" /> {searchedPlace.rating} - </> : null}
                    {searchedPlace.distance} km away
                  </Text>

                  {showDirections && routeInfo ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4}}>
                      <Text style={{fontSize: 12, fontFamily: 'Outfit-Bold', color: '#00695C'}}>{routeInfo.duration} mins</Text>
                      <TouchableOpacity style={{backgroundColor: '#FFE0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}} onPress={() => setShowDirections(false)}>
                        <Text style={{color: '#D32F2F', fontSize: 11, fontFamily: 'Outfit-Bold'}}>Clear Route</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{backgroundColor: '#00695C', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 4}}
                      onPress={() => setShowDirections(true)}
                    >
                      <Text style={{color: '#FFF', fontSize: 11, fontFamily: 'Outfit-Bold'}}>Get Directions</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            {loadingPlaces ? (
              <ActivityIndicator size="large" color="#00695C" style={{marginTop: 40}} />
            ) : nearbyPlaces.filter(p => typeFilter === 'All' || p.type === typeFilter).map(place => (
              <TouchableOpacity
                key={place.id}
                style={styles.discoveryCard}
                onPress={() => {
                  navigation.navigate('DestinationDetail', {
                    place: {
                      name: place.title,
                      image: getPhotoUrl(place.photo_reference),
                      category: place.categoryText,
                      ecoScore: ecoScoreFor(place.title),
                      coords: place.coords
                    }
                  });
                }}
              >
                <Image source={{ uri: getPhotoUrl(place.photo_reference) }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{place.title}</Text>
                  <Text style={styles.cardMeta}>
                    <MaterialCommunityIcons name="star-circle-outline" size={12} color="#666" /> {place.rating ? `${place.rating} • ` : ''}{place.distance} km away
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

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilterModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeFilterModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Type</Text>

            {['All', 'cultural', 'nature', 'restaurant', 'gem'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.modalOption, typeFilter === type && styles.modalOptionActive]}
                onPress={() => {
                  setTypeFilter(type);
                  setShowTypeFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, typeFilter === type && styles.modalOptionTextActive]}>
                  {type === 'All' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                {typeFilter === type && <MaterialCommunityIcons name="check" size={20} color="#00695C" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const mapStyle = [
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "labels", "stylers": [{ "visibility": "off" }] }
];

const styles = StyleSheet.create({
  searchMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchResultCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#181D19',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  searchResultInfo: { flex: 1, marginRight: 8 },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181D19',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 12,
    color: '#6F7A70',
    lineHeight: 16,
  },
  clearResultButton: {
    padding: 4,
  },
  searchResultStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EBEFE8',
  },
  searchStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#181D19',
  },
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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 15 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionActive: { backgroundColor: '#F0F8F7' },
  modalOptionText: { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#555' },
  modalOptionTextActive: { color: '#00695C', fontFamily: 'Outfit-Bold' },
});
