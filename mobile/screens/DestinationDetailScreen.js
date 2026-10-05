import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { Text, Surface, IconButton, Button, Chip, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ProgressiveImage from '../components/ProgressiveImage';
import { destinationInsights } from '../services/aiClient';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { logEvent } from '../services/Analytics';
import { db, auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function DestinationDetailScreen({ route, navigation }) {
  const place = route?.params?.place || {};
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [aiData, setAiData] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [savedId, setSavedId] = useState(null);

  // Traveller reviews of this destination (reviews collection, keyed by destination name)
  useEffect(() => {
    if (!place.name) return undefined;
    const q = query(collection(db, 'reviews'), where('destinationName', '==', place.name));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(list);
    }, (e) => console.log('Reviews unavailable:', e.message));
  }, [place.name]);

  const submitReview = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign in required', 'Please sign in to write a review.');
      return;
    }
    if (myRating < 1) {
      Alert.alert('Rating needed', 'Tap the stars to rate this place.');
      return;
    }
    setPosting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        type: 'destination_review',
        destinationName: place.name,
        destinationId: place.id || null,
        touristId: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Traveller',
        rating: myRating,
        text: myText.trim(),
        createdAt: serverTimestamp(),
      });
      setMyRating(0);
      setMyText('');
    } catch (e) {
      Alert.alert('Could not post review', e.message);
    } finally {
      setPosting(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : null;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setUserLoc(loc.coords);
    })();
    fetchInsights();
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if(!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };


  const [checkedIn, setCheckedIn] = useState(false);
  const placeLat = Number(place.lat ?? place.coords?.latitude);
  const placeLon = Number(place.lon ?? place.coords?.longitude);
  const hasCoords = Number.isFinite(placeLat) && Number.isFinite(placeLon);

  // Saved and visited state for this place (FR-060, Eco Passport stamps)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !place.name) return;
    logEvent('destination_viewed', { name: place.name, hiddenGem: String(place.hidden_gem).toLowerCase() === 'true', eco: place.ecoScore ?? null });
    getDocs(query(collection(db, 'saved_places'), where('userId', '==', uid), where('name', '==', place.name)))
      .then(s => setSavedId(s.empty ? null : s.docs[0].id)).catch(() => {});
    getDocs(query(collection(db, 'visited_places'), where('userId', '==', uid), where('name', '==', place.name)))
      .then(s => setCheckedIn(!s.empty)).catch(() => {});
  }, [place.name]);

  const toggleSaved = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert('Sign in required', 'Please sign in to save places.');
    try {
      if (savedId) {
        await deleteDoc(doc(db, 'saved_places', savedId));
        setSavedId(null);
      } else {
        const ref = await addDoc(collection(db, 'saved_places'), {
          userId: uid, name: place.name, category: place.category || null, image: place.image || null,
          lat: hasCoords ? placeLat : null, lon: hasCoords ? placeLon : null, savedAt: serverTimestamp(),
        });
        setSavedId(ref.id);
        logEvent('place_saved', { name: place.name, hiddenGem: String(place.hidden_gem).toLowerCase() === 'true' });
      }
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  const sharePlace = () => {
    const where = hasCoords ? `\nhttps://www.google.com/maps/search/?api=1&query=${placeLat},${placeLon}` : '';
    Share.share({ message: `${place.name} - found with CEYLO, the eco and cultural guide to Sri Lanka.${where}` }).catch(() => {});
  };

  // GPS check-in: within 200 m of the place it stamps the Eco Passport
  const kmBetween = (a, b, c, d) => { const v = getDistance(a, b, c, d); return v == null ? Infinity : Number(v); };
  const CHECK_IN_METRES = 200;
  const metresAway = hasCoords && userLoc ? Math.round(kmBetween(userLoc.latitude, userLoc.longitude, placeLat, placeLon) * 1000) : null;
  const checkIn = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert('Sign in required', 'Please sign in to check in.');
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const metres = kmBetween(loc.coords.latitude, loc.coords.longitude, placeLat, placeLon) * 1000;
      if (metres > CHECK_IN_METRES) {
        Alert.alert('Not there yet', `You are ${(metres / 1000).toFixed(1)} km away. Check-in opens within ${CHECK_IN_METRES} m of ${place.name}.`);
        return;
      }
      await addDoc(collection(db, 'visited_places'), {
        userId: uid, name: place.name, category: place.category || null,
        lat: placeLat, lon: placeLon, accuracyM: Math.round(loc.coords.accuracy || 0),
        visitedAt: serverTimestamp(), date: new Date().toLocaleDateString(),
      });
      setCheckedIn(true);
      logEvent('place_checked_in', { name: place.name, hiddenGem: String(place.hidden_gem).toLowerCase() === 'true' });
      Alert.alert('Checked in', `${place.name} is now stamped in your Eco Passport. How was it? Leave a review below.`);
      setActiveTab('Reviews');
    } catch (e) {
      Alert.alert('Could not check in', e.message);
    }
  };

  // Facts, nearby places and the eco model's breakdown from the CEYLO backend models
  const fetchInsights = async () => {
    try {
      setLoading(true);
      const data = await destinationInsights({
        id: place.id,
        name: place.name,
        lat: place.lat ?? place.coords?.latitude,
        lon: place.lon ?? place.coords?.longitude,
        category: place.category,
        province: place.province,
      });
      setAiData(data);
    } catch (error) {
      console.warn('Failed to fetch destination insights', error.message);
      setAiData({
        ai_insight: place.description || 'Insights are unavailable offline. Connect to the internet to load them.',
        sustainability: '',
        practical_info: '',
        best_time: '',
        explore_nearby: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const TABS = ['Overview', 'Sustainability', 'Practical Info', 'Reviews'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View style={styles.imageContainer}>
          <ProgressiveImage source={{ uri: place.image }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} />

          <IconButton accessibilityLabel="Go back" icon="arrow-left" iconColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />
          <IconButton icon="share-variant" iconColor="#FFF" style={styles.shareBtn} onPress={sharePlace} accessibilityLabel="Share this place" />
          <IconButton icon={savedId ? 'heart' : 'heart-outline'} iconColor={savedId ? '#FF5A5F' : '#FFF'} style={styles.favBtn} onPress={toggleSaved} accessibilityLabel={savedId ? 'Remove from saved places' : 'Save this place'} />

          <View style={styles.heroTags}>
            <View style={styles.pillBadge}><Text style={styles.pillText}>{place.category || 'Destination'}</Text></View>
            <View style={[styles.pillBadge, { backgroundColor: '#00695C' }]}><Text style={[styles.pillText, {color:'#FFF'}]}>{place.province || 'Sri Lanka'}</Text></View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          {hasCoords && (
            <TouchableOpacity
              style={[styles.checkIn, checkedIn && styles.checkInDone]}
              onPress={checkedIn ? undefined : checkIn}
              activeOpacity={checkedIn ? 1 : 0.8}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name={checkedIn ? 'passport' : 'map-marker-check-outline'} size={22} color={checkedIn ? '#2E7D32' : '#00695C'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkInTitle}>{checkedIn ? 'Visited - stamped in your Eco Passport' : 'Check in here'}</Text>
                {!checkedIn && (
                  <Text style={styles.checkInSub}>
                    {metresAway == null ? `Opens within ${CHECK_IN_METRES} m of this place`
                      : metresAway <= CHECK_IN_METRES ? 'You are here - tap to stamp your Eco Passport'
                      : `${(metresAway / 1000).toFixed(1)} km away - opens within ${CHECK_IN_METRES} m`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{place.name || 'Destination'}</Text>
              {aiData?.distance_from_hub ? <Text style={styles.subTitle}>{aiData.distance_from_hub}</Text> : null}
            </View>
            <Surface style={styles.ecoRing} elevation={2}>
              <Text style={styles.ecoValue}>{place.ecoScore ?? '—'}</Text>
              <Text style={styles.ecoLabel}>ECO</Text>
            </Surface>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color="#00695C" />
              <Text style={styles.loadingText}>Loading insights from the CEYLO models...</Text>
            </View>
          ) : null}

          {!loading && activeTab === 'Overview' && (
            <View>
              {/* AI Insights Section */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="robot-outline" size={24} color="#00695C" />
                <Text style={styles.sectionTitle}>AI Insights</Text>
              </View>
              <Surface style={styles.aiCard} elevation={0}>
                <Text style={styles.aiText}>{aiData?.ai_insight}</Text>
              </Surface>

              {/* Quick Info Grid */}
              <View style={styles.quickInfoRow}>
                <Surface style={styles.quickInfoCard} elevation={0}>
                  <View style={styles.quickInfoLabelRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#00695C" />
                    <Text style={styles.quickInfoLabel}>Season</Text>
                  </View>
                  <Text style={styles.quickInfoValue}>{aiData?.season || '—'}</Text>
                  <Text style={styles.quickInfoSub}>From the CEYLO dataset</Text>
                </Surface>

                <Surface style={styles.quickInfoCard} elevation={0}>
                  <View style={styles.quickInfoLabelRow}>
                    <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#B8860B" />
                    <Text style={styles.quickInfoLabel}>Best Time</Text>
                  </View>
                  <Text style={styles.quickInfoValue} numberOfLines={3}>{aiData?.best_time ? aiData.best_time.split('. ')[0] : '—'}</Text>
                  <Text style={styles.quickInfoSub}>{place.category || 'Destination'}</Text>
                </Surface>
              </View>

              {/* Distance Box */}
              <TouchableOpacity onPress={() => navigation.navigate('Transport', { destination: place })} activeOpacity={0.8}>
                <Surface style={styles.distanceBox} elevation={0}>
                  <MaterialCommunityIcons name="car" size={20} color="#FFF" style={styles.distanceIconBg} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.distanceLabel}>Distance from your location</Text>
                    <Text style={styles.distanceValue}>
                      {place.coords && userLoc ? `${getDistance(userLoc.latitude, userLoc.longitude, place.coords.latitude, place.coords.longitude)} km away` : aiData?.distance_from_hub}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                </Surface>
              </TouchableOpacity>

              {/* Explore Nearby Grid */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Explore Nearby</Text>
              <View style={styles.masonryGrid}>
                {aiData?.explore_nearby && aiData.explore_nearby.length >= 3 && (
                  <>
                    {/* Large Left Item */}
                    <View style={styles.masonryLeft}>
                      <ProgressiveImage source={{ uri: aiData.explore_nearby[0].image }} style={styles.masonryImgLarge} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.masonryGradient} />
                      <Text style={styles.masonryTag}>RECOMMENDED</Text>
                      <Text style={styles.masonryTitle}>{aiData.explore_nearby[0].name}</Text>
                    </View>

                    {/* Right Stack */}
                    <View style={styles.masonryRight}>
                      <ProgressiveImage source={{ uri: aiData.explore_nearby[1].image }} style={styles.masonryImgSmall} />
                      <View style={styles.masonryImgSmallWrapper}>
                        <ProgressiveImage source={{ uri: aiData.explore_nearby[2].image }} style={styles.masonryImgSmall} />
                        <View style={styles.pinOverlay}>
                          <MaterialCommunityIcons name="map-marker" size={16} color="#FFF" />
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {!loading && activeTab === 'Sustainability' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Eco Score Breakdown</Text>
              <Text style={styles.description}>{aiData?.sustainability || 'No sustainability data for this place yet.'}</Text>
            </View>
          )}

          {!loading && activeTab === 'Practical Info' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Visitor Tips</Text>
              <Text style={styles.description}>{aiData?.practical_info}</Text>
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>Best Time to Visit</Text>
              <Text style={styles.description}>{aiData?.best_time}</Text>
            </View>
          )}

          {!loading && activeTab === 'Reviews' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>
                {avgRating ? `Traveller Reviews · ${avgRating}★ (${reviews.length})` : 'Traveller Reviews'}
              </Text>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewName}>Rate this place</Text>
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setMyRating(n)} style={{ marginRight: 6 }}>
                      <MaterialCommunityIcons name={n <= myRating ? 'star' : 'star-outline'} size={28} color="#FFB300" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  mode="outlined"
                  placeholder="Share a tip for other travellers (optional)"
                  value={myText}
                  onChangeText={setMyText}
                  multiline
                  dense
                  outlineColor="#DDE5DD"
                  activeOutlineColor="#00695C"
                  style={{ backgroundColor: '#FFF', marginBottom: 8 }}
                />
                <Button mode="contained" buttonColor="#00695C" onPress={submitReview} loading={posting} disabled={posting}>
                  Post Review
                </Button>
              </View>

              {reviews.length === 0 ? (
                <Text style={styles.description}>No reviews yet. Be the first to review {place.name || 'this place'}.</Text>
              ) : reviews.map(r => (
                <View key={r.id} style={styles.reviewCard}>
                  <Text style={styles.reviewName}>{r.name || 'Traveller'}</Text>
                  <Text style={styles.reviewStars}>{'★'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}</Text>
                  {r.text ? <Text style={styles.reviewText}>"{r.text}"</Text> : null}
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Button mode="outlined" icon="calendar-plus" textColor="#333" style={styles.outlineBtn} contentStyle={{ height: 50 }} onPress={() => navigation.navigate('Itinerary', { destination: place.name })}>
          Add to Itinerary
        </Button>
        <Button mode="contained" icon="car" buttonColor="#00695C" style={styles.solidBtn} contentStyle={{ height: 50 }} onPress={() => navigation.navigate('Transport', { destination: place })}>
          Book Transport
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: width, height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  topGradient: { ...StyleSheet.absoluteFillObject, height: 100 },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  shareBtn: { position: 'absolute', top: 40, right: 60 },
  favBtn: { position: 'absolute', top: 40, right: 10 },
  heroTags: { position: 'absolute', bottom: 40, left: 24, flexDirection: 'row', gap: 10 },
  pillBadge: { backgroundColor: '#00695C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#FFF' },
  content: { paddingHorizontal: 24, paddingVertical: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#333', lineHeight: 32 },
  subTitle: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6B7280', marginTop: 4 },
  ecoRing: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F9FBE7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5, marginTop: -30 },
  ecoValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#827717' },
  ecoLabel: { fontSize: 8, fontFamily: 'Outfit-Bold', color: '#827717' },
  thumbnailRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 20 },
  thumbnail: { width: 70, height: 50, borderRadius: 10 },
  tabContainer: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#00695C' },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#6B7280' },
  activeTabText: { color: '#00695C', fontFamily: 'Outfit-Bold' },
  loadingArea: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 15, fontFamily: 'Outfit-Medium', color: '#666' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
  aiCard: { backgroundColor: '#F9FBF9', padding: 20, borderRadius: 15, marginBottom: 20 },
  aiText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#444', lineHeight: 22 },
  quickInfoRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  quickInfoCard: { flex: 1, backgroundColor: '#F5F7F5', padding: 15, borderRadius: 15 },
  quickInfoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  quickInfoLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#00695C' },
  quickInfoValue: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#333' },
  quickInfoSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  distanceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 15 },
  distanceIconBg: { backgroundColor: '#00695C', padding: 8, borderRadius: 20 },
  distanceLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  distanceValue: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#333' },
  masonryGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  masonryLeft: { flex: 1, height: 210, borderRadius: 15, overflow: 'hidden', position: 'relative' },
  masonryImgLarge: { width: '100%', height: '100%' },
  masonryGradient: { position: 'absolute', bottom: 0, width: '100%', height: 100 },
  masonryTag: { position: 'absolute', bottom: 30, left: 15, color: '#E0E0E0', fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
  masonryTitle: { position: 'absolute', bottom: 12, left: 15, color: '#FFF', fontSize: 14, fontFamily: 'Outfit-SemiBold' },
  masonryRight: { flex: 1, gap: 10, height: 210 },
  masonryImgSmall: { width: '100%', height: 100, borderRadius: 15 },
  masonryImgSmallWrapper: { position: 'relative', width: '100%', height: 100 },
  pinOverlay: { position: 'absolute', bottom: -5, right: 10, backgroundColor: '#FF5252', padding: 10, borderRadius: 20 },
  checkIn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E0F2F1', borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 6 },
  checkInDone: { backgroundColor: '#E8F5E9' },
  checkInTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#004D40' },
  checkInSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#4A5A56', marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 15, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', gap: 10, zIndex: 100, elevation: 10 },
  outlineBtn: { flex: 1, borderRadius: 10, borderColor: '#DDD', backgroundColor: '#F5F5F5' },
  solidBtn: { flex: 1, borderRadius: 10 },
  tabContent: { marginTop: 10, minHeight: 300 },
  description: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#555', lineHeight: 24 },
  reviewCard: { backgroundColor: '#F9FBF9', padding: 15, borderRadius: 10, marginBottom: 15 },
  reviewName: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  reviewStars: { fontSize: 14, marginVertical: 4, color: '#FFB300' },
  reviewText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', fontStyle: 'italic' }
});
