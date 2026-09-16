import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ImageBackground, Image, Modal, FlatList } from 'react-native';
import { Text, Surface, Card, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import ProgressiveImage from '../components/ProgressiveImage';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Import AI Generated Datasets
import destinationsData from '../assets/data/ai_destinations.json';
import eventsData from '../assets/data/ai_events.json';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00695C',
  dark: '#004D40',
  accent: '#D4AF37', // Gold for culture
  ecoGreen: '#2E7D32', // Deep green for eco
  bg: '#F9FCF8',
  card: '#FFFFFF',
  text: '#1A1A2E',
  sub: '#6B7280',
};

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState('Traveler');
  const [refreshing, setRefreshing] = useState(false);
  
  // Dynamic State
  const [aiPicks, setAIPicks] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [loadingGems, setLoadingGems] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [trendingRoutes, setTrendingRoutes] = useState([]);
  
  // Chat Notifications State
  const [activeChats, setActiveChats] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    }
    loadAIData();
    fetchRealNearbyGems();

    // Fetch active bookings for chat
    if (user) {
      const q = query(
        collection(db, 'bookings'),
        where('touristId', '==', user.uid),
        where('status', 'in', ['pending', 'accepted', 'confirmed'])
      );
      const unsub = onSnapshot(q, (snap) => {
        const allBookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const uniqueChats = [];
        const seen = new Set();
        for (const b of allBookings) {
          const tId = b.touristId || b.userId;
          const gId = b.guideId || 'demo';
          const key = `${tId}_${gId}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueChats.push({ ...b, touristId: tId, guideId: gId });
          }
        }
        console.log("HomeScreen activeChats loaded:", uniqueChats.map(c => `${c.touristId}_${c.guideId}`));
        setActiveChats(uniqueChats);
      });
      return () => unsub();
    }
  }, []);
  
  const loadAIData = () => {
    const hidden = destinationsData.filter(d => d.hidden_gem === true || d.hidden_gem === "True" || d.hidden_gem === "true");
    const shuffledHidden = hidden.sort(() => 0.5 - Math.random());
    setHiddenGems(shuffledHidden.slice(0, 3));
    
    const famous = destinationsData.filter(d => (d.hidden_gem === false || d.hidden_gem === "False") && parseFloat(d.avg_rating) >= 4.5);
    const sortedEco = famous.sort((a, b) => b.eco_score - a.eco_score);
    setAIPicks(sortedEco.slice(0, 5));
    
    if (eventsData && eventsData.length > 0) {
      const randEvent = eventsData[Math.floor(Math.random() * eventsData.length)];
      setFeaturedEvent(randEvent);
    }
    
    const centralPlaces = destinationsData.filter(d => d.province === 'Central Province').slice(0, 3);
    const southernPlaces = destinationsData.filter(d => d.province === 'Southern Province').slice(0, 3);
    
    setTrendingRoutes([
        {
            id: 'route_1',
            title: 'Central Eco-Trail',
            subtitle: 'Knuckles & Horton Plains',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Knuckles_mountain_range_Sri_Lanka.jpg/800px-Knuckles_mountain_range_Sri_Lanka.jpg',
            duration: '3 Days',
            cost: 'LKR 15k',
            ecoScore: 92,
            type: 'Nature'
        },
        {
            id: 'route_2',
            title: 'Southern Heritage',
            subtitle: 'Galle Fort & Marine Life',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Galle_Fort_Lighthouse_Sri_Lanka.jpg/800px-Galle_Fort_Lighthouse_Sri_Lanka.jpg',
            duration: '2 Days',
            cost: 'LKR 12k',
            ecoScore: 85,
            type: 'Culture'
        },
        {
            id: 'route_3',
            title: 'Northern Peninsula',
            subtitle: 'Jaffna & Delft Island',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Nallur_Kandaswamy_Temple_Jaffna.jpg/800px-Nallur_Kandaswamy_Temple_Jaffna.jpg',
            duration: '4 Days',
            cost: 'LKR 20k',
            ecoScore: 95,
            type: 'Untouched'
        },
        {
            id: 'route_4',
            title: 'Eastern Safari',
            subtitle: 'Arugam Bay & Kumana',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Elephant_at_Yala_National_Park_Sri_Lanka.jpg/800px-Elephant_at_Yala_National_Park_Sri_Lanka.jpg',
            duration: '3 Days',
            cost: 'LKR 18k',
            ecoScore: 88,
            type: 'Wildlife'
        },
        {
            id: 'route_5',
            title: 'Cultural Triangle',
            subtitle: 'Sigiriya to Polonnaruwa',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Sigiriya_rock_fortress.jpg/800px-Sigiriya_rock_fortress.jpg',
            duration: '3 Days',
            cost: 'LKR 25k',
            ecoScore: 80,
            type: 'Heritage'
        },
        {
            id: 'route_6',
            title: 'Tea Country Train',
            subtitle: 'Kandy to Ella Scenic',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Nine_Arch_Bridge%2C_Demodara.jpg/800px-Nine_Arch_Bridge%2C_Demodara.jpg',
            duration: '1 Day',
            cost: 'LKR 5k',
            ecoScore: 98,
            type: 'Scenic'
        }
    ]);
  };

  const fetchRealNearbyGems = async () => {
    try {
      setLoadingGems(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

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
          eco_score: 90,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <View style={styles.menuBtn}>
            <Feather name="grid" size={20} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CEYLO</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => setShowChatModal(true)}>
          <View style={[styles.menuBtn, { position: 'relative' }]}>
            <Feather name="message-circle" size={20} color={COLORS.primary} />
            {activeChats.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={{ color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold' }}>{activeChats.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('EcoPassport')}>
          <View style={styles.ecoPointsBadge}>
            <MaterialCommunityIcons name="leaf" size={14} color="#FFF" />
            <Text style={styles.ecoPointsText}>1,250 pt</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const WelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <View>
        <Text style={styles.greeting}>AYUBOWAN,</Text>
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.subtitle}>Ready for a sustainable journey?</Text>
      </View>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EcoPassport')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="leaf-circle-outline" size={26} color={COLORS.ecoGreen} />
        </View>
        <Text style={styles.actionText}>Passport</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Marketplace')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#FFF8E1' }]}>
          <MaterialCommunityIcons name="basket-outline" size={26} color={COLORS.accent} />
        </View>
        <Text style={styles.actionText}>Local Crafts</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Transport')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#E3F2FD' }]}>
          <MaterialCommunityIcons name="train-car" size={26} color="#1565C0" />
        </View>
        <Text style={styles.actionText}>Transport</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('GuidesList')}>
        <View style={[styles.actionIconBg, { backgroundColor: '#F3E5F5' }]}>
          <MaterialCommunityIcons name="account-group-outline" size={26} color="#7B1FA2" />
        </View>
        <Text style={styles.actionText}>Local Guides</Text>
      </TouchableOpacity>
    </View>
  );

  const AIPicks = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Eco-Destinations</Text>
          <Text style={styles.sectionSubtitle}>Top rated sustainable spots</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('HiddenGemsList', { filterType: 'all' })}>
          <Text style={styles.seeAll}>See All</Text>
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
                description: item.description || `Explore the natural beauty of ${item.name} in ${item.province} Province.`
              } 
            })}
          >
            <View style={styles.pickCard}>
              <ProgressiveImage source={{ uri: item.image }} style={styles.pickImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.pickOverlay}>
                <View style={styles.ecoBadgeRow}>
                  <MaterialCommunityIcons name="leaf" size={14} color={COLORS.ecoGreen} />
                  <Text style={styles.ecoBadgeTextEco}>{Math.round(item.eco_score)} Eco Score</Text>
                </View>
                <Text style={styles.pickName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.pickLocation}>{item.dist ? `${item.dist.toFixed(1)} km away` : item.province.replace(' Province', '')}</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const HiddenGems = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Untouched Nature</Text>
          <Text style={styles.sectionSubtitle}>Discover hidden biodiversity</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('HiddenGemsList')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      {loadingGems ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Outfit-Regular', color: '#666' }}>Locating nearby gems...</Text>
        </View>
      ) : hiddenGems.map((gem) => (
        <TouchableOpacity 
          key={gem.destination_id} 
          activeOpacity={0.8} 
          style={{ marginBottom: 12 }}
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
          <Surface style={styles.gemCard} elevation={2}>
            <ProgressiveImage source={{ uri: gem.image }} style={styles.gemImage} />
            <View style={styles.gemContent}>
              <View style={styles.gemTagRow}>
                <View style={styles.ecoCertifiedBadge}>
                  <MaterialCommunityIcons name="shield-check-outline" size={12} color={COLORS.ecoGreen} />
                  <Text style={styles.ecoCertifiedText}>PRESERVED ZONE</Text>
                </View>
              </View>
              <Text style={styles.gemTitle} numberOfLines={1}>{gem.name}</Text>
              <Text style={styles.gemSubtitle} numberOfLines={1}>{gem.category}</Text>
            </View>
            <View style={styles.gemAction}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.primary} />
            </View>
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
          <View>
            <Text style={styles.sectionTitle}>Cultural Heritage</Text>
            <Text style={styles.sectionSubtitle}>Experience local traditions</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('CulturalEvents')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('CulturalEvents')}>
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} // Fallback cultural image
            style={styles.eventCard}
            imageStyle={{ borderRadius: 20 }}
          >
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,77,64,0.9)']} style={styles.eventOverlay}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventTag}>
                  <MaterialCommunityIcons name="calendar-month" size={14} color="#FFF" />
                  <Text style={styles.tagText}>{featuredEvent.month}</Text>
                </View>
                <View style={styles.eventTagGold}>
                  <Text style={styles.tagTextGold}>Cultural</Text>
                </View>
              </View>
              <View>
                <Text style={styles.eventTitle}>{featuredEvent.name}</Text>
                <Text style={styles.eventDesc} numberOfLines={2}>{featuredEvent.location} • Join the community and learn local crafts and traditions.</Text>
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity style={styles.remindBtn}>
                    <Text style={styles.remindBtnText}>Learn More</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  };

  const TrendingRoutes = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Sustainable Routes</Text>
          <Text style={styles.sectionSubtitle}>Low carbon footprint journeys</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SustainableRoutesList')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {trendingRoutes.map((route) => (
          <TouchableOpacity key={route.id} activeOpacity={0.8} onPress={() => navigation.navigate('ItineraryDetail', { routeData: route })}>
            <View style={styles.routeCard}>
              <ProgressiveImage source={{ uri: route.image }} style={styles.routeImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.routeOverlay}>
                <View style={[styles.routeTypeTag, { backgroundColor: route.type === 'Nature' || route.type === 'Wildlife' ? COLORS.ecoGreen : route.type === 'Untouched' ? '#0277BD' : COLORS.accent }]}>
                   <Text style={styles.routeTypeText}>{route.type}</Text>
                </View>
                <Text style={styles.routeTitle}>{route.title.replace(' ', '\n')}</Text>
                <Text style={styles.routeSubtitle}>{route.subtitle}</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Header />
        <WelcomeSection />
        <QuickActions />
        
        {/* Banner */}
        <Surface style={styles.bannerContainer} elevation={0}>
          <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.bannerGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Support Local Communities</Text>
              <Text style={styles.bannerSub}>Every booking contributes to conservation efforts.</Text>
            </View>
            <MaterialCommunityIcons name="hand-heart" size={40} color={COLORS.ecoGreen} style={{ opacity: 0.8 }} />
          </LinearGradient>
        </Surface>

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
        <MaterialCommunityIcons name="phone-in-talk" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Small Chat Modal */}
      <Modal visible={showChatModal} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowChatModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.chatModalContent}>
            <View style={styles.chatModalHeader}>
              <Text style={styles.chatModalTitle}>Your Conversations</Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            {activeChats.length === 0 ? (
              <Text style={{ padding: 20, textAlign: 'center', color: COLORS.sub, fontFamily: 'Outfit-Regular' }}>
                No active conversations right now. Book a guide to start chatting!
              </Text>
            ) : (
              <FlatList
                data={activeChats}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.chatListItem} 
                    onPress={() => {
                      setShowChatModal(false);
                      const combinedChatId = `${item.touristId}_${item.guideId}`;
                      console.log("HomeScreen navigating to chat:", combinedChatId);
                      navigation.navigate('MessageScreen', { chatId: combinedChatId, recipientName: item.guideName });
                    }}
                  >
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' }} style={styles.chatAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chatName}>{item.guideName}</Text>
                      <Text style={styles.chatDesc} numberOfLines={1}>Tap to view messages</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 30 },
  menuBtn: { backgroundColor: '#FFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: COLORS.dark, letterSpacing: 1 },
  ecoPointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.ecoGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4, elevation: 3 },
  ecoPointsText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 13 },
  
  welcomeSection: { marginBottom: 30 },
  greeting: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: COLORS.primary, letterSpacing: 1.5 },
  name: { fontSize: 32, fontFamily: 'Outfit-Bold', color: COLORS.text, marginTop: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 4 },
  
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionItem: { alignItems: 'center', gap: 10 },
  actionIconBg: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  actionText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: COLORS.text },

  bannerContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 35 },
  bannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  bannerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: COLORS.dark, marginBottom: 4 },
  bannerSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.primary, paddingRight: 20, lineHeight: 18 },

  section: { marginBottom: 40 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: COLORS.text },
  sectionSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },
  seeAll: { color: COLORS.primary, fontFamily: 'Outfit-Bold', fontSize: 13, marginBottom: 4 },
  
  horizontalScroll: { gap: 16, paddingRight: 20, paddingBottom: 10 },
  
  pickCard: { width: 200, height: 260, borderRadius: 20, overflow: 'hidden', backgroundColor: '#EEE', elevation: 4 },
  pickImage: { width: '100%', height: '100%', position: 'absolute' },
  pickOverlay: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  ecoBadgeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 10, gap: 4 },
  ecoBadgeTextEco: { color: COLORS.ecoGreen, fontFamily: 'Outfit-Bold', fontSize: 11 },
  pickName: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#FFF', marginBottom: 4 },
  pickLocation: { fontSize: 13, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.8)' },

  gemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, gap: 15 },
  gemImage: { width: 80, height: 80, borderRadius: 12 },
  gemContent: { flex: 1, justifyContent: 'center' },
  gemTagRow: { flexDirection: 'row', marginBottom: 6 },
  ecoCertifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  ecoCertifiedText: { color: COLORS.ecoGreen, fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  gemTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: COLORS.text, marginBottom: 2 },
  gemSubtitle: { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.sub },
  gemAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center' },

  eventCard: { width: '100%', height: 240, borderRadius: 20, backgroundColor: COLORS.primary, overflow: 'hidden', elevation: 4 },
  eventOverlay: { flex: 1, padding: 20, justifyContent: 'space-between' },
  eventTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  eventTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  tagText: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit-Bold' },
  eventTagGold: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagTextGold: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit-Bold' },
  eventTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Outfit-Bold', marginBottom: 8 },
  eventDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontFamily: 'Outfit-Regular', marginBottom: 15, lineHeight: 20 },
  remindBtn: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  remindBtnText: { color: COLORS.dark, fontFamily: 'Outfit-Bold', fontSize: 14 },

  routeCard: { width: 160, height: 180, borderRadius: 16, overflow: 'hidden', elevation: 3 },
  routeImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  routeOverlay: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  routeTypeTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  routeTypeText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  routeTitle: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16, marginBottom: 4 },
  routeSubtitle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit-Regular', fontSize: 12 },

  fabSOS: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#D32F2F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 },
  
  badgeCount: { position: 'absolute', top: -5, right: -5, backgroundColor: '#D32F2F', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, maxHeight: '60%', overflow: 'hidden' },
  chatModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  chatModalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: COLORS.dark },
  chatListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  chatName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: COLORS.text, marginBottom: 2 },
  chatDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub },
});
