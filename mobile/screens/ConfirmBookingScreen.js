import React, { useState, useEffect } from 'react';
import i18n from '../i18n';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, StatusBar, Dimensions, TextInput
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { logEvent } from '../services/Analytics';
import { notifyBooking } from '../services/aiClient';
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

// Eco levy added to every guided tour (carbon offset), shown as its own line
const ECO_LEVY_RATE = 0.07;

function buildCalendar(year, month) {
  // The header starts on Monday; getDay() counts from Sunday
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
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
  const [reviews, setReviews] = useState([]);

  // This guide's real reviews (same collection the guide profile uses)
  useEffect(() => {
    if (!guide?.id) return undefined;
    return onSnapshot(query(collection(db, 'reviews'), where('guideId', '==', guide.id)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(list.slice(0, 5));
    }, (e) => console.log('Guide reviews unavailable:', e.message));
  }, [guide?.id]);
  const reviewAvg = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : Number(guide?.rating) || 0;

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();

  const DAYS_HEADER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const calCells = buildCalendar(calYear, calMonth);

  // Days the guide marked as unavailable (GuideAvailabilityScreen stores YYYY-MM-DD)
  const unavailable = new Set(guide?.unavailableDates || []);
  const dateKey = (day) => `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isCurrent = calMonth === todayMonth;

  // Find base rate from offeredServices or fallback
  let minServicePrice = null;
  if (guide?.offeredServices && guide.offeredServices.length > 0) {
    minServicePrice = Math.min(...guide.offeredServices.map(s => s.price));
  }
  
  // The guide's lowest service price (or package cost) per person; unknown prices are agreed in chat
  const baseRatePerPerson = parseFloat(minServicePrice || guide?.packageCost) || 0;
  const hasPrice = baseRatePerPerson > 0;
  const baseTotal = (baseRatePerPerson * explorers).toFixed(2);
  const carbonOffset = (baseRatePerPerson * explorers * ECO_LEVY_RATE).toFixed(2);
  const finalTotal = (parseFloat(baseTotal) + parseFloat(carbonOffset)).toFixed(2);

  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long' });

  const handleConfirm = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to complete your booking.');
      return;
    }
    setLoading(true);
    try {
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        type: 'guide',
        guideId: guide?.id,
        guideName: guide?.name || 'Guide',
        guideSpecialization: guide?.specializations || null,
        touristId: auth.currentUser.uid,
        userId: auth.currentUser.uid,
        touristName: auth.currentUser.displayName || 'Explorer',
        touristPhoto: auth.currentUser.photoURL || null,
        status: 'pending',
        packageCost: hasPrice ? baseRatePerPerson : null,
        explorers,
        selectedDate: `${selectedDate} ${monthName} ${calYear}`,
        pickupLocation: PICKUP_OPTIONS[pickupIdx],
        totalAmount: hasPrice ? parseFloat(finalTotal) : null,
        bookingDate: dateKey(selectedDate),
        ecoLevy: parseFloat(carbonOffset),
        createdAt: serverTimestamp(),
      });

      logEvent('booking_made', { bookingId: bookingRef.id, kind: 'guide' });
      notifyBooking(bookingRef.id);
      navigation.replace('WaitingApproval', {
        bookingId: bookingRef.id,
        guideName: guide?.name || 'your guide',
        guidePhoto: guide?.photoUrl,
      });
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
          <Text style={styles.headerTitle}>{i18n.t('ui_confirm_booking')}</Text>
          <Image
            source={{ uri: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
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
                <Text style={styles.guideName}>{guide?.name || 'Guide'}</Text>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#006A3B" />
              </View>
              <Text style={styles.guideSpec}>{guide?.specializations || 'Local tour guide'}</Text>
              <View style={styles.starsRow}>
                {[...Array(5)].map((_, i) => (
                  <MaterialCommunityIcons key={i} name="star" size={13} color={i < Math.round(reviewAvg) ? '#FFCA28' : '#DDD'} />
                ))}
                <Text style={styles.guideReviewCount}> {reviews.length ? `${reviewAvg.toFixed(1)} (${reviews.length})` : 'New guide'}</Text>
              </View>
            </View>
            {/* Eco Ring */}
            <View style={styles.ecoRing}>
              <Text style={styles.ecoRingNum}>{guide?.ecoScore ?? '-'}</Text>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.sectionCard}>
            <View style={styles.calHeader}>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#006A3B" />
              <Text style={styles.calTitle}>{i18n.t('ui_selected_date')}</Text>
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
                const isBooked = unavailable.has(dateKey(cell));
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
              <Text style={styles.legendText}>{i18n.t('ui_selected_day')}</Text>
            </View>
          </View>

          {/* Expedition Details */}
          <Text style={styles.expTitle}>{i18n.t('ui_expedition_details')}</Text>
          <View style={styles.sectionCard}>
            {/* Explorers Counter */}
            <Text style={styles.fieldLabel}>{i18n.t('ui_number_of_explorers')}</Text>
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
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{i18n.t('ui_pick_up_location')}</Text>
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

          {/* Reviews from travellers who booked this guide */}
          <Text style={styles.expTitle}>{i18n.t('ui_traveller_reviews')}</Text>
          {reviews.length === 0 ? (
            <Text style={[styles.journalMeta, { marginBottom: 16 }]}>{i18n.t('ui_no_reviews_yet_for_this_guide')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {reviews.map(r => (
                <View key={r.id} style={styles.journalCard}>
                  <View style={styles.journalHeader}>
                    {r.avatar ? <Image source={{ uri: r.avatar }} style={styles.journalAvatar} /> : null}
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.journalName}>{r.name || 'Traveller'}</Text>
                      <Text style={styles.journalMeta}>
                        {'★'.repeat(Math.round(Number(r.rating) || 0))}{r.createdAt?.toDate ? ` • ${r.createdAt.toDate().toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.journalQuote} numberOfLines={3}>{r.text || r.comment || ''}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Total Footer */}
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total for {explorers} Explorer{explorers > 1 ? 's' : ''}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.finalPrice}>{hasPrice ? `$${finalTotal}` : 'Agreed with guide'}</Text>
              </View>
            </View>
            <View style={styles.carbonBadge}>
              <Text style={styles.carbonBadgeText}>CARBON OFFSET{'\n'}INCLUDED</Text>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.confirmBtnText}>{i18n.t('ui_request_to_book')}</Text>
                  <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.footerNote}>{i18n.t('ui_you_won_t_be_charged_until_the_guide_acc')}</Text>
          </View>

          {/* Trust Footer */}
          <View style={styles.trustFooter}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color="#8A9E8A" />
            <Text style={styles.trustText}>{i18n.t('ui_you_only_pay_after_the_guide_accepts_you')}</Text>
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

  confirmBtn: { backgroundColor: '#006A3B', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 8 },
  confirmBtnText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF', marginRight: 8 },
  footer: { marginTop: 12 },
  footerNote: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#8A9E8A', textAlign: 'center', marginBottom: 12 },

  trustFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
});
