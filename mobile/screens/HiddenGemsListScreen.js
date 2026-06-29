import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import destinationsData from '../assets/data/ai_destinations.json';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const SafeImage = ({ source, style }) => {
  const [error, setError] = useState(false);
  return (
    <Image 
      source={error ? { uri: 'https://images.unsplash.com/photo-1563290231-155097486e9b' } : source} 
      style={style} 
      onError={() => setError(true)} 
    />
  );
};

export default function HiddenGemsListScreen({ navigation, route }) {
  const filterType = route.params?.filterType || 'hidden';
  const insets = useSafeAreaInsets();
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rating', 'eco'

  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          fetchGems(7.8731, 80.7718); // Default fallback
          return;
        }

        // Fetch immediately once
        let initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        fetchGems(initialLoc.coords.latitude, initialLoc.coords.longitude);

        // Start live tracking
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // Or every 50 meters
          },
          (newLocation) => {
            fetchGems(newLocation.coords.latitude, newLocation.coords.longitude);
          }
        );
      } catch (e) {
        console.error("Location tracking error:", e);
        fetchGems(7.8731, 80.7718);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const fetchGems = (userLat, userLon) => {
    try {
      // Filter based on route params
      let filteredData = destinationsData;
      if (filterType === 'hidden') {
        filteredData = destinationsData.filter(d => d.hidden_gem === true || d.hidden_gem === "True" || d.hidden_gem === "true");
      }

      // Calculate distance
      const withDistance = filteredData.map(gem => {
        const gemLat = parseFloat(gem.lat);
        const gemLon = parseFloat(gem.lon);
        let distance = 9999;
        
        if (!isNaN(gemLat) && !isNaN(gemLon)) {
          distance = parseFloat(getDistance(userLat, userLon, gemLat, gemLon));
        }

        return {
          ...gem,
          distance,
          name: gem.name,
          category: gem.category,
          province: gem.province,
          image: gem.image || 'https://images.unsplash.com/photo-1563290231-155097486e9b',
          ecoScore: Math.round(gem.eco_score || 80),
          rating: parseFloat(gem.avg_rating) || 4.0,
          coords: { latitude: gemLat, longitude: gemLon }
        };
      });

      // Apply sorting
      if (sortBy === 'distance') {
        withDistance.sort((a, b) => a.distance - b.distance);
      } else if (sortBy === 'rating') {
        withDistance.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'eco') {
        withDistance.sort((a, b) => b.ecoScore - a.ecoScore);
      }
      
      setGems(withDistance);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSort = (type) => {
    setSortBy(type);
    const sorted = [...gems];
    if (type === 'distance') {
      sorted.sort((a, b) => a.distance - b.distance);
    } else if (type === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (type === 'eco') {
      sorted.sort((a, b) => b.ecoScore - a.ecoScore);
    }
    setGems(sorted);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      fetchGems(loc.coords.latitude, loc.coords.longitude);
    } catch (e) {
      setRefreshing(false);
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

  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => navigation.navigate('DestinationDetail', { place: item })}
    >
      <Surface style={styles.card} elevation={2}>
        <SafeImage source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)} • {item.province}</Text>
          
          <View style={styles.cardFooterRow}>
            <View style={styles.badgeRow}>
              <View style={styles.ecoBadge}>
                <Text style={styles.ecoText}>ECO-CERTIFIED</Text>
              </View>
            </View>
            <View style={styles.distanceBox}>
              <MaterialCommunityIcons name="map-marker-distance" size={14} color="#00695C" />
              <Text style={styles.distanceText}>{item.distance} km</Text>
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="arrow-left" size={24} iconColor="#333" onPress={() => navigation.goBack()} style={{marginLeft: 0}} />
        <View style={{flex: 1}}>
          <Text style={styles.headerTitle}>{filterType === 'all' ? 'All Destinations Near You' : 'Hidden Gems Near You'}</Text>
          {!loading && <Text style={styles.headerSubtitle}>{gems.length} locations sorted by {sortBy}</Text>}
        </View>
      </View>
      
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, sortBy === 'distance' && styles.filterChipActive]} onPress={() => handleSort('distance')}>
          <Text style={[styles.filterChipText, sortBy === 'distance' && styles.filterChipTextActive]}>Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, sortBy === 'rating' && styles.filterChipActive]} onPress={() => handleSort('rating')}>
          <Text style={[styles.filterChipText, sortBy === 'rating' && styles.filterChipTextActive]}>Rating</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, sortBy === 'eco' && styles.filterChipActive]} onPress={() => handleSort('eco')}>
          <Text style={[styles.filterChipText, sortBy === 'eco' && styles.filterChipTextActive]}>Eco-Score</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00695C" />
          <Text style={styles.loadingText}>Calculating distances...</Text>
        </View>
      ) : (
        <FlatList
          data={gems}
          keyExtractor={(item) => item.destination_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00695C"]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBF9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15, backgroundColor: '#FFF', elevation: 4 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#333' },
  headerSubtitle: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontFamily: 'Outfit-Medium', color: '#666' },
  listContainer: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, marginBottom: 15, padding: 12, alignItems: 'center' },
  cardImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#EEE' },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#222', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#777', marginBottom: 10 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 5 },
  ecoBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ecoText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#2E7D32' },
  distanceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  distanceText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#333' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 10 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  filterChipActive: { backgroundColor: '#00695C' },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  filterChipTextActive: { color: '#FFF' }
});
