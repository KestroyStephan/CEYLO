import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import ProgressiveImage from '../components/ProgressiveImage';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import destinationsData from '../assets/data/ai_destinations.json';

const ACCENT = '#00695C';
const BY_NAME = new Map(destinationsData.map(d => [d.name, d]));

/** Places the traveller saved with the heart on a destination page. */
export default function SavedPlacesScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setPlaces([]);
      return undefined;
    }
    return onSnapshot(query(collection(db, 'saved_places'), where('userId', '==', uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.savedAt?.seconds || 0) - (a.savedAt?.seconds || 0));
      setPlaces(list);
    }, () => setPlaces([]));
  }, []);

  const open = (p) => {
    const d = BY_NAME.get(p.name) || {};
    navigation.navigate('DestinationDetail', {
      place: {
        ...d,
        name: p.name,
        category: p.category || d.category,
        image: p.image || d.image,
        ecoScore: d.eco_score != null ? Math.round(d.eco_score) : null,
        coords: p.lat != null ? { latitude: p.lat, longitude: p.lon } : undefined,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B2B28" />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Places</Text>
      </View>

      {places === null ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : places.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={44} color="#9AA8A2" />
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptySub}>Tap the heart on any destination to keep it here.</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => open(item)} activeOpacity={0.85}>
              <ProgressiveImage source={{ uri: item.image || BY_NAME.get(item.name)?.image }} style={styles.image} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteDoc(doc(db, 'saved_places', item.id)).catch(() => {})} accessibilityLabel={`Remove ${item.name}`} hitSlop={8}>
                <MaterialCommunityIcons name="heart" size={24} color="#FF5A5F" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  back: { padding: 8, marginRight: 4 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 16, padding: 10, marginBottom: 12 },
  image: { width: 72, height: 72, borderRadius: 12 },
  name: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#1B2B28' },
  category: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 4, textAlign: 'center' },
});
