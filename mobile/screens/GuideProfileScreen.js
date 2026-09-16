import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, Dimensions, StatusBar
} from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GuideProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { guide } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(2); // Default Wed selected
  const [pendingBooking, setPendingBooking] = useState(null);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const stars = guide.rating || 4.8;

  React.useEffect(() => {
    if (auth.currentUser) {
      // Listen for pending bookings
      const q = query(
        collection(db, 'bookings'),
        where('guideId', '==', guide.id),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setPendingBooking({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setPendingBooking(null);
        }
      });
      
      // Listen for reviews
      const reviewQ = query(collection(db, 'reviews'), where('guideId', '==', guide.id));
      const unsubReviews = onSnapshot(reviewQ, (snap) => {
        setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unsub(); unsubReviews(); };
    }
  }, [guide.id]);

  const handleBook = () => {
    if (pendingBooking) {
      navigation.navigate('WaitingApproval', {
        bookingId: pendingBooking.id,
        guideName: guide.name,
        guidePhoto: guide.photoUrl
      });
    } else {
      // Navigate to ConfirmBooking screen with guide details
      navigation.navigate('ConfirmBooking', { guide });
    }
  };

  const handleSubmitReview = async () => {
    if (!newReviewText.trim()) return;
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        guideId: guide.id,
        touristId: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Guest',
        avatar: auth.currentUser.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        text: newReviewText,
        rating: newReviewRating,
        createdAt: serverTimestamp()
      });
      setNewReviewText('');
      setNewReviewRating(5);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Availability calendar — generate upcoming 14 days from today
  const getCalendarDays = () => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i - 1);
      return {
        dayName: DAYS_OF_WEEK[d.getDay()],
        date: d.getDate(),
        available: ![0, 3].includes(i), // mark some as booked for realism
        isToday: i === 1,
      };
    });
  };

  const calendarDays = getCalendarDays();
  const specializations = Array.isArray(guide.specializations)
    ? guide.specializations
    : (guide.specializations?.split(',').map(s => s.trim()) || ['General']);
  const languages = Array.isArray(guide.languages)
    ? guide.languages
    : (guide.languages?.split(',').map(l => l.trim()) || ['English']);

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero Cover Image */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: guide.coverImage || guide.photoUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' }}
            style={styles.coverImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Top nav */}
          <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Badge */}
          {guide.badge && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#006A3B" />
              <Text style={styles.verifiedText}>{guide.badge}</Text>
            </View>
          )}

          {/* Profile Avatar overlapping the hero */}
          <View style={styles.avatarOverlapContainer}>
            <Image
              source={{ uri: guide.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }}
              style={styles.profileAvatar}
            />
            {guide.verifiedBadge && (
              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#006A3B" />
              </View>
            )}
          </View>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          {/* Name & Rating centered under avatar */}
          <View style={styles.avatarInfoCenter}>
            <Text style={styles.guideName}>{guide.name}</Text>
            <Text style={styles.guideSubtitle}>{guide.specializations || 'Sri Lankan Tour Guide'}</Text>
            <View style={styles.starsCenter}>
              {[1,2,3,4,5].map(s => (
                <MaterialCommunityIcons
                  key={s}
                  name={s <= Math.round(guide.rating || 4.8) ? 'star' : 'star-outline'}
                  size={18}
                  color="#FFD700"
                />
              ))}
              <Text style={styles.ratingNum}>{(guide.rating || 4.8).toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.nameRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="#8A9E8A" />
              <Text style={styles.guideLocation}>{guide.location || 'Sri Lanka'}</Text>
            </View>
            {/* Eco Score Ring */}
            <View style={styles.ecoRing}>
              <Text style={styles.ecoScore}>{guide.reviewCount || 94}</Text>
              <Text style={styles.ecoLabel}>Reviews</Text>
            </View>
          </View>

          {/* Biography */}
          <Text style={styles.sectionTitle}>Biography</Text>
          <Text style={styles.bioText}>
            {guide.bio ? guide.bio : "This guide hasn't added a biography yet. However, they are a verified local expert dedicated to providing great sustainable experiences."}
          </Text>

          {/* Specialization Tags */}
          <View style={styles.tagRow}>
            {specializations.map((s, i) => (
              <View key={i} style={styles.specTag}>
                <Text style={styles.specTagText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Languages */}
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.languagesCard}>
            {languages.map((lang, i) => (
              <View key={i} style={styles.langRow}>
                <Text style={styles.langName}>{lang}</Text>
                <Text style={styles.langLevel}>{i === 0 ? 'Native' : i === 1 ? 'Native' : 'Conversational'}</Text>
              </View>
            ))}
          </View>

          {/* Experience */}
          <View style={styles.expCard}>
            <View>
              <Text style={styles.expNum}>{guide.experience || '1'}+</Text>
              <Text style={styles.expLabel}>YEARS EXP.</Text>
            </View>
            <MaterialCommunityIcons name="leaf" size={40} color="rgba(0,106,59,0.15)" />
          </View>
          
          {/* Services Offered */}
          <Text style={styles.sectionTitle}>Services Offered</Text>
          {guide.offeredServices && guide.offeredServices.length > 0 ? (
            guide.offeredServices.map(service => (
              <View key={service.id} style={{ backgroundColor: '#F4F7F4', borderRadius: 12, padding: 15, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A' }}>{service.name}</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Outfit-Bold', color: '#006A3B' }}>${service.price}</Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A' }}>{service.description}</Text>
              </View>
            ))
          ) : (
             <Text style={styles.bioText}>No specific services listed. Contact for custom tours.</Text>
          )}

          {/* Availability Calendar */}
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#006A3B' }]} />
              <Text style={styles.legendLabel}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D0D0D0' }]} />
              <Text style={styles.legendLabel}>Booked</Text>
            </View>
          </View>

          {/* Day labels */}
          <View style={styles.calDayLabels}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Text key={d} style={styles.calDayLabel}>{d}</Text>
            ))}
          </View>
          {/* Calendar grid */}
          <View style={styles.calGrid}>
            {calendarDays.map((d, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => d.available && setSelectedDay(i)}
                style={[
                  styles.calCell,
                  d.available
                    ? (selectedDay === i ? styles.calCellSelected : styles.calCellAvailable)
                    : styles.calCellBooked
                ]}
              >
                <Text style={[styles.calDate, selectedDay === i && { color: '#FFF' }]}>{d.date}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reviews */}
          <Text style={styles.sectionTitle}>Traveler Feedback</Text>
          {reviews.length === 0 ? (
            <Text style={styles.bioText}>No reviews yet. Be the first to leave feedback!</Text>
          ) : (
            reviews.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: r.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }} style={styles.reviewAvatar} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.reviewName}>{r.name}</Text>
                    <View style={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <MaterialCommunityIcons key={i} name="star" size={13} color={i < r.rating ? '#FFCA28' : '#DDD'} />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
              </View>
            ))
          )}

          {/* Leave Feedback Form */}
          {auth.currentUser && (
            <View style={styles.feedbackForm}>
              <Text style={styles.feedbackTitle}>Leave Feedback</Text>
              <View style={styles.starSelectRow}>
                {[1,2,3,4,5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setNewReviewRating(star)}>
                    <MaterialCommunityIcons name="star" size={24} color={star <= newReviewRating ? '#FFCA28' : '#DDD'} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                mode="outlined"
                placeholder="Share your experience..."
                value={newReviewText}
                onChangeText={setNewReviewText}
                multiline
                numberOfLines={3}
                style={styles.feedbackInput}
                outlineColor="#E0E8E0"
                activeOutlineColor="#006A3B"
              />
              <TouchableOpacity style={styles.submitFeedbackBtn} onPress={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitFeedbackText}>Submit Feedback</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.footerPrice}>
            {guide.offeredServices && guide.offeredServices.length > 0 ? 
              `$${Math.min(...guide.offeredServices.map(s => s.price))}` : 
              (guide.packageCost ? `$${guide.packageCost}` : 'N/A')}
            <Text style={styles.footerUnit}>
              {guide.offeredServices && guide.offeredServices.length > 0 ? '/service' : '/day'}
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, pendingBooking && { backgroundColor: '#F57C00' }]}
          onPress={handleBook}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.bookBtnText}>{pendingBooking ? 'View Pending Request' : 'Book This Guide'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  coverContainer: { height: 280, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  topNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', bottom: 70, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  verifiedText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  avatarOverlapContainer: { position: 'absolute', bottom: -55, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  profileAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#DDD' },
  avatarBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#FFF', borderRadius: 12, padding: 2 },

  profileCard: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 70 },

  avatarInfoCenter: { alignItems: 'center', marginBottom: 20 },
  starsCenter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  ratingNum: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#8B6914', marginLeft: 4 },
  guideLocation: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  guideName: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1A2E1A', textAlign: 'center' },
  guideSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 4, textAlign: 'center' },

  ecoRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF8DC', borderWidth: 3, borderColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  ecoScore: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#8B6914' },
  ecoLabel: { fontSize: 8, fontFamily: 'Outfit-Medium', color: '#8B6914' },

  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginTop: 20, marginBottom: 10 },

  bioText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A', lineHeight: 21 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  specTag: { backgroundColor: '#EAF4EC', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  specTagText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#006A3B' },

  languagesCard: { backgroundColor: '#F4F7F4', borderRadius: 14, padding: 14, gap: 10 },
  langRow: { flexDirection: 'row', justifyContent: 'space-between' },
  langName: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#1A2E1A' },
  langLevel: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  expCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF8DC', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, marginTop: 12 },
  expNum: { fontSize: 36, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  expLabel: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6B7B6B', letterSpacing: 1 },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },

  calDayLabels: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  calDayLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#AAA', width: (width - 40) / 7, textAlign: 'center' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calCell: { width: (width - 40 - 24) / 7, height: (width - 40 - 24) / 7, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  calCellAvailable: { backgroundColor: '#E8F5E9' },
  calCellBooked: { backgroundColor: '#F0F0F0' },
  calCellSelected: { backgroundColor: '#006A3B' },
  calDate: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },

  reviewCard: { backgroundColor: '#F4F7F4', borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19 },
  reviewName: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4A5E4A', lineHeight: 19, fontStyle: 'italic' },
  
  feedbackForm: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#EEF2EE' },
  feedbackTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 10 },
  starSelectRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  feedbackInput: { backgroundColor: '#F4F7F4', fontSize: 14, marginBottom: 12 },
  submitFeedbackBtn: { backgroundColor: '#006A3B', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitFeedbackText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 14 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  footerPrice: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  footerUnit: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#888' },
  bookBtn: { backgroundColor: '#006A3B', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, flex: 0.6 },
  bookBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF', textAlign: 'center' },
});
