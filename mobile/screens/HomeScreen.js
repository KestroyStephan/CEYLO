import React, { useState, useEffect } from 'react';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Image, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Text, Surface, Card, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import ProgressiveImage from '../components/ProgressiveImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEcoStats } from '../utils/ecoStats';
import { getWeather } from '../services/aiClient';
import WeatherChip from '../components/WeatherChip';
import { SUSTAINABLE_ROUTES } from '../utils/destinations';
import { loadEvents, eventsNear } from '../utils/events';
import { NotificationService } from '../services/NotificationService';
import { buildDiscover } from '../services/DiscoverService';


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
  useStatusBarStyle('dark-content');
  const { t } = useTranslation();
  const [userName, setUserName] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic State
  const [discover, setDiscover] = useState(null); // { window, sections }
  const [discoverError, setDiscoverError] = useState(false);
  const [position, setPosition] = useState(null);
  const [search, setSearch] = useState('');
  const [ecoPoints, setEcoPoints] = useState(0);
  const [weatherNow, setWeatherNow] = useState(null);

  // Chat Notifications State
  const [activeChats, setActiveChats] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setUserName(user.displayName.split(' ')[0]);
    }
    loadDiscover(null);
    locateAndRefresh();
    loadEcoStats(user?.uid).then(s => setEcoPoints(s.points)).catch(() => {});

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
      }, (err) => {
        console.warn("HomeScreen activeChats listener error:", err?.message || err);
        setActiveChats([]);
      });
      return () => unsub();
    }
  }, []);

  // Sections personalised from preferences, travel dates, location, season and published events
  const loadDiscover = async (pos) => {
    try {
      setDiscoverError(false);
      setDiscover(await buildDiscover(pos));
    } catch (e) {
      console.log('Discover failed:', e.message);
      setDiscoverError(true);
    }
  };

  const locateAndRefresh = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPosition(coords);
      notifyNearbyEvents(coords);
      getWeather({ lat: coords.latitude, lon: coords.longitude })
        .then(w => setWeatherNow(w.current))
        .catch(e => console.log('Weather unavailable:', e.message));
      loadDiscover(coords);
    } catch (e) {
      console.warn('Location unavailable, showing places across Sri Lanka', e);
    }
  };

  const notifyNearbyEvents = async (coords) => {
    try {
      const nearby = eventsNear(await loadEvents(), coords);
      if (nearby.length === 0) return;
      const today = new Date().toDateString();
      const key = `eventAlert_${nearby[0].id}`;
      if ((await AsyncStorage.getItem(key)) === today) return;
      await AsyncStorage.setItem(key, today);
      NotificationService.sendLocal(
        'Cultural Event Nearby! 🎊',
        `${nearby[0].title} is ${nearby[0].distanceKm.toFixed(1)} km away in ${nearby[0].location}.`,
        { type: 'geofence_enter', regionId: nearby[0].title }
      );
    } catch (e) {
      console.log('Nearby event check failed:', e.message);
    }
  };

  // Coming back from Plan Trip (or anywhere else): rebuild so new trip dates are used
  const positionRef = React.useRef(null);
  positionRef.current = position;
  useEffect(() => navigation.addListener('focus', () => loadDiscover(positionRef.current)), [navigation]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDiscover(position).finally(() => setRefreshing(false));
  }, [position]);

  const Header = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            <Text style={styles.ecoPointsText}>{ecoPoints.toLocaleString()} pt</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const WelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <View>
        <Text style={styles.greeting}>{t('ayubowan').toUpperCase()},</Text>
        <Text style={styles.name}>{userName || t('traveler')}</Text>
        <Text style={styles.subtitle}>{t('home_subtitle')}</Text>
        <WeatherChip weather={weatherNow} style={{ marginTop: 8 }} />
      </View>
    </View>
  );

  const ACTIONS = [
    { label: t('plan_trip'), icon: 'bag-suitcase-outline', color: COLORS.primary, bg: '#E0F2F1', go: () => navigation.navigate('Itinerary') },
    { label: t('transport'), icon: 'car-multiple', color: '#1565C0', bg: '#E3F2FD', go: () => navigation.navigate('Transport') },
    { label: 'Nearby', icon: 'map-marker-radius-outline', color: '#B26A00', bg: '#FFF4E0', go: () => navigation.navigate('NearbyPlaces') },
    { label: 'Events', icon: 'calendar-star', color: '#C2185B', bg: '#FCE4EC', go: () => navigation.navigate('CulturalEvents') },
    { label: t('local_guides'), icon: 'account-tie-outline', color: '#6A1B9A', bg: '#F3E5F5', go: () => navigation.navigate('GuidesList') },
  ];

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      {ACTIONS.map(a => (
        <TouchableOpacity key={a.icon} style={styles.actionItem} onPress={a.go} accessibilityLabel={a.label}>
          <View style={[styles.actionIconBg, { backgroundColor: a.bg }]}>
            <MaterialCommunityIcons name={a.icon} size={26} color={a.color} />
          </View>
          <Text style={styles.actionText} numberOfLines={2}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Called as a function (not <SearchBar />) so the text field keeps focus while typing
  const SearchBar = () => (
    <View style={styles.searchBox}>
      <Feather name="search" size={18} color={COLORS.sub} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search places, e.g. Ella, beach, temple"
        placeholderTextColor="#9AA39E"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => search.trim() && navigation.navigate('HiddenGemsList', { query: search.trim(), filterType: 'all' })}
      />
    </View>
  );

  const fmtShort = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const TripCard = () => {
    const w = discover?.window;
    if (!w) return null;
    return (
      <TouchableOpacity style={styles.tripCard} activeOpacity={0.85} onPress={() => navigation.navigate('Itinerary')}>
        <MaterialCommunityIcons name={w.fromTrip ? 'calendar-check' : 'calendar-plus'} size={22} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tripTitle}>{w.fromTrip ? 'Your trip' : 'When are you travelling?'}</Text>
          <Text style={styles.tripSub}>
            {w.fromTrip ? `${fmtShort(w.start)} – ${fmtShort(w.end)} · suggestions match these dates` : 'Plan a trip with your dates to see what is on while you are here'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.sub} />
      </TouchableOpacity>
    );
  };

  const openItem = (item) => {
    if (item.kind === 'place') {
      navigation.navigate('DestinationDetail', { place: { ...item.place, description: item.place.description || `${item.place.name}, ${item.place.province}.` } });
    } else if (item.kind === 'event') {
      navigation.navigate('EventDetail', { event: item.event });
    } else {
      navigation.navigate('Marketplace');
    }
  };

  const SEE_ALL = {
    gems: () => navigation.navigate('HiddenGemsList'),
    popular: () => navigation.navigate('HiddenGemsList', { filterType: 'all' }),
    events: () => navigation.navigate('CulturalEvents'),
    during: () => navigation.navigate('CulturalEvents'),
    community: () => navigation.navigate('Marketplace'),
  };

  const Section = ({ section }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {SEE_ALL[section.key] && <TouchableOpacity onPress={SEE_ALL[section.key]}><Text style={styles.seeAll}>{t('see_all')}</Text></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {section.items.map(item => (
          <TouchableOpacity key={`${section.key}-${item.id}`} activeOpacity={0.9} onPress={() => openItem(item)} style={styles.tile}>
            {item.image ? (
              <ProgressiveImage source={{ uri: item.image }} style={styles.tileImage} />
            ) : (
              <View style={[styles.tileImage, styles.tilePlaceholder]}>
                <MaterialCommunityIcons name={item.kind === 'event' ? 'calendar-star' : item.kind === 'service' ? 'storefront-outline' : 'image-off-outline'} size={30} color="#7A9A8A" />
              </View>
            )}
            {item.kind === 'event' && item.event?.publicHoliday && (
              <View style={styles.tileBadge}><Text style={styles.tileBadgeText}>Holiday</Text></View>
            )}
            <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.tileSub} numberOfLines={1}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const Discover = () => {
    if (!discover && !discoverError) {
      return <View style={styles.loadingBox}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Finding places for you…</Text></View>;
    }
    if (discoverError) {
      return (
        <TouchableOpacity style={styles.loadingBox} onPress={() => loadDiscover(position)}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.primary} />
          <Text style={styles.loadingText}>Could not load suggestions. Tap to try again.</Text>
        </TouchableOpacity>
      );
    }
    return discover.sections.map(sec => <Section key={sec.key} section={sec} />);
  };

  const TrendingRoutes = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('sustainable_routes')}</Text>
          <Text style={styles.sectionSubtitle}>{t('sustainable_routes_sub')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SustainableRoutesList')}><Text style={styles.seeAll}>{t('see_all')}</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {SUSTAINABLE_ROUTES.map((route) => (
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
        {SearchBar()}
        <QuickActions />
        <TripCard />
        <Discover />
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
                    <Image
                      source={
                        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' && 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100'.startsWith('http')
                          ? { uri: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' }
                          : require('../assets/icon.png')
                      }
                      style={styles.chatAvatar}
                      onError={(e) => console.log('Image error:', e.nativeEvent.error)}
                    />
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
  actionItem: { alignItems: 'center', gap: 8, width: '19%' },
  actionIconBg: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  actionText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: COLORS.text, textAlign: 'center' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 24, borderWidth: 1, borderColor: '#E3EAE5' },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: COLORS.text },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EEF6F2', borderRadius: 14, padding: 14, marginBottom: 28 },
  tripTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: COLORS.dark },
  tripSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },
  tile: { width: 168 },
  tileImage: { width: 168, height: 120, borderRadius: 14, backgroundColor: '#E6EEE9' },
  tilePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  tileBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,77,64,0.85)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tileBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold' },
  tileTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: COLORS.text, marginTop: 8 },
  tileSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  loadingText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub },
  bannerContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 35 },
  bannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  bannerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: COLORS.dark, marginBottom: 4 },
  bannerSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.primary, paddingRight: 20, lineHeight: 18 },

  section: { marginBottom: 28 },
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
