import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, Surface, Searchbar, SegmentedButtons, Chip, IconButton, Card, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'stay', label: 'Stay', icon: 'bed' },
  { id: 'eat', label: 'Eat', icon: 'silverware-fork-knife' },
  { id: 'shop', label: 'Shop', icon: 'shopping' },
  { id: 'tours', label: 'Tours', icon: 'camera' },
];

const VENDORS = [
  { id: '1', name: 'Green Leaf Retreat', category: 'stay', eco: 98, price: 'LKR 15k', rating: 4.8, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },
  { id: '2', name: 'Organic Spices Hub', category: 'shop', eco: 95, price: 'LKR 2k', rating: 4.9, image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d' },
  { id: '3', name: 'The Vegan Kitchen', category: 'eat', eco: 92, price: 'LKR 1.5k', rating: 4.7, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd' },
  { id: '4', name: 'Coral Reef Snorkel', category: 'tours', eco: 100, price: 'LKR 5k', rating: 4.9, image: 'https://images.unsplash.com/photo-1544551763-47a0159f9234' },
];

export default function MarketplaceScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('stay');

  const filteredVendors = VENDORS.filter(v => v.category === category);

  const VendorCard = ({ item }) => (
    <Card style={styles.card} onPress={() => {}}>
      <View style={styles.cardLayout}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.vendorName}>{item.name}</Text>
            <Surface style={styles.ecoBadge} elevation={1}>
              <MaterialCommunityIcons name="leaf" size={12} color="#4CAF50" />
              <Text style={styles.ecoText}>{item.eco}%</Text>
            </Surface>
          </View>
          
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.priceText}>{item.price}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Chip style={styles.verifyChip} textStyle={styles.verifyText}>VERIFIED</Chip>
            <IconButton icon="chevron-right" size={20} iconColor="#00695C" />
          </View>
        </Card.Content>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <Text style={styles.headerTitle}>Ceylo Marketplace</Text>
        <Text style={styles.headerSubtitle}>Support sustainable local business</Text>
        
        <Searchbar
          placeholder="Search eco-vendors..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontFamily: 'Outfit-Regular' }}
        />
      </Surface>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        <SegmentedButtons
          value={category}
          onValueChange={setCategory}
          buttons={CATEGORIES.map(c => ({ value: c.id, label: c.label, icon: c.icon }))}
          style={styles.selector}
          theme={{ colors: { secondaryContainer: '#E0F2F1', onSecondaryContainer: '#00695C' } }}
        />
      </ScrollView>

      <FlatList
        data={filteredVendors}
        renderItem={VendorCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No vendors found in this category.</Text>}
      />

      <TouchableOpacity style={styles.cartBtn}>
        <Surface style={styles.cartSurface} elevation={6}>
          <MaterialCommunityIcons name="shopping-outline" size={28} color="#FFF" />
          <Badge style={styles.badge}>0</Badge>
        </Surface>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#00695C', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  searchBar: { borderRadius: 15, backgroundColor: '#FFF', height: 50 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 20, height: 100 },
  selector: { width: width * 1.2 },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { marginBottom: 15, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF' },
  cardLayout: { flexDirection: 'row' },
  cardImage: { width: 120, height: 140 },
  cardContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 15, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vendorName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333', flex: 1 },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#E8F5E9', gap: 4 },
  ecoText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  ratingText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  priceText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#00695C', marginLeft: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  verifyChip: { height: 24, backgroundColor: '#E0F2F1' },
  verifyText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#00695C' },
  empty: { textAlign: 'center', marginTop: 50, fontFamily: 'Outfit-Medium', color: '#999' },
  cartBtn: { position: 'absolute', bottom: 30, right: 20 },
  cartSurface: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#FF7043', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#333' },
});
