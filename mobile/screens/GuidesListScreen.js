import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, StatusBar, ScrollView, Platform, Alert
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORY_FILTERS = ['All Guides', 'Wildlife', 'Cultural', 'Heritage', 'Adventure', 'Marine'];

const BADGE_META = {
  'Platinum Expert': { color: '#8B6914', bg: '#FFF8DC', icon: 'shield-star' },
  'Heritage Scholar': { color: '#1565C0', bg: '#E3F2FD', icon: 'book-education' },
  'Adventure Lead': { color: '#2E7D32', bg: '#E8F5E9', icon: 'hiking' },
  'Marine Ranger': { color: '#00838F', bg: '#E0F7FA', icon: 'waves' },
  'Cultural Expert': { color: '#6A1B9A', bg: '#F3E5F5', icon: 'drama-masks' },
};


export default function GuidesListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Guides');
  
  // Date filtering for availability
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    fetchGuides();

    if (auth.currentUser) {
      const q = query(
        collection(db, 'bookings'),
        where('touristId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setPendingBooking({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setPendingBooking(null);
        }
      });
      return () => unsub();
    }
  }, []);

  const fetchGuides = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'guide'));
      const snap = await getDocs(q);
      const live = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGuides(live);
      if (live.length === 0) {
        // Alert.alert('Debug', 'Query succeeded but 0 guides were found in the users collection with role="guide".');
      }
    } catch (e) {
      console.error('Guides fetch error:', e);
      Alert.alert('Fetch Error', e.message);
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setSelectedDate(selected);
    }
  };

  const filtered = guides.filter(g => {
    const specString = Array.isArray(g.specializations) ? g.specializations.join(',') : g.specializations;
    const areaString = Array.isArray(g.serviceAreas) ? g.serviceAreas.join(',') : g.serviceAreas;
    
    const matchesSearch =
      !search ||
      g.name?.toLowerCase()?.includes(search.toLowerCase()) ||
      specString?.toLowerCase()?.includes(search.toLowerCase()) ||
      areaString?.toLowerCase()?.includes(search.toLowerCase());
      
    const matchesFilter =
      activeFilter === 'All Guides' ||
      specString?.toLowerCase()?.includes(activeFilter.toLowerCase()) ||
      areaString?.toLowerCase()?.includes(activeFilter.toLowerCase());
      
    // Check if the selected date is in the guide's unavailableDates array
    const dateStr = selectedDate.toISOString().split('T')[0];
    const isAvailable = !(g.unavailableDates && g.unavailableDates.includes(dateStr));

    return matchesSearch && matchesFilter && isAvailable;
  });

  const renderGuide = useCallback(({ item }) => {
    const badge = item.badge ? BADGE_META[item.badge] : null;
    const stars = item.rating || 0;
    
    // Calculate lowest price from services
    let startingPrice = item.packageCost;
    if (item.offeredServices && item.offeredServices.length > 0) {
      startingPrice = Math.min(...item.offeredServices.map(s => s.price));
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('GuideProfile', { guide: item })}
        style={styles.card}
      >
        <View style={styles.cardImageWrapper}>
          <Image
            source={{ uri: item.coverImage || item.photoUrl || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=600' }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={StyleSheet.absoluteFillObject}
          />
          {badge && (
            <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
              <MaterialCommunityIcons name={badge.icon} size={11} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>{item.badge}</Text>
            </View>
          )}
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={11} color="#FFCA28" />
            <Text style={styles.ratingText}>{stars.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.guideName}>{item.name}</Text>
          <Text style={styles.guideSpec}>{item.specializations || 'Sri Lankan Tour Guide'}</Text>

          <View style={styles.chipRow}>
            {item.serviceAreas ? item.serviceAreas.split(',').slice(0, 2).map((area, i) => (
              <View key={i} style={styles.areaChip}>
                <Text style={styles.areaChipText}>{area.trim()}</Text>
              </View>
            )) : (
              <View style={styles.areaChip}>
                <Text style={styles.areaChipText}>Island-wide</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.startLabel}>STARTS FROM</Text>
              <Text style={styles.priceLabel}>{startingPrice ? `$${startingPrice}` : 'N/A'}<Text style={styles.priceUnit}>{startingPrice ? '/service' : ''}</Text></Text>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('GuideProfile', { guide: item })}
            >
              <Text style={styles.viewBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Pending Booking Banner */}
      {pendingBooking && (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => navigation.navigate('WaitingApproval', {
            bookingId: pendingBooking.id,
            guideName: pendingBooking.guideName,
            guidePhoto: pendingBooking.guidePhoto || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400'
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="clock-fast" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.pendingBannerText}>Pending Request with {pendingBooking.guideName}</Text>
              <Text style={styles.pendingBannerSub}>Tap to view status</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.appName}>Ceylon Echoes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image
            source={{ uri: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* Hero Title */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Find Your Eco-Expert</Text>
        <Text style={styles.heroSub}>
          Connect with certified local guides dedicated{'\n'}to sustainable heritage.
        </Text>
        {/* Search */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search guides by name or region..."
            placeholderTextColor="#AAA"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Category Filter Chips */}
        {/* Date Picker Button */}
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#006A3B" />
          <Text style={styles.datePickerText}>
            Showing available guides for: {selectedDate.toLocaleDateString()}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#006A3B" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 20 }}>
        {CATEGORY_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Guide List */}
      {loading ? (
        <ActivityIndicator size="large" color="#006A3B" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderGuide}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.certCard}>
              <LinearGradient
                colors={['#006A3B', '#004D2C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.certGradient}
              >
                <MaterialCommunityIcons name="certificate-outline" size={36} color="rgba(255,255,255,0.4)" style={{ marginBottom: 8 }} />
                <Text style={styles.certTitle}>Verified Eco-Certification</Text>
                <Text style={styles.certBody}>
                  Every guide in our network undergoes rigorous sustainability training and local heritage certification to ensure your journey gives back.
                </Text>
                <TouchableOpacity style={styles.certBtn}>
                  <Text style={styles.certBtnText}>Learn about Certification</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>
                {search ? `No guides found for "${search}"` : 'No certified guides found yet.\nCheck back once guides are approved by admin.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  pendingBanner: { backgroundColor: '#F57C00', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingBannerText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#FFF' },
  pendingBannerSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF' },
  appName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  backBtn: { padding: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18 },

  heroSection: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 20 },
  heroTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginTop: 8 },
  heroSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 4, marginBottom: 16, lineHeight: 19 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#333' },

  filterRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F4F0', borderWidth: 1, borderColor: '#E0E8E0' },
  filterChipActive: { backgroundColor: '#E8F5E9', borderColor: '#006A3B' },
  filterChipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666' },
  filterChipTextActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },
  filterTextActive: { color: '#FFF' },
  
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    justifyContent: 'center',
  },
  datePickerText: {
    fontFamily: 'Outfit-Medium',
    color: '#006A3B',
    marginHorizontal: 10,
    fontSize: 14,
  },

  listContent: { padding: 16, gap: 16, paddingBottom: 100 },

  card: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardImageWrapper: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  badgePill: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold' },
  ratingBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#FFF' },

  cardBody: { padding: 16 },
  guideName: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 3 },
  guideSpec: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginBottom: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  areaChip: { backgroundColor: '#EAF4EC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  areaChipText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#006A3B' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startLabel: { fontSize: 9, fontFamily: 'Outfit-Medium', color: '#AAA', letterSpacing: 0.5 },
  priceLabel: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  priceUnit: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#888' },

  viewBtn: { backgroundColor: '#006A3B', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  viewBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#FFF' },

  certCard: { marginTop: 8, borderRadius: 20, overflow: 'hidden' },
  certGradient: { padding: 24 },
  certTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF', marginBottom: 8 },
  certBody: { fontSize: 13, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginBottom: 16 },
  certBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  certBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#FFF' },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#AAA', marginTop: 12 },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#006A3B', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#006A3B', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
});
