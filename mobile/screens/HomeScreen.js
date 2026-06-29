import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, ImageBackground } from 'react-native';
import { Text, Surface, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Import AI Generated Datasets
import destinationsData from '../assets/data/ai_destinations.json';
import eventsData from '../assets/data/ai_events.json';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState('Traveler');
  const [refreshing, setRefreshing] = useState(false);
  
  // Dynamic State
  const [aiPicks, setAIPicks] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [loadingGems, setLoadingGems] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    }
    loadAIData();
    fetchRealNearbyGems();
  }, []);
  
  const loadAIData = () => {
    // Hidden Gems Fallback
    const hidden = destinationsData.filter(d => d.hidden_gem === true || d.hidden_gem === "True" || d.hidden_gem === "true");
    const shuffledHidden = hidden.sort(() => 0.5 - Math.random());
    setHiddenGems(shuffledHidden.slice(0, 3));
    
    // AI Picks Fallback (Overwritten by fetchRealNearbyGems if location granted)
    const famous = destinationsData.filter(d => (d.hidden_gem === false || d.hidden_gem === "False") && parseFloat(d.avg_rating) >= 4.5);
    const sortedEco = famous.sort((a, b) => b.eco_score - a.eco_score);
    setAIPicks(sortedEco.slice(0, 5));
    
    // Random Event
    if (eventsData && eventsData.length > 0) {
      const randEvent = eventsData[Math.floor(Math.random() * eventsData.length)];
      setFeaturedEvent(randEvent);
    }
  };

  const fetchRealNearbyGems = async () => {
    try {
      setLoadingGems(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // Update AI Picks by calculating distance for famous places (Heritage, Nature, etc)
      const aiQuery = 'popular tourist attraction OR heritage site OR famous landmark';
      const aiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(aiQuery)}&location=${lat},${lng}&radius=20000&key=${GOOGLE_API_KEY}`;
      const aiRes = await fetch(aiUrl);
      const aiData = await aiRes.json();
      
      if(aiData.results && aiData.results.length > 0) {
        const places = aiData.results.slice(0, 5).map(p => {
          let dist = 9999;
          if (p.geometry && p.geometry.location) {
             const R = 6371; 
             const dLatRad = (p.geometry.location.lat - lat) * Math.PI / 180;
             const dLonRad = (p.geometry.location.lng - lng) * Math.PI / 180;
             const a = Math.sin(dLatRad/2) * Math.sin(dLatRad/2) + Math.cos(lat * Math.PI / 180) * Math.cos(p.geometry.location.lat * Math.PI / 180) * Math.sin(dLonRad/2) * Math.sin(dLonRad/2);
             const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             dist = R * c;
          }
          return {
            destination_id: p.place_id,
            name: p.name,
            category: (p.types && p.types[0]) ? p.types[0].replace(/_/g, ' ') : 'Heritage',
            province: 'Nearby',
            eco_score: 85 + Math.random() * 10,
            image: p.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null,
            dist: dist,
            coords: { latitude: p.geometry?.location?.lat, longitude: p.geometry?.location?.lng }
          };
        });
        places.sort((a, b) => a.dist - b.dist);
        setAIPicks(places);
      }
      
      const query = 'waterfall OR nature reserve OR beach OR viewpoint OR hidden gem';
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=15000&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if(data.results && data.results.length > 0) {
        const places = data.results.slice(0, 3).map(p => ({
          destination_id: p.place_id,
          name: p.name,
          category: (p.types && p.types[0]) ? p.types[0].replace(/_/g, ' ') : 'Nature',
          province: 'Nearby',
          eco_score: 85,
          image: p.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null,
          description: `A beautiful spot located near your current location.`,
          coords: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng }
        }));
        setHiddenGems(places);
      }
    } catch (e) {
      console.warn("Failed to fetch real nearby gems", e);
    } finally {
      setLoadingGems(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadAIData();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity>
        <Feather name="menu" size={24} color="#004D40" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Explore Sri Lanka</Text>
      <TouchableOpacity>
        <Feather name="search" size={24} color="#004D40" />
      </TouchableOpacity>
    </View>
  );

  const WelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <View>
        <Text style={styles.greeting}>WELCOME BACK,</Text>
        <Text style={styles.name}>{userName}!</Text>
      </View>
      <Surface style={styles.weatherCard} elevation={0}>
        <View>
          <Text style={styles.weatherTemp}>29°C</Text>
          <Text style={styles.weatherDesc}>Sunny • Colombo</Text>
        </View>
        <Feather name="sun" size={24} color="#D97706" style={styles.weatherIcon} />
      </Surface>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Transport')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#E0F2F1' }]}>
          <MaterialCommunityIcons name="bus" size={24} color="#00695C" />
        </View>
        <Text style={styles.actionText}>Transport</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Chatbot')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#E0F7FA' }]}>
          <MaterialCommunityIcons name="map-marker-path" size={24} color="#00838F" />
        </View>
        <Text style={styles.actionText}>Guides</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('SOSScreen')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#FFEBEE' }]}>
          <MaterialCommunityIcons name="asterisk" size={24} color="#D32F2F" />
        </View>
        <Text style={styles.actionText}>Emergency</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('OfflineMapSettings')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#EFEBE9' }]}>
          <MaterialCommunityIcons name="map-outline" size={24} color="#5D4037" />
        </View>
        <Text style={styles.actionText}>Offline</Text>
      </TouchableOpacity>
    </View>
  );

  const AIPicks = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Picks For You</Text>
        <TouchableOpacity style={styles.seeAllRow} onPress={() => navigation.navigate('HiddenGemsList', { filterType: 'all' })}>
          <Text style={styles.seeAll}>See All</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#00695C" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {aiPicks.map((item) => (
          <TouchableOpacity 
            key={item.destination_id} 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('DestinationDetail', { 
              place: { 
                ...item,
                name: item.name, 
                image: item.image || 'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a',
                ecoScore: Math.round(item.eco_score || 80),
                description: item.description || `Explore ${item.name} in ${item.province} Province.`
              } 
            })}
          >
            <Card style={styles.pickCard}>
            <View style={styles.pickImageContainer}>
              <Image source={{ uri: item.image || 'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a' }} style={styles.pickImage} />
              <View style={styles.ecoBadge}>
                <Text style={styles.ecoBadgeText}>{Math.round(item.eco_score)}</Text>
              </View>
            </View>
            <Card.Content style={styles.pickContent}>
              <Text style={styles.pickName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#00695C" />
                <Text style={styles.locationText}>{item.dist ? `${item.dist.toFixed(1)} km • ` : ''}{item.province.replace(' Province', '')}</Text>
              </View>
            </Card.Content>
          </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const HiddenGems = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Hidden Gems Near You</Text>
        <TouchableOpacity onPress={() => navigation.navigate('HiddenGemsList')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      {loadingGems ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit-Regular', color: '#666' }}>Finding real gems near you...</Text>
        </View>
      ) : hiddenGems.map((gem) => (
        <TouchableOpacity 
          key={gem.destination_id} 
          activeOpacity={0.8} 
          style={{ marginBottom: 10 }}
          onPress={() => navigation.navigate('DestinationDetail', { 
              place: { 
                ...gem,
                name: gem.name, 
                image: gem.image || 'https://images.unsplash.com/photo-1563290231-155097486e9b',
                ecoScore: Math.round(gem.eco_score || 80),
                description: gem.description || `Discover the hidden beauty of ${gem.name}.`
              } 
          })}
        >
          <Surface style={styles.gemCard} elevation={0}>
            <Image source={{ uri: gem.image || 'https://images.unsplash.com/photo-1563290231-155097486e9b' }} style={styles.gemImage} />
            <View style={styles.gemContent}>
              <Text style={styles.gemTitle} numberOfLines={1}>{gem.name}</Text>
              <Text style={styles.gemSubtitle} numberOfLines={1}>{gem.category} • {gem.province}</Text>
              <View style={styles.ecoCertifiedBadge}>
                <Text style={styles.ecoCertifiedText}>ECO-CERTIFIED</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </Surface>
        </TouchableOpacity>
      ))}
    </View>
  );

  const CulturalEvents = () => {
    if (!featuredEvent) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cultural Events</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('CulturalEvents')}>
          <Surface style={styles.eventCard} elevation={0}>
            <View style={styles.eventOverlay}>
              <View style={styles.eventTag}>
                <Text style={styles.tagText}>{featuredEvent.month}</Text>
              </View>
              <Text style={styles.eventTitle}>{featuredEvent.name}</Text>
              <Text style={styles.eventDesc} numberOfLines={2}>{featuredEvent.location} - {featuredEvent.category}</Text>
              <TouchableOpacity style={styles.remindBtn}>
                <Text style={styles.remindBtnText}>Remind Me</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </TouchableOpacity>
      </View>
    );
  };

  const TrendingRoutes = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Routes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transport')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ItineraryDetail')}>
          <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} style={styles.routeCard} imageStyle={{ borderRadius: 16 }}>
            <LinearGradient colors={['transparent', 'rgba(0,105,92,0.8)']} style={styles.routeOverlay}>
              <Text style={styles.routeTitle}>Tea Country{'\n'}Trail</Text>
              <Text style={styles.routeSubtitle}>3 Days • Nuwara Eliya</Text>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ItineraryDetail')}>
          <Surface style={[styles.routeCardSolid, { backgroundColor: '#E8EBE6' }]} elevation={0}>
            <Text style={styles.routeSolidTitle}>ANCIENT CITIES</Text>
            <Text style={styles.routeSolidSubtitle}>Anuradhapura Loop</Text>
          </Surface>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00695C']} />}
        contentContainerStyle={{ paddingBottom: 100 }} // padding for FAB
      >
        <Header />
        <WelcomeSection />
        <QuickActions />
        <AIPicks />
        <HiddenGems />
        <CulturalEvents />
        <TrendingRoutes />
      </ScrollView>
      
      {/* Floating SOS Button */}
      <TouchableOpacity 
        style={styles.fabSOS}
        activeOpacity={0.8} 
        onPress={() => navigation.navigate('SOSScreen')}
      >
        <Text style={styles.fabSOSText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9FCF8' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#004D40' },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  greeting: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#222', marginTop: 4 },
  weatherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F1', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16, gap: 10 },
  weatherTemp: { fontFamily: 'Outfit-Bold', color: '#111', fontSize: 18 },
  weatherDesc: { fontFamily: 'Outfit-Medium', color: '#666', fontSize: 10 },
  weatherIcon: { marginLeft: 5 },
  
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  actionItem: { alignItems: 'center', gap: 8 },
  actionIconBg: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#444' },

  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#222' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { color: '#00695C', fontFamily: 'Outfit-Bold', fontSize: 12 },
  
  horizontalScroll: { gap: 15, paddingRight: 20 },
  
  pickCard: { width: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF', elevation: 1 },
  pickImageContainer: { position: 'relative' },
  pickImage: { height: 140, width: '100%', resizeMode: 'cover' },
  ecoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FFF', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00695C' },
  ecoBadgeText: { color: '#00695C', fontFamily: 'Outfit-Bold', fontSize: 12 },
  pickContent: { padding: 15 },
  pickName: { fontFamily: 'Outfit-SemiBold', fontSize: 16, color: '#222', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },

  gemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F1', padding: 12, borderRadius: 16, gap: 15 },
  gemImage: { width: 70, height: 70, borderRadius: 12 },
  gemContent: { flex: 1, justifyContent: 'center' },
  gemTitle: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#222', marginBottom: 2 },
  gemSubtitle: { fontFamily: 'Outfit-Regular', fontSize: 13, color: '#666', marginBottom: 8 },
  ecoCertifiedBadge: { backgroundColor: '#D4E8D9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ecoCertifiedText: { color: '#00695C', fontSize: 9, fontFamily: 'Outfit-Bold' },

  eventCard: { width: '100%', height: 200, borderRadius: 20, backgroundColor: '#00695C', overflow: 'hidden' },
  eventOverlay: { flex: 1, padding: 20, justifyContent: 'space-between' },
  eventTag: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  tagText: { color: '#FFF', fontSize: 11, fontFamily: 'Outfit-Bold' },
  eventTitle: { color: '#FFF', fontSize: 22, fontFamily: 'Outfit-Bold', marginTop: 'auto', marginBottom: 8 },
  eventDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'Outfit-Regular', marginBottom: 15, lineHeight: 18 },
  remindBtn: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  remindBtnText: { color: '#00695C', fontFamily: 'Outfit-Bold', fontSize: 13 },

  routeCard: { width: 140, height: 140, borderRadius: 16, overflow: 'hidden' },
  routeOverlay: { flex: 1, padding: 15, justifyContent: 'flex-end' },
  routeTitle: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16, marginBottom: 4 },
  routeSubtitle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit-Regular', fontSize: 11 },
  
  routeCardSolid: { width: 140, height: 140, borderRadius: 16, padding: 15, justifyContent: 'center' },
  routeSolidTitle: { color: '#444', fontFamily: 'Outfit-Bold', fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  routeSolidSubtitle: { color: '#666', fontFamily: 'Outfit-Regular', fontSize: 12 },

  fabSOS: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FF5252', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#FF5252', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  fabSOSText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16 },
});
