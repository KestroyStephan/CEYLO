import React, { useState, useEffect, useRef, useCallback } from 'react';
import i18n from '../i18n';
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
import destinationsData from '../assets/data/ai_destinations.json';
import { distanceKm } from '../services/ItineraryService';
import ProgressiveImage from '../components/ProgressiveImage';
import SosButton from '../components/SosButton';
import { MAPS_API_KEY } from '../config';

// Real attractions from the CEYLO dataset (Wikidata places, Wikipedia photos, Google ratings)
const PLACES = destinationsData.map(d => ({
  ...d,
  lat: parseFloat(d.lat),
  lon: parseFloat(d.lon),
  rating: parseFloat(d.avg_rating) || null,
  isHidden: String(d.hidden_gem) === 'true',
  // Review-weighted rating, so a 5.0 from two reviews does not outrank a 4.7 from twenty thousand
  score: ((Number(d.google_reviews) || 0) * (parseFloat(d.avg_rating) || 4.4) + 50 * 4.4) / ((Number(d.google_reviews) || 0) + 50),
}));
const TYPE_OF = {
  'Heritage & Culture': 'cultural',
  'Nature & Viewpoint': 'nature',
  Waterfall: 'nature',
  Wildlife: 'wildlife',
  Beach: 'beach',
};
const TYPE_LABELS = { All: 'All types', cultural: 'Heritage & culture', nature: 'Nature & waterfalls', wildlife: 'Wildlife', beach: 'Beaches', gem: 'Hidden gems' };
const NEARBY_KM = 25;
const PROVINCES = ['Western', 'Central', 'Southern', 'North Central', 'Northern', 'Eastern', 'Uva', 'Sabaragamuwa', 'North Western'];
// Centre of each province's places, so a province chip frames its attractions
const PROVINCE_CENTERS = Object.fromEntries(PROVINCES.map(name => {
  const list = PLACES.filter(d => d.province === `${name} Province`);
  const lats = list.map(d => d.lat);
  const lons = list.map(d => d.lon);
  const delta = Math.max(0.3, Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons)) * 1.15;
  return [name, { latitude: (Math.max(...lats) + Math.min(...lats)) / 2, longitude: (Math.max(...lons) + Math.min(...lons)) / 2, delta }];
}));

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = MAPS_API_KEY;


export default function MapScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [listLabel, setListLabel] = useState('');
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

  const filters = ['All Island', ...PROVINCES];
  const REGION_CENTERS = {
    'All Island': { latitude: 7.8731, longitude: 80.7718, delta: 3.2 },
    ...PROVINCE_CENTERS,
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
    loadPlaces(location, filter === 'All Island' ? null : filter);
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          loadPlaces(null);
          setLoadingPlaces(false);
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
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          });
        }

        loadPlaces(loc.coords);
      } catch (error) {
        console.error('Location error in Map:', error);
        loadPlaces(null);
        Alert.alert(
          'Location Error',
          'Could not get your location. Please check your GPS is turned on.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoadingPlaces(false);
      }
    })();
  }, []);

  const searchPlace = async (query) => {
    if (!query || query.trim().length < 2) return;

    const q = query.trim().toLowerCase();
    const known = PLACES.find(d => d.name.toLowerCase() === q) || PLACES.find(d => d.name.toLowerCase().includes(q));
    if (known) {
      mapRef.current?.animateToRegion({ latitude: known.lat, longitude: known.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
      setSearchResult({
        coords: { latitude: known.lat, longitude: known.lon },
        name: known.name,
        address: `${known.category} · ${known.province}`,
        rating: known.rating,
        place: { ...known, id: known.destination_id, title: known.name, coords: { latitude: known.lat, longitude: known.lon } },
        distance: location ? `${distanceKm(location.latitude, location.longitude, known.lat, known.lon).toFixed(1)}km away` : undefined,
      });
      return;
    }

    setIsSearchLoading(true);

    try {
      const apiKey = MAPS_API_KEY;

      const searchQueryText = query.includes('Sri Lanka') ? query : `${query}, Sri Lanka`;
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQueryText)}&key=${apiKey}&region=lk&language=en`;

      const response = await fetch(textSearchUrl);
      const data = await response.json();

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

  // Attractions near the traveller, or the best-rated ones in a province
  const loadPlaces = (pos, province = null) => {
    const withDist = PLACES.map(d => ({
      ...d,
      id: d.destination_id,
      title: d.name,
      type: TYPE_OF[d.category] || 'cultural',
      coords: { latitude: d.lat, longitude: d.lon },
      distance: pos ? distanceKm(pos.latitude, pos.longitude, d.lat, d.lon) : null,
    }));
    let list;
    if (province) {
      list = withDist.filter(d => d.province === `${province} Province`)
        .sort((a, b) => b.score - a.score);
      setListLabel(`${list.length} places in ${province} Province`);
    } else if (pos) {
      const sorted = withDist.sort((a, b) => a.distance - b.distance);
      list = sorted.filter(d => d.distance <= NEARBY_KM);
      if (list.length < 5) {
        list = sorted.slice(0, 10);
        setListLabel('Nearest places to you');
      } else {
        setListLabel(`${list.length} places within ${NEARBY_KM} km`);
      }
    } else {
      list = withDist.sort((a, b) => b.score - a.score).slice(0, 30);
      setListLabel('Top rated across Sri Lanka');
    }
    setNearbyPlaces(list);
  };

  const matchesType = (p) => typeFilter === 'All' || (typeFilter === 'gem' ? p.isHidden : p.type === typeFilter);

  const openPlace = (p) => navigation.navigate('DestinationDetail', {
    place: { ...p, name: p.name, ecoScore: p.eco_score != null ? Math.round(p.eco_score) : null, coords: p.coords },
  });

  const getMarkerIcon = (type) => {
    switch(type) {
      case 'cultural': return 'temple-buddhist';
      case 'nature': return 'pine-tree';
      case 'wildlife': return 'paw';
      case 'beach': return 'beach';
      default: return 'map-marker-star';
    }
  };

  const getMarkerColor = (type) => {
    switch(type) {
      case 'cultural': return '#B23A2E';
      case 'nature': return '#00695C';
      case 'wildlife': return '#8D6E00';
      case 'beach': return '#0277BD';
      default: return '#6A1B9A';
    }
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
        {nearbyPlaces.filter(matchesType).map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coords}
            title={marker.title}
            description={marker.rating ? `★ ${marker.rating} · ${marker.category}` : marker.category}
            onCalloutPress={() => openPlace(marker)}
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

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {searchResult.place && (
              <TouchableOpacity onPress={() => openPlace(searchResult.place)} style={styles.searchOpen}>
                <Text style={styles.searchOpenText}>View place</Text>
              </TouchableOpacity>
            )}
            {location && (
              <TouchableOpacity
                style={[styles.searchOpen, { backgroundColor: '#E0F2F1' }]}
                onPress={() => {
                  setSearchedPlace({ title: searchResult.name, address: searchResult.address, rating: searchResult.rating, coords: searchResult.coords, distance: (searchResult.distance || '').replace('km away', '') });
                  setShowDirections(true);
                  setSearchResult(null);
                }}
              >
                <Text style={[styles.searchOpenText, { color: '#00695C' }]}>{i18n.t('ui_get_directions')}</Text>
              </TouchableOpacity>
            )}
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
                  {Number(searchResult.rating).toFixed(1)}
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
            <View style={styles.menuBtn}>
              <MaterialCommunityIcons name="compass-outline" size={24} color="#00695C" />
            </View>
            <Text style={styles.headerTitle}>{i18n.t('ui_explore_sri_lanka')}</Text>
            <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearching(true)}>
              <MaterialCommunityIcons name="magnify" size={26} color="#00695C" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 10 }}>
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
      <View style={[styles.filterRowContainer, { top: insets.top + 68 }]}>
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
      <View style={[styles.rightFloatingStack, { top: insets.top + 124 }]}>
        <TouchableOpacity style={styles.floatingBtnWhite} onPress={() => navigation.navigate('OfflineMapSettings')}>
          <MaterialCommunityIcons name="wifi-off" size={22} color="#333" />
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
        <SosButton style={styles.sosDock} onPress={() => navigation.navigate('SOSScreen')} />

        <Surface style={styles.sheetContent} elevation={5}>
          <View style={styles.dragBarContainer}>
            <View style={styles.dragBar} />
          </View>

          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>{i18n.t('ui_nearby_discoveries')}</Text>
              <Text style={styles.sheetSubtitle}>
                {loadingPlaces ? 'Finding places near you…' : listLabel}
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
                        <Text style={{color: '#D32F2F', fontSize: 11, fontFamily: 'Outfit-Bold'}}>{i18n.t('ui_clear_route')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{backgroundColor: '#00695C', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 4}}
                      onPress={() => setShowDirections(true)}
                    >
                      <Text style={{color: '#FFF', fontSize: 11, fontFamily: 'Outfit-Bold'}}>{i18n.t('ui_get_directions')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            {loadingPlaces ? (
              <ActivityIndicator size="large" color="#00695C" style={{marginTop: 40}} />
            ) : nearbyPlaces.filter(matchesType).map(place => (
              <TouchableOpacity
                key={place.id}
                style={styles.discoveryCard}
                onPress={() => openPlace(place)}
                onLongPress={() => mapRef.current?.animateToRegion({ ...place.coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600)}
              >
                <ProgressiveImage source={{ uri: place.image }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{place.title}</Text>
                  <Text style={styles.cardMeta}>
                    {place.rating ? `★ ${place.rating}` : place.category}
                    {place.distance != null ? ` • ${place.distance.toFixed(1)} km away` : ` • ${place.province.replace(' Province', '')}`}
                  </Text>
                  <View style={styles.cardTagRow}>
                    <View style={styles.hiddenGemTag}>
                      <Text style={styles.hiddenGemText}>{place.isHidden ? 'HIDDEN GEM' : place.category.toUpperCase()}</Text>
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
            <Text style={styles.modalTitle}>{i18n.t('ui_filter_by_type')}</Text>

            {Object.keys(TYPE_LABELS).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.modalOption, typeFilter === type && styles.modalOptionActive]}
                onPress={() => {
                  setTypeFilter(type);
                  setShowTypeFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, typeFilter === type && styles.modalOptionTextActive]}>
                  {TYPE_LABELS[type]}
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
  header: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.96)', elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, zIndex: 10 },
  searchOpen: { alignSelf: 'flex-start', backgroundColor: '#00695C', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginTop: 10 },
  searchOpenText: { color: '#FFF', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
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
  sosDock: { top: -24, bottom: undefined, zIndex: 30 },
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
