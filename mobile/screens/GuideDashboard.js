import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Image,
  Alert, ScrollView, StatusBar, Dimensions
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MOCK_JOURNEYS = [
  {
    id: 'j1',
    type: 'HERITAGE TOUR',
    title: 'Ancient Sigiriya Walk',
    time: 'Tomorrow, 06:30 AM',
    persons: 4,
    bookingId: '8821',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sigiriya_rock_from_the_south_side.jpg/400px-Sigiriya_rock_from_the_south_side.jpg',
  },
  {
    id: 'j2',
    type: 'TEA EXPERIENCE',
    title: 'Highland Tea Trail',
    time: '24 Jun, 09:00 AM',
    persons: 2,
    bookingId: '8944',
    imageUrl: 'https://images.unsplash.com/photo-1576091358783-a212ec293c59?w=400',
  },
];

const TYPE_COLORS = {
  'HERITAGE TOUR': '#6A1B9A',
  'TEA EXPERIENCE': '#1565C0',
  'WILDLIFE TREK': '#2E7D32',
  'MARINE DIVE': '#00838F',
};

export default function GuideDashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const [guideData, setGuideData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoScore] = useState(94);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const firstName = guideData?.name?.split(' ')[0] || auth.currentUser?.displayName?.split(' ')[0] || 'Guide';

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    // Fetch guide profile
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setGuideData(snap.data());
    }, err => console.log(err.message));

    // Fetch bookings
    const q = query(collection(db, 'bookings'), where('guideId', '==', user.uid));
    const bookUnsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingBookings(all.filter(b => b.status === 'pending'));
      setBookings(all.filter(b => b.status === 'accepted' || b.status === 'confirmed'));
      setLoading(false);
    }, () => setLoading(false));

    return () => { userUnsub(); bookUnsub(); };
  }, []);

  const handleAccept = async (id) => {
    try { await updateDoc(doc(db, 'bookings', id), { status: 'accepted' }); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDecline = async (id) => {
    try { await updateDoc(doc(db, 'bookings', id), { status: 'declined' }); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  // Merge live bookings with mocks for UI richness
  const displayJourneys = [
    ...MOCK_JOURNEYS,
    ...bookings.map(b => ({
      id: b.id,
      type: b.guideSpecialization?.toUpperCase() || 'GUIDED TOUR',
      title: `Journey with ${b.touristName || 'Explorer'}`,
      time: b.createdAt?.toDate?.()?.toLocaleDateString() || 'Upcoming',
      persons: 1,
      bookingId: b.id?.slice(-4),
      imageUrl: null,
    })),
  ];

  // Earnings calculation
  const totalEarnings = bookings.reduce((sum, b) => sum + parseFloat(b.packageCost || 0), 0);
  const displayEarnings = totalEarnings > 0 ? totalEarnings : 1240;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* ─── Header ─── */}
        <View style={styles.topBar}>
          <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
          <Text style={styles.brandName}>LankaEco</Text>
          <Image
            source={{ uri: guideData?.photoUrl || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' }}
            style={styles.avatar}
          />
        </View>

        {/* Greeting */}
        <View style={styles.greetRow}>
          <View style={styles.verifiedTag}>
            <MaterialCommunityIcons name="check-decagram" size={13} color="#006A3B" />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        </View>
        <Text style={styles.greetMini}>NAMASTE, {firstName.toUpperCase()}</Text>
        <Text style={styles.greetTitle}>Your Sanctuary Overview</Text>

        {/* Update Availability Button */}
        <TouchableOpacity style={styles.availBtn}>
          <MaterialCommunityIcons name="calendar-check" size={16} color="#006A3B" />
          <Text style={styles.availBtnText}>Update Availability</Text>
        </TouchableOpacity>

        {/* ─── Eco Score Card ─── */}
        <View style={styles.ecoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ecoLabel}>Eco-Score Excellence</Text>
            <View style={styles.ecoScoreRow}>
              <Text style={styles.ecoNum}>{ecoScore}</Text>
              <Text style={styles.ecoOf}>/100</Text>
            </View>
            <View style={styles.ecoBar}>
              <View style={[styles.ecoBarFill, { width: `${ecoScore}%` }]} />
            </View>
            <Text style={styles.ecoSub}>Top 5% of Sri Lankan Guides this month</Text>
          </View>
          <MaterialCommunityIcons name="leaf" size={60} color="rgba(0,106,59,0.12)" style={{ position: 'absolute', right: 16, top: 12 }} />
        </View>

        {/* ─── Earnings Card ─── */}
        <LinearGradient colors={['#C8960C', '#A67C00']} style={styles.earningsCard}>
          <View style={styles.earningsIconWrap}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color="#FFF" />
          </View>
          <Text style={styles.earningsLabel}>Earnings: {currentMonth}</Text>
          <Text style={styles.earningsAmt}>${displayEarnings.toLocaleString()}.00</Text>
          <View style={styles.earningsChange}>
            <MaterialCommunityIcons name="trending-up" size={14} color="#FFF" />
            <Text style={styles.earningsChangeTxt}>+12.5% vs May</Text>
          </View>
        </LinearGradient>

        {/* ─── Guide Status ─── */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusActive}>Active & Online</Text>
          </View>
          <Text style={styles.statusLevel}>LEVEL 4 MASTER GUIDE</Text>
          <Text style={styles.statusHappy}>
            {(bookings.length * 10 + 248)} Happy Explorers
          </Text>
        </View>

        {/* ─── Pending Requests ─── */}
        {pendingBookings.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Booking Requests ({pendingBookings.length})</Text>
            {pendingBookings.map(req => (
              <View key={req.id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <View style={styles.pendingAvatar}>
                    <Text style={styles.pendingAvatarText}>{(req.touristName || 'T')[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.pendingName}>{req.touristName}</Text>
                    <Text style={styles.pendingSub}>Requesting ${req.packageCost}/day booking</Text>
                  </View>
                </View>
                <View style={styles.pendingBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id)}>
                    <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req.id)}>
                    <MaterialCommunityIcons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Upcoming Journeys ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Journeys</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All Bookings</Text>
          </TouchableOpacity>
        </View>

        {displayJourneys.map(journey => (
          <TouchableOpacity key={journey.id} style={styles.journeyCard} activeOpacity={0.85}>
            <Image
              source={{ uri: journey.imageUrl || 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=300' }}
              style={styles.journeyImg}
            />
            <View style={styles.journeyBody}>
              <Text style={[styles.journeyType, { color: TYPE_COLORS[journey.type] || '#006A3B' }]}>
                {journey.type}
              </Text>
              <Text style={styles.journeyTitle}>{journey.title}</Text>
              <View style={styles.journeyMeta}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="#8A9E8A" />
                <Text style={styles.journeyMetaTxt}>{journey.time}</Text>
              </View>
              <View style={styles.journeyMeta}>
                <MaterialCommunityIcons name="account-multiple-outline" size={12} color="#8A9E8A" />
                <Text style={styles.journeyMetaTxt}>{journey.persons} Persons</Text>
              </View>
            </View>
            <Text style={styles.journeyId}>ID: #{journey.bookingId}</Text>
          </TouchableOpacity>
        ))}

        {/* ─── Manage Offerings CTA ─── */}
        <LinearGradient colors={['#006A3B', '#004D2C']} style={styles.offeringsCard}>
          <MaterialCommunityIcons name="leaf" size={40} color="rgba(255,255,255,0.15)" style={styles.offeringsLeaf} />
          <Text style={styles.offeringsTitle}>Manage Your Offerings</Text>
          <Text style={styles.offeringsSub}>
            Edit your seasonal packages, update pricing, or add new sustainable experiences to your profile.
          </Text>
          <TouchableOpacity style={styles.offeringsBtn}>
            <Text style={styles.offeringsBtnText}>MANAGE SERVICES</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => signOut(auth)}>
        <MaterialCommunityIcons name="asterisk" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 4 }]}>
        {[
          { icon: 'compass-outline', label: 'Discover' },
          { icon: 'calendar-check-outline', label: 'Bookings' },
          { icon: 'account', label: 'Profile', active: true },
          { icon: 'bell-outline', label: 'SOS' },
        ].map(tab => (
          <TouchableOpacity key={tab.label} style={styles.navTab}>
            <MaterialCommunityIcons name={tab.icon} size={22} color={tab.active ? '#006A3B' : '#8A9E8A'} />
            <Text style={[styles.navLabel, tab.active && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F4' },
  body: { paddingHorizontal: 20, paddingBottom: 100 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  brandName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  avatar: { width: 36, height: 36, borderRadius: 18 },

  greetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#006A3B', letterSpacing: 0.5 },
  greetMini: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#8A9E8A', letterSpacing: 1, marginTop: 10 },
  greetTitle: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginTop: 2, marginBottom: 14 },

  availBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#006A3B', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20 },
  availBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  ecoCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2EE', overflow: 'hidden', position: 'relative' },
  ecoLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#8A9E8A', letterSpacing: 0.3 },
  ecoScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  ecoNum: { fontSize: 40, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  ecoOf: { fontSize: 16, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  ecoBar: { height: 6, backgroundColor: '#EEF2EE', borderRadius: 3, marginVertical: 10, overflow: 'hidden' },
  ecoBarFill: { height: '100%', backgroundColor: '#006A3B', borderRadius: 3 },
  ecoSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },

  earningsCard: { borderRadius: 20, padding: 20, marginBottom: 14 },
  earningsIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  earningsLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)' },
  earningsAmt: { fontSize: 30, fontFamily: 'Outfit-Bold', color: '#FFF', marginTop: 2 },
  earningsChange: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  earningsChangeTxt: { fontSize: 12, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.85)' },

  statusCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#EEF2EE' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  statusActive: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  statusLevel: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#8A9E8A', letterSpacing: 0.5, marginBottom: 4 },
  statusHappy: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A' },

  pendingCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FFF3CD' },
  pendingInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pendingAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  pendingAvatarText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  pendingName: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  pendingSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  pendingBtns: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#006A3B', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  declineBtn: { flex: 1, backgroundColor: '#D32F2F', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 12 },
  viewAll: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  journeyCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2EE' },
  journeyImg: { width: 90, height: 90 },
  journeyBody: { flex: 1, padding: 12 },
  journeyType: { fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 0.5, marginBottom: 2 },
  journeyTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 6 },
  journeyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  journeyMetaTxt: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  journeyId: { position: 'absolute', top: 10, right: 10, fontSize: 10, fontFamily: 'Outfit-Medium', color: '#8A9E8A' },

  offeringsCard: { borderRadius: 20, padding: 24, marginTop: 8, overflow: 'hidden', position: 'relative' },
  offeringsLeaf: { position: 'absolute', right: 16, top: 16 },
  offeringsTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF', marginBottom: 8 },
  offeringsSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginBottom: 16 },
  offeringsBtn: { alignSelf: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  offeringsBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#FFF', letterSpacing: 0.5 },

  fab: { position: 'absolute', right: 20, bottom: 80, width: 52, height: 52, borderRadius: 26, backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#E53935', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEF2EE', paddingTop: 8 },
  navTab: { flex: 1, alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  navLabelActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },
});
