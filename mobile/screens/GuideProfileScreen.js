import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, Dimensions, StatusBar
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const REVIEW_DATA = [
  { id: 1, name: 'Elena G.', rating: 5, text: '"Arjuna\'s knowledge of the local flora was mind-blowing. Truly an eco-conscious journey from start to finish!"', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
];

export default function GuideProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { guide } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(2); // Default Wed selected
  const stars = guide.rating || 4.8;

  const handleBook = () => {
    // Navigate to ConfirmBooking screen with guide details
    navigation.navigate('ConfirmBooking', { guide });
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
  const specializations = guide.specializations?.split(',').map(s => s.trim()) || ['General'];
  const languages = guide.languages?.split(',').map(l => l.trim()) || ['English'];

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
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.guideName}>{guide.name}</Text>
              <Text style={styles.guideSubtitle}>{guide.specializations || 'Sri Lankan Tour Guide'}</Text>
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
            {guide.bio || `Born and raised in the foothills of Sri Lanka, ${guide.name.split(' ')[0]} has spent ${guide.experience || 10}+ years guiding travelers through the island's most pristine wilderness. Combining traditional cultural wisdom with modern sustainability practices, they specialize in rare endemic species identification and carbon-neutral trekking expeditions.`}
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
              <Text style={styles.expNum}>{guide.experience || '15'}+</Text>
              <Text style={styles.expLabel}>YEARS EXP.</Text>
            </View>
            <MaterialCommunityIcons name="leaf" size={40} color="rgba(0,106,59,0.15)" />
          </View>

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
          <Text style={styles.sectionTitle}>What travelers say</Text>
          {REVIEW_DATA.map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: r.avatar }} style={styles.reviewAvatar} />
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
          ))}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.footerPrice}>${guide.packageCost}<Text style={styles.footerUnit}>/day</Text></Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBook}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.bookBtnText}>Book This Guide</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  coverContainer: { height: 300, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  topNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', bottom: 14, left: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  verifiedText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  profileCard: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingHorizontal: 20, paddingTop: 24 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  guideName: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  guideSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 2 },

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

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  footerPrice: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  footerUnit: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#888' },
  bookBtn: { backgroundColor: '#006A3B', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, flex: 0.6 },
  bookBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF', textAlign: 'center' },
});
