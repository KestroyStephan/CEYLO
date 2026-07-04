import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, StatusBar, Dimensions, TextInput
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PICKUP_OPTIONS = [
  'Rainforest Edge Hotel, Sinharaja',
  'Colombo Fort Station',
  'Galle Fort Entrance',
  'Kandy City Centre',
  'Custom Location',
];

const EXPEDITION_REVIEWS = [
  { id: 1, name: 'Sarah Jenkins', country: 'UK', date: "May '24", quote: '"Arjuna\'s knowledge is unmatched.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
  { id: 2, name: 'Arjun M.', country: 'India', date: "Apr '24", quote: '"Life-changing eco experience!', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' },
];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function ConfirmBookingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { guide } = route.params || {};

  const today = new Date();
  const [calYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [explorers, setExplorers] = useState(2);
  const [pickupIdx, setPickupIdx] = useState(0);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();

  const DAYS_HEADER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const calCells = buildCalendar(calYear, calMonth);

  const BOOKED_DAYS = [6, 13, 20]; // mock booked days
  const isCurrent = calMonth === todayMonth;

  const baseRatePerPerson = parseFloat(guide?.packageCost || 45);
  const baseTotal = (baseRatePerPerson * explorers).toFixed(2);
  const carbonOffset = (baseRatePerPerson * explorers * 0.07).toFixed(2);
  const originalTotal = (parseFloat(baseTotal) + parseFloat(carbonOffset) + 15).toFixed(2);
  const finalTotal = (parseFloat(originalTotal) * 0.92).toFixed(2);

  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long' });

  const handleConfirm = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to complete your booking.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        type: 'guide',
        guideId: guide?.id || 'demo',
        guideName: guide?.name || 'Arjuna Perera',
        guideSpecialization: guide?.specializations || 'Sinharaja Rainforest Specialist',
        touristId: auth.currentUser.uid,
        touristName: auth.currentUser.displayName || 'Explorer',
        status: 'pending',
        packageCost: guide?.packageCost || '45',
        explorers,
        selectedDate: `${selectedDate} ${monthName} ${calYear}`,
        pickupLocation: PICKUP_OPTIONS[pickupIdx],
        totalAmount: parseFloat(finalTotal),
        ecoLevy: parseFloat(carbonOffset),
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        '🌿 Confirmed!',
        `Your eco-journey with ${guide?.name || 'Arjuna Perera'} on ${selectedDate} ${monthName} has been booked!`,
        [{ text: 'Explore More', onPress: () => navigation.popToTop() }]
      );
    } catch (e) {
      Alert.alert('Booking Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) return;
    setCalMonth(m => m - 1);
    setSelectedDate(1);
  };
  const nextMonth = () => {
    setCalMonth(m => (m + 1) % 12);
    setSelectedDate(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2E1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
            style={styles.headerAvatar}
          />
        </View>

        <View style={styles.body}>
          {/* Guide Card */}
          <View style={styles.guideCard}>
            <Image
              source={{ uri: guide?.photoUrl || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=120' }}
              style={styles.guidePhoto}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.guideTitleRow}>
                <Text style={styles.guideName}>{guide?.name || 'Arjuna Perera'}</Text>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#006A3B" />
              </View>
              <Text style={styles.guideSpec}>{guide?.specializations || 'Sinharaja Rainforest Specialist'}</Text>
              <View style={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <MaterialCommunityIcons key={i} name="star" size={13} color={i < Math.floor(guide?.rating || 4.9) ? '#FFCA28' : '#DDD'} />
                ))}
                <Text style={styles.guideReviewCount}> ({guide?.reviewCount || 128})</Text>
              </View>
            </View>
            {/* Eco Ring */}
            <View style={styles.ecoRing}>
              <Text style={styles.ecoRingNum}>{guide?.ecoScore || 94}</Text>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.sectionCard}>
            <View style={styles.calHeader}>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#006A3B" />
              <Text style={styles.calTitle}>Selected Date</Text>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                  <MaterialCommunityIcons name="chevron-left" size={18} color="#4A5E4A" />
                </TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#4A5E4A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Day headers */}
            <View style={styles.calDayHeaderRow}>
              {DAYS_HEADER.map(d => (
                <Text key={d} style={styles.calDayHeader}>{d}</Text>
              ))}
            </View>

            {/* Date grid */}
            <View style={styles.calGrid}>
              {calCells.map((cell, i) => {
                if (!cell) return <View key={`e-${i}`} style={styles.calCell} />;
                const isToday = isCurrent && cell === todayDay;
                const isSelected = cell === selectedDate;
                const isBooked = BOOKED_DAYS.includes(cell);
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={isBooked || (isCurrent && cell < todayDay)}
                    onPress={() => setSelectedDate(cell)}
                    style={[
                      styles.calCell,
                      isSelected && styles.calCellSelected,
                      isToday && !isSelected && styles.calCellToday,
                    ]}
                  >
                    <Text style={[
                      styles.calCellText,
                      isSelected && styles.calCellTextSelected,
                      isToday && !isSelected && styles.calCellTextToday,
                      (isBooked || (isCurrent && cell < todayDay)) && styles.calCellTextDisabled,
                    ]}>
                      {cell}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Selected Day</Text>
            </View>
          </View>

          {/* Expedition Details */}
          <Text style={styles.expTitle}>Expedition Details</Text>
          <View style={styles.sectionCard}>
            {/* Explorers Counter */}
            <Text style={styles.fieldLabel}>Number of Explorers</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setExplorers(e => Math.max(1, e - 1))}
                style={styles.counterBtn}
              >
                <MaterialCommunityIcons name="minus" size={20} color="#4A5E4A" />
              </TouchableOpacity>
              <Text style={styles.counterVal}>{String(explorers).padStart(2, '0')}</Text>
              <TouchableOpacity
                onPress={() => setExplorers(e => Math.min(20, e + 1))}
                style={[styles.counterBtn, styles.counterBtnPlus]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Pickup Location */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Pick-up Location</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowPickupDropdown(!showPickupDropdown)}
            >
              <Text style={styles.dropdownText}>{PICKUP_OPTIONS[pickupIdx]}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#4A5E4A" />
            </TouchableOpacity>
            {showPickupDropdown && (
              <View style={styles.dropdownList}>
                {PICKUP_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.dropdownOption}
                    onPress={() => { setPickupIdx(i); setShowPickupDropdown(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, i === pickupIdx && styles.dropdownOptionTextActive]}>
                      {opt}
                    </Text>
                    {i === pickupIdx && <MaterialCommunityIcons name="check" size={16} color="#006A3B" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Expedition Journals */}
          <Text style={styles.expTitle}>Recent Expedition Journals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {EXPEDITION_REVIEWS.map(r => (
              <View key={r.id} style={styles.journalCard}>
                <View style={styles.journalHeader}>
                  <Image source={{ uri: r.avatar }} style={styles.journalAvatar} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.journalName}>{r.name}</Text>
                    <Text style={styles.journalMeta}>{r.country} • {r.date}</Text>
                  </View>
                </View>
                <Text style={styles.journalQuote}>{r.quote}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Total Footer */}
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total for {explorers} Explorer{explorers > 1 ? 's' : ''}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.originalPrice}>${originalTotal}</Text>
                <Text style={styles.finalPrice}>${finalTotal}</Text>
              </View>
            </View>
            <View style={styles.carbonBadge}>
              <Text style={styles.carbonBadgeText}>CARBON OFFSET{'\n'}INCLUDED</Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading} activeOpacity={0.88}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>Confirm & Pay Securely</Text>
                <MaterialCommunityIcons name="lock" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Trust Footer */}
          <View style={styles.trustFooter}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color="#8A9E8A" />
            <Text style={styles.trustText}>Protected by LankaEco Sustainable Travel Guarantee</Text>
          </View>

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const cellSize = (width - 40 - 32 - 6 * 6) / 7;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#F4F7F4' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17 },

  body: { paddingHorizontal: 16, paddingBottom: 20 },

  guideCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2EE' },
  guidePhoto: { width: 60, height: 60, borderRadius: 12 },
  guideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  guideSpec: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  guideReviewCount: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  ecoRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#006A3B', justifyContent: 'center', alignItems: 'center' },
  ecoRingNum: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2EE' },

  calHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  calTitle: { flex: 1, fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginLeft: 8 },
  calNav: { flexDirection: 'row', gap: 4 },
  calNavBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F4F7F4', justifyContent: 'center', alignItems: 'center' },

  calDayHeaderRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  calDayHeader: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#8A9E8A', width: cellSize, textAlign: 'center' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  calCell: { width: cellSize, height: cellSize, borderRadius: cellSize / 2, justifyContent: 'center', alignItems: 'center' },
  calCellSelected: { backgroundColor: '#006A3B' },
  calCellToday: { borderWidth: 1.5, borderColor: '#E53935' },
  calCellText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1A2E1A' },
  calCellTextSelected: { color: '#FFF', fontFamily: 'Outfit-Bold' },
  calCellTextToday: { color: '#E53935', fontFamily: 'Outfit-Bold' },
  calCellTextDisabled: { color: '#CCC' },

  calLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#006A3B' },
  legendText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },

  expTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#006A3B', marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#4A5E4A', marginBottom: 10 },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F4F7F4', borderWidth: 1, borderColor: '#E0E8E0', justifyContent: 'center', alignItems: 'center' },
  counterBtnPlus: { backgroundColor: '#006A3B', borderColor: '#006A3B' },
  counterVal: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A', backgroundColor: '#F4F7F4', borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E0E8E0' },

  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F7F4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E8E0' },
  dropdownText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1A2E1A' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#E0E8E0', overflow: 'hidden' },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F7F4' },
  dropdownOptionText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A' },
  dropdownOptionTextActive: { fontFamily: 'Outfit-Bold', color: '#006A3B' },

  journalCard: { width: 200, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginRight: 12, borderWidth: 1, borderColor: '#EEF2EE' },
  journalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  journalAvatar: { width: 36, height: 36, borderRadius: 18 },
  journalName: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  journalMeta: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  journalQuote: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#4A5E4A', fontStyle: 'italic', lineHeight: 18 },

  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  originalPrice: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#C0CCC0', textDecorationLine: 'line-through' },
  finalPrice: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  carbonBadge: { backgroundColor: '#006A3B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  carbonBadgeText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#FFF', textAlign: 'center', letterSpacing: 0.3, lineHeight: 13 },

  confirmBtn: { backgroundColor: '#006A3B', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 12 },
  confirmBtnText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },

  trustFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
});
