import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ACCENT = '#00695C';
const RELEVANCE = [
  { value: 3, key: 'fb_rel_yes' },
  { value: 2, key: 'fb_rel_some' },
  { value: 1, key: 'fb_rel_no' },
];

/** Rating after each generated itinerary (Sprint 4: in-app feedback for RQ1 and RQ3). */
export default function ItineraryFeedback({ itinerary }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);
  const id = itinerary?.id;
  const key = `itineraryRated_${id}`;

  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(key).then(v => v && setDone(true)).catch(() => {});
  }, [id]);

  // Only the traveller's own saved itineraries can be rated
  if (!id || !auth.currentUser || itinerary.userId !== auth.currentUser.uid) return null;

  const send = (relevance) => {
    setDone(true);
    AsyncStorage.setItem(key, '1').catch(() => {});
    addDoc(collection(db, 'feedback'), {
      userId: auth.currentUser.uid,
      type: 'itinerary',
      itineraryId: id,
      rating,
      relevance,
      strategy: itinerary.strategy || null,
      engine: itinerary.engine || itinerary.source || null,
      createdAt: serverTimestamp(),
    }).catch(e => console.log('Feedback not saved:', e.message));
  };

  if (done) {
    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="heart-outline" size={20} color={ACCENT} />
          <Text style={styles.thanks}>{t('fb_thanks')}</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.card} elevation={1}>
      <Text style={styles.title}>{t('fb_title')}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={t('fb_stars', { n })} hitSlop={6}>
            <MaterialCommunityIcons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? '#F5A623' : '#B0BEC5'} />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <>
          <Text style={styles.question}>{t('fb_relevance_q')}</Text>
          <View style={styles.row}>
            {RELEVANCE.map(r => (
              <TouchableOpacity key={r.value} style={styles.chip} onPress={() => send(r.value)} accessibilityRole="button">
                <Text style={styles.chipText}>{t(r.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginTop: 6 },
  title: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  stars: { flexDirection: 'row', gap: 6, marginTop: 10 },
  question: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#33413E', marginTop: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#E0F2F1' },
  chipText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#004D40' },
  thanks: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#004D40' },
});
