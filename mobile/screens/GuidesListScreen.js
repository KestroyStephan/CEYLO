import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Surface, IconButton, ActivityIndicator, Chip, Searchbar } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function GuidesListScreen({ navigation }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'guide'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuides(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides.filter(g => 
    g.name?.toLowerCase().includes(search.toLowerCase()) || 
    g.specializations?.toLowerCase().includes(search.toLowerCase()) ||
    g.serviceAreas?.toLowerCase().includes(search.toLowerCase())
  );

  const renderGuide = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('GuideProfile', { guide: item })}>
      <Surface style={styles.card} elevation={1}>
        <Image source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71' }} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.experience}>{item.experience} Years Experience • {item.languages}</Text>
          <View style={styles.tags}>
            <Chip style={styles.chip} textStyle={styles.chipText}>{item.serviceAreas?.split(',')[0] || 'Islandwide'}</Chip>
            <Chip style={styles.chip} textStyle={styles.chipText}>{item.packageCost} LKR/Day</Chip>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#00695C" style={{ marginRight: 15 }} />
      </Surface>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#333" onPress={() => navigation.goBack()} style={{ marginLeft: -10 }} />
        <Text style={styles.title}>Find a Guide</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, area, or specialty"
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={{ fontFamily: 'Outfit-Regular' }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00695C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredGuides}
          keyExtractor={item => item.id}
          renderItem={renderGuide}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No guides found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#FFF' },
  title: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#333' },
  searchContainer: { padding: 20, backgroundColor: '#FFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  searchbar: { backgroundColor: '#F0F4F1', elevation: 0 },
  listContent: { padding: 20, gap: 15 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', alignItems: 'center' },
  image: { width: 90, height: 90 },
  content: { flex: 1, padding: 15 },
  name: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 4 },
  experience: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 5 },
  chip: { height: 24, backgroundColor: '#E0F2F1' },
  chipText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#00695C', marginVertical: 0 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontFamily: 'Outfit-Medium', color: '#999', marginTop: 10 }
});
