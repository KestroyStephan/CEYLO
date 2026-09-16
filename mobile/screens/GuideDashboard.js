import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Image,
  Alert, ScrollView, StatusBar, Dimensions, Modal
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TYPE_COLORS = {
  'HERITAGE TOUR': '#6A1B9A',
  'TEA EXPERIENCE': '#1565C0',
  'WILDLIFE TREK': '#2E7D32',
  'MARINE DIVE': '#00838F',
  'GUIDED TOUR': '#006A3B',
  'ADVENTURE': '#D84315',
};


export default function GuideDashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const [guideData, setGuideData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoScore, setEcoScore] = useState(0);
  const [showChatModal, setShowChatModal] = useState(false);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const firstName = guideData?.name?.split(' ')[0] || auth.currentUser?.displayName?.split(' ')[0] || 'Guide';

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    // Fetch guide profile
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGuideData(data);
        setEcoScore(data.ecoScore || 0);
      }
    }, err => console.log(err.message));

    // Fetch bookings
    const q = query(collection(db, 'bookings'), where('guideId', '==', user.uid));
    const bookUnsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingBookings(all.filter(b => b.status === 'pending'));
      setBookings(all.filter(b => ['accepted', 'confirmed', 'completed'].includes(b.status)));
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

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try { await signOut(auth); }
            catch (e) { Alert.alert('Error', e.message); }
          } 
        }
      ]
    );
  };

  // Only show real bookings — no mock data
  const displayJourneys = bookings
    .filter(b => b.status === 'accepted' || b.status === 'confirmed')
    .map(b => ({
      id: b.id,
      type: (b.guideSpecialization || b.tourType || 'GUIDED TOUR').toUpperCase(),
      title: b.tourTitle || `Journey with ${b.touristName || 'Explorer'}`,
      time: b.selectedDate || b.tourDate || b.createdAt?.toDate?.()?.toLocaleDateString() || 'Upcoming',
      persons: b.explorers || b.groupSize || b.persons || 1,
      bookingId: b.id?.slice(-4),
      imageUrl: b.touristPhoto || b.imageUrl || null,
      touristId: b.touristId || b.userId,
      guideId: b.guideId || 'demo',
      touristName: b.touristName || 'Explorer'
    }));

  // Earnings from real confirmed/completed bookings only
  const totalEarnings = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || b.packageCost || 0), 0);

  const getUpcomingReminder = () => {
    const upcoming = bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed');
    if (upcoming.length === 0) return null;
    
    let closestBooking = null;
    let minDays = Infinity;
    
    for (const b of upcoming) {
      const dateStr = b.selectedDate || b.tourDate;
      if (!dateStr) continue;
      const tourDate = new Date(dateStr);
      if (isNaN(tourDate.getTime())) continue;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      tourDate.setHours(0,0,0,0);
      
      const diffTime = tourDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minDays) {
        minDays = diffDays;
        closestBooking = b;
      }
    }
    
    if (closestBooking && minDays <= 3) {
      return {
        booking: closestBooking,
        days: minDays
      };
    }
    return null;
  };
  
  const reminder = getUpcomingReminder();

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
          <TouchableOpacity onPress={handleLogout} style={{ padding: 4, marginLeft: -4 }}>
            <MaterialCommunityIcons name="logout" size={24} color="#1A2E1A" />
          </TouchableOpacity>
          <Text style={styles.brandName}>Ceylo</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => setShowChatModal(true)} style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="message-text-outline" size={24} color="#1A2E1A" />
              {bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold' }}>
                    {bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
              <Image
                source={{ uri: guideData?.photoUrl || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetRow}>
          <View style={styles.verifiedTag}>
            <MaterialCommunityIcons name="check-decagram" size={13} color="#006A3B" />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        </View>
        <Text style={styles.greetSub}>Welcome back to your ecosystem</Text>
        <Text style={styles.greetTitle}>Your Sanctuary Overview</Text>

        {reminder && (
          <TouchableOpacity 
            style={[styles.notificationBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2', borderWidth: 1 }]}
            onPress={() => {
              const tId = reminder.booking.touristId || reminder.booking.userId;
              const gId = reminder.booking.guideId || 'demo';
              const combinedChatId = `${tId}_${gId}`;
              console.log("GuideDashboard reminder navigating to chat:", combinedChatId);
              navigation.navigate('MessageScreen', { chatId: combinedChatId, recipientName: reminder.booking.touristName });
            }}
          >
            <View style={[styles.notificationIconWrap, { backgroundColor: '#FFE0B2' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#E65100" />
            </View>
            <View style={styles.notificationTextWrap}>
              <Text style={[styles.notificationTitle, { color: '#E65100' }]}>Upcoming Journey Reminder!</Text>
              <Text style={[styles.notificationSub, { color: '#B26A00' }]}>
                {reminder.days === 0 
                  ? `Your journey with ${reminder.booking.touristName} is TODAY!` 
                  : reminder.days === 1 
                  ? `Only 1 day left for tour with ${reminder.booking.touristName}!` 
                  : `${reminder.days} days left for tour with ${reminder.booking.touristName}!`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#E65100" />
          </TouchableOpacity>
        )}

        {pendingBookings.length > 0 && (
          <TouchableOpacity 
            style={styles.notificationBanner}
            onPress={() => navigation.navigate('Bookings', { filter: 'pending' })}
          >
            <View style={styles.notificationIconWrap}>
              <MaterialCommunityIcons name="bell-ring" size={20} color="#FFF" />
            </View>
            <View style={styles.notificationTextWrap}>
              <Text style={styles.notificationTitle}>New Booking Request!</Text>
              <Text style={styles.notificationSub}>{pendingBookings.length} tourist(s) want to book you.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#006A3B" />
          </TouchableOpacity>
        )}

        {/* Update Availability Button */}
        <TouchableOpacity style={styles.availBtn} onPress={() => navigation.navigate('GuideAvailability')}>
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
          <Text style={styles.earningsAmt}>${totalEarnings > 0 ? totalEarnings.toLocaleString() : '0.00'}</Text>
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
            {bookings.filter(b => b.status === 'completed').length} Completed Tours
          </Text>
        </View>

        {/* ─── Upcoming Journeys ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Journeys</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <Text style={styles.viewAll}>View All Bookings</Text>
          </TouchableOpacity>
        </View>

        {displayJourneys.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#BECABE" />
            <Text style={styles.emptyText}>No upcoming journeys yet.{`\n`}Bookings from tourists will appear here.</Text>
          </View>
        )}

        {displayJourneys.map(journey => (
          <TouchableOpacity 
            key={journey.id} 
            style={styles.journeyCard} 
            activeOpacity={0.85}
            onPress={() => {
              const combinedChatId = `${journey.touristId}_${journey.guideId}`;
              console.log("GuideDashboard journey card navigating to chat:", combinedChatId);
              navigation.navigate('MessageScreen', { chatId: combinedChatId, recipientName: journey.touristName });
            }}
          >
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
          <TouchableOpacity style={styles.offeringsBtn} onPress={() => navigation.navigate('GuideServices')}>
            <Text style={styles.offeringsBtnText}>MANAGE SERVICES</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SOS')}>
        <MaterialCommunityIcons name="asterisk" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Chat List Modal */}
      <Modal visible={showChatModal} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowChatModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.chatModalContent}>
            <View style={styles.chatModalHeader}>
              <Text style={styles.chatModalTitle}>Active Chats</Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1A2E1A" />
              </TouchableOpacity>
            </View>
            {(() => {
              const uniqueChats = Array.from(
                new Map(
                  [...bookings, ...pendingBookings].map(item => {
                    const tId = item.touristId || item.userId;
                    const gId = item.guideId || 'demo';
                    return [`${tId}_${gId}`, { ...item, touristId: tId, guideId: gId }];
                  })
                ).values()
              );
              console.log("GuideDashboard uniqueChats loaded:", uniqueChats.map(c => `${c.touristId}_${c.guideId}`));
              if (uniqueChats.length === 0) {
                return (
                  <Text style={{ padding: 20, textAlign: 'center', color: '#8A9E8A', fontFamily: 'Outfit-Regular' }}>
                    No active conversations. Accept a booking to start chatting!
                  </Text>
                );
              }
              return (
                <FlatList
                  data={uniqueChats}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.chatListItem}
                      onPress={() => {
                        setShowChatModal(false);
                        const combinedChatId = `${item.touristId}_${item.guideId}`;
                        console.log("GuideDashboard navigating to chat:", combinedChatId);
                        navigation.navigate('MessageScreen', { chatId: combinedChatId, recipientName: item.touristName });
                      }}
                    >
                      <Image source={{ uri: item.touristPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={styles.chatAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chatName}>{item.touristName || 'Tourist'}</Text>
                        <Text style={styles.chatDesc} numberOfLines={1}>Tap to view messages</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                    </TouchableOpacity>
                  )}
                />
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F4' },
  body: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#8A9E8A', textAlign: 'center', lineHeight: 20 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  brandName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  avatar: { width: 36, height: 36, borderRadius: 18 },

  greetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#006A3B', letterSpacing: 0.5 },
  greetSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 10 },
  greetTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 20 },

  notificationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#C8E6C9' },
  notificationIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#006A3B', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  notificationTextWrap: { flex: 1 },
  notificationTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  notificationSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#2E7D32', marginTop: 2 },

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

  badgeCount: { position: 'absolute', top: -5, right: -5, backgroundColor: '#D32F2F', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, maxHeight: '60%', overflow: 'hidden' },
  chatModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  chatModalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  chatListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  chatName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 2 },
  chatDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
});
