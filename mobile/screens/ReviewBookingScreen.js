import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, StatusBar, Dimensions
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ReviewBookingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { booking } = route.params;
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const baseRate = parseFloat(booking?.packageCost || 45) * 2; // assume 2 guests
  const ecoLevy = parseFloat((baseRate * 0.0708).toFixed(2));
  const parkEntry = 15.00;
  const totalBeforeDiscount = baseRate + ecoLevy + parkEntry;
  const totalFinal = parseFloat((totalBeforeDiscount * 0.92).toFixed(2)); // 8% eco discount

  const handleConfirm = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to complete your booking.');
      return;
    }
    setLoading(true);
    try {
      // Already created in GuideProfileScreen, just mark as confirmed
      setConfirmed(true);
      setTimeout(() => {
        Alert.alert(
          '🌿 Booking Confirmed!',
          `Your eco-journey with ${booking.guideName} has been booked. You will receive a confirmation shortly.`,
          [{ text: 'Explore More', onPress: () => navigation.popToTop() }]
        );
      }, 400);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Nav Header */}
        <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2E1A" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Review Booking</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Destination Hero */}
        <View style={styles.destImageWrapper}>
          <Image
            source={{ uri: booking.destinationImage || 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=700' }}
            style={styles.destImage}
          />
          <View style={styles.ratingOverlay}>
            <MaterialCommunityIcons name="star" size={13} color="#FFD700" />
            <Text style={styles.ratingOverlayText}>4.9 Rare Find</Text>
          </View>
        </View>

        <View style={styles.bodyWrapper}>

          {/* Trip Details */}
          <Text style={styles.tripTitle}>
            {booking.destination ? `${booking.destination} Discovery Trek` : 'Rainforest Discovery Trek'}
          </Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={15} color="#006A3B" />
            <Text style={styles.locationText}>
              {booking.destination || 'Sinharaja Forest Reserve'}, SL
            </Text>
          </View>

          {/* Date & Guests */}
          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <MaterialCommunityIcons name="calendar" size={20} color="#006A3B" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.metaLabel}>DATE</Text>
                <Text style={styles.metaValue}>
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>
            <View style={styles.metaCard}>
              <MaterialCommunityIcons name="account-group" size={20} color="#006A3B" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.metaLabel}>EXPLORERS</Text>
                <Text style={styles.metaValue}>2 Adults</Text>
              </View>
            </View>
          </View>

          {/* Guide Card */}
          <View style={styles.sectionCard}>
            <View style={styles.guideCardHeader}>
              <Text style={styles.sectionLabel}>Your Guide</Text>
              <View style={styles.verifiedTag}>
                <MaterialCommunityIcons name="check-decagram" size={13} color="#006A3B" />
                <Text style={styles.verifiedTagText}>Verified</Text>
              </View>
            </View>
            <View style={styles.guideRow}>
              <Image
                source={{ uri: booking.guideAvatar || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=100' }}
                style={styles.guideThumb}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guideName}>{booking.guideName}</Text>
                <Text style={styles.guideRole}>{booking.guideSpecialization || 'Expert Tour Guide'}</Text>
                <View style={styles.miniStars}>
                  {[...Array(5)].map((_, i) => (
                    <MaterialCommunityIcons key={i} name="star" size={12} color={i < Math.floor(booking.guideRating || 4.5) ? '#FFCA28' : '#DDD'} />
                  ))}
                  <Text style={styles.miniReviewCount}> ({booking.guideReviews || 142} reviews)</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color="#006A3B" />
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Price Breakdown</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Base Trekking Rate (2 Guests)</Text>
              <Text style={styles.priceAmount}>${baseRate.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.ecoLevyRow}>
                <Text style={styles.priceItemHighlight}>Eco-Levy (Carbon Offset)</Text>
                <MaterialCommunityIcons name="information-outline" size={13} color="#006A3B" />
              </View>
              <Text style={styles.priceAmountHighlight}>+${ecoLevy.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Park Entry Fees</Text>
              <Text style={styles.priceAmount}>${parkEntry.toFixed(2)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <View style={styles.totalRight}>
                <Text style={styles.totalOriginal}>${totalBeforeDiscount.toFixed(2)}</Text>
                <Text style={styles.totalFinal}>${totalFinal.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.taxNote}>Taxes and local levies included</Text>
          </View>

          {/* Trust Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.trustBadge}>
              <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#006A3B" />
              <Text style={styles.trustLabel}>Secure Payment</Text>
            </View>
            <View style={styles.trustBadge}>
              <MaterialCommunityIcons name="check-decagram-outline" size={18} color="#006A3B" />
              <Text style={styles.trustLabel}>Verified Guide</Text>
            </View>
          </View>
          <View style={styles.cancellationBadge}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={18} color="#006A3B" />
            <Text style={styles.trustLabel}>Free Cancellation</Text>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Confirm CTA */}
      <View style={[styles.footerCTA, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading || confirmed} activeOpacity={0.88}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Confirm & Pay Securely</Text>
              <MaterialCommunityIcons name="lock" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          By tapping "Confirm & Pay Securely", you agree to the{' '}
          <Text style={{ color: '#006A3B', fontFamily: 'Outfit-Bold' }}>Terms of Service</Text> and{' '}
          <Text style={{ color: '#006A3B', fontFamily: 'Outfit-Bold' }}>Booking Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#F4F7F4' },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },

  destImageWrapper: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', height: 200, position: 'relative' },
  destImage: { width: '100%', height: '100%' },
  ratingOverlay: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingOverlayText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#FFF' },

  bodyWrapper: { paddingHorizontal: 16, paddingTop: 16 },

  tripTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  locationText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },

  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metaCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8F0E8' },
  metaLabel: { fontSize: 9, fontFamily: 'Outfit-Medium', color: '#AAA', letterSpacing: 0.6 },
  metaValue: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2EE' },
  sectionLabel: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 12 },

  guideCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verifiedTagText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  guideRow: { flexDirection: 'row', alignItems: 'center' },
  guideThumb: { width: 52, height: 52, borderRadius: 26 },
  guideName: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  guideRole: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 2 },
  miniStars: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  miniReviewCount: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#AAA' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceItem: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A' },
  priceAmount: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1A2E1A' },
  ecoLevyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceItemHighlight: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#006A3B' },
  priceAmountHighlight: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  priceDivider: { height: 1, backgroundColor: '#EEF2EE', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  totalRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalOriginal: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#BBB', textDecorationLine: 'line-through' },
  totalFinal: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  taxNote: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#AAA', marginTop: 6 },

  badgesRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  trustBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E8F0E8' },
  cancellationBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E8F0E8' },
  trustLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#4A5E4A' },

  footerCTA: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  confirmBtn: { backgroundColor: '#006A3B', borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },
  termsText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#AAA', textAlign: 'center', lineHeight: 16 },
});
