import React, { useState, useEffect } from 'react';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Image, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Text, Surface, Card, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import SosButton from '../components/SosButton';
import PersonAvatar from '../components/PersonAvatar';


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
  useStatusBarStyle('light-content');
  const insets = useSafeAreaInsets();
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

  const forYou = discover?.sections.find(s => s.key === 'forYou')?.items[0] || null;

  // Full-width photo hero: the top pick for this traveller, with greeting, weather and search
  const Hero = () => (
    <View style={styles.hero}>
      {forYou?.image ? (
        <ProgressiveImage source={{ uri: forYou.image }} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.dark }]} />
      )}
      <LinearGradient colors={['rgba(0,32,26,0.65)', 'rgba(0,32,26,0.15)', 'rgba(0,32,26,0.85)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.heroBrand}>CEYLO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowChatModal(true)} style={styles.heroIconBtn} accessibilityLabel="Conversations">
            <Feather name="message-circle" size={19} color="#FFF" />
            {activeChats.length > 0 && (
              <View style={styles.badgeCount}><Text style={styles.badgeText}>{activeChats.length}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EcoPassport')} style={styles.heroPoints} accessibilityLabel="Eco points">
            <MaterialCommunityIcons name="leaf" size={14} color="#B9F6CA" />
            <Text style={styles.heroPointsText}>{ecoPoints.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heroBody}>
        <Text style={styles.heroGreeting}>{t('ayubowan')}, {userName || t('traveler')}</Text>
        <Text style={styles.heroLine}>Where to next?</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <WeatherChip weather={weatherNow} />
          {forYou && (
            <TouchableOpacity onPress={() => openItem(forYou)} style={styles.heroPick}>
              <Text style={styles.heroPickText} numberOfLines={1}>Picked for you · {forYou.title}</Text>
              <Feather name="arrow-up-right" size={13} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const ACTIONS = [
    { label: t('plan_trip'), icon: 'map-marker-path', go: () => navigation.navigate('Itinerary') },
    { label: t('transport'), icon: 'car-side', go: () => navigation.navigate('Transport') },
    { label: 'Nearby', icon: 'map-search-outline', go: () => navigation.navigate('NearbyPlaces') },
    { label: 'Events', icon: 'calendar-star', go: () => navigation.navigate('CulturalEvents') },
    { label: 'Guides', icon: 'account-tie-outline', go: () => navigation.navigate('GuidesList') },
  ];

  const QuickActions = () => (
    <View style={styles.actionsCard}>
      {ACTIONS.map(a => (
        <TouchableOpacity key={a.icon} style={styles.actionItem} onPress={a.go} accessibilityLabel={a.label}>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons name={a.icon} size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.actionText} numberOfLines={1}>{a.label}</Text>
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
        placeholder="Search Ella, beaches, temples…"
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
        <View style={styles.tripIcon}>
          <MaterialCommunityIcons name={w.fromTrip ? 'calendar-check' : 'calendar-plus'} size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripTitle}>{w.fromTrip ? `Your trip · ${fmtShort(w.start)} – ${fmtShort(w.end)}` : 'Add your travel dates'}</Text>
          <Text style={styles.tripSub}>{w.fromTrip ? 'Suggestions below match these dates' : 'See festivals and holidays during your stay'}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.sub} />
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
    nearby: () => navigation.navigate('HiddenGemsList', { filterType: 'all' }),
    events: () => navigation.navigate('CulturalEvents'),
    during: () => navigation.navigate('CulturalEvents'),
    community: () => navigation.navigate('Marketplace'),
  };

  const SectionHead = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {SEE_ALL[section.key] && <TouchableOpacity onPress={SEE_ALL[section.key]} hitSlop={8}><Text style={styles.seeAll}>{t('see_all')}</Text></TouchableOpacity>}
    </View>
  );

  const Img = ({ item, style }) => (item.image ? (
    <ProgressiveImage source={{ uri: item.image }} style={style} />
  ) : (
    <View style={[style, styles.tilePlaceholder]}>
      <MaterialCommunityIcons name={item.kind === 'event' ? 'calendar-star' : item.kind === 'service' ? 'storefront-outline' : 'image-filter-hdr'} size={28} color="#7A9A8A" />
    </View>
  ));

  // Dated events: date block on the photo, so the "when" is read first
  const EventCard = ({ item }) => {
    const d = item.event?.date && !item.event?.months ? new Date(item.event.date) : null;
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openItem(item)} style={styles.eventCard}>
        <Img item={item} style={styles.eventImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.eventShade} />
        <View style={styles.dateBlock}>
          {d ? (
            <>
              <Text style={styles.dateDay}>{d.getDate()}</Text>
              <Text style={styles.dateMon}>{d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</Text>
            </>
          ) : <MaterialCommunityIcons name="weather-sunny" size={20} color={COLORS.dark} />}
        </View>
        {item.event?.publicHoliday && <View style={styles.holiday}><Text style={styles.holidayText}>Holiday</Text></View>}
        <View style={styles.eventText}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.eventSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Personal picks: tall photo cards with the match reason on the image
  const FeatureCard = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openItem(item)} style={styles.featureCard}>
      <Img item={item} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featureShade}>
        <Text style={styles.featureTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featureSub} numberOfLines={1}>{item.subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const Tile = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openItem(item)} style={styles.tile}>
      <Img item={item} style={styles.tileImage} />
      <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.tileSub} numberOfLines={1}>{item.subtitle}</Text>
    </TouchableOpacity>
  );

  // Nearby: a short list reads faster than a carousel when distance is the point
  const NearbyList = ({ section }) => (
    <View style={styles.listCard}>
      {section.items.slice(0, 4).map((item, i) => (
        <TouchableOpacity key={item.id} onPress={() => openItem(item)} style={[styles.listRow, i > 0 && styles.listDivider]} activeOpacity={0.8}>
          <Img item={item} style={styles.listThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.listSub} numberOfLines={1}>{item.place?.category} · {item.subtitle}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#B0BAB4" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const Section = ({ section }) => {
    const Card = section.key === 'during' || section.key === 'events' ? EventCard : section.key === 'forYou' ? FeatureCard : Tile;
    return (
      <View style={styles.section}>
        <SectionHead section={section} />
        {section.key === 'nearby' ? <NearbyList section={section} /> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.horizontalScroll}>
            {section.items.map(item => <Card key={`${section.key}-${item.id}`} item={item} />)}
          </ScrollView>
        )}
      </View>
    );
  };

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
        <Text style={styles.sectionTitle}>{t('sustainable_routes')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SustainableRoutesList')} hitSlop={8}><Text style={styles.seeAll}>{t('see_all')}</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.horizontalScroll}>
        {SUSTAINABLE_ROUTES.map((route) => (
          <TouchableOpacity key={route.id} activeOpacity={0.9} onPress={() => navigation.navigate('ItineraryDetail', { routeData: route })} style={styles.tile}>
            <ProgressiveImage source={{ uri: route.image }} style={styles.tileImage} />
            <Text style={styles.tileTitle} numberOfLines={1}>{route.title}</Text>
            <Text style={styles.tileSub} numberOfLines={1}>{route.type} · {route.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Hero />
        <View style={styles.body}>
          <View style={styles.floatSearch}>{SearchBar()}</View>
          <QuickActions />
          <TripCard />
          <Discover />
          <TrendingRoutes />
        </View>
      </ScrollView>

      <SosButton onPress={() => navigation.navigate('SOSScreen')} />

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
                    <PersonAvatar uri={item.guidePhoto} name={item.guideName} size={40} style={styles.chatAvatar} />
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
  body: { paddingHorizontal: 20, marginTop: -28 },
  bleed: { marginHorizontal: -20 },

  hero: { height: 330, overflow: 'hidden', backgroundColor: COLORS.dark },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  heroBrand: { color: '#FFF', fontSize: 20, fontFamily: 'Outfit-Bold', letterSpacing: 3 },
  heroIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroPoints: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, height: 38, borderRadius: 19 },
  heroPointsText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 14 },
  heroBody: { position: 'absolute', left: 20, right: 20, bottom: 48 },
  heroGreeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'Outfit-Medium' },
  heroLine: { color: '#FFF', fontSize: 30, fontFamily: 'Outfit-Bold', marginTop: 2 },
  heroPick: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 230 },
  heroPickText: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit-Medium', flexShrink: 1 },

  floatSearch: { shadowColor: '#0B2A22', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderRadius: 16, backgroundColor: '#FFF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, height: 54 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Outfit-Regular', color: COLORS.text },

  actionsCard: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 18 },
  actionItem: { alignItems: 'center', gap: 7, width: '19%' },
  actionIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3EAE5', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: COLORS.text, textAlign: 'center' },

  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 28, borderWidth: 1, borderColor: '#E3EAE5' },
  tripIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  tripTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: COLORS.text },
  tripSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },

  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontFamily: 'Outfit-Bold', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  horizontalScroll: { gap: 14, paddingHorizontal: 20 },

  featureCard: { width: 230, height: 290, borderRadius: 20, overflow: 'hidden', backgroundColor: '#DDE6E1' },
  featureShade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 60 },
  featureTitle: { color: '#FFF', fontSize: 19, fontFamily: 'Outfit-Bold' },
  featureSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Outfit-Medium', marginTop: 4 },

  eventCard: { width: 260, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: '#DDE6E1' },
  eventImage: { position: 'absolute', width: '100%', height: '100%' },
  eventShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  dateBlock: { position: 'absolute', top: 12, left: 12, width: 46, height: 50, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, fontFamily: 'Outfit-Bold', color: COLORS.text, lineHeight: 20 },
  dateMon: { fontSize: 10, fontFamily: 'Outfit-Bold', color: COLORS.primary, letterSpacing: 1 },
  holiday: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,77,64,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  holidayText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold' },
  eventText: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  eventTitle: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit-Bold' },
  eventSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Outfit-Medium', marginTop: 2 },

  tile: { width: 160 },
  tileImage: { width: 160, height: 116, borderRadius: 14, backgroundColor: '#E6EEE9' },
  tilePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6EEE9' },
  tileTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: COLORS.text, marginTop: 8 },
  tileSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },

  listCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E3EAE5', paddingHorizontal: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  listDivider: { borderTopWidth: 1, borderTopColor: '#EEF2EF' },
  listThumb: { width: 56, height: 56, borderRadius: 12 },
  listTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: COLORS.text },
  listSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },

  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  loadingText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub },

  fabSOS: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#C62828', height: 48, paddingHorizontal: 18, borderRadius: 24, elevation: 6, shadowColor: '#C62828', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  fabText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 15, letterSpacing: 1 },

  badgeCount: { position: 'absolute', top: -3, right: -3, backgroundColor: '#E53935', minWidth: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, maxHeight: '60%', overflow: 'hidden' },
  chatModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  chatModalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: COLORS.dark },
  chatListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  chatName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: COLORS.text, marginBottom: 2 },
  chatDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub },
});
