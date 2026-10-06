import React, { useState, useEffect } from 'react';
import i18n from '../i18n';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import ProgressiveImage from '../components/ProgressiveImage';
import { Text, Surface, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Svg, Circle, Ellipse } from 'react-native-svg';

const { width } = Dimensions.get('window');

const LotusWatermark = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" style={{ opacity: 0.04 }}>
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill="#00695C" />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill="#00695C" transform="rotate(45 60 70)" />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill="#00695C" transform="rotate(90 60 70)" />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill="#00695C" transform="rotate(135 60 70)" />
    <Circle cx="60" cy="62" r="10" fill="#00695C" />
  </Svg>
);

export default function MarketplaceScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Marketplace');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Real-time listener for all vendor products
  useEffect(() => {
    setLoading(true);

    const q = query(
      collectionGroup(db, 'products'),
      where('isAvailable', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          vendorId: doc.ref.parent.parent.id, // parent vendor uid
          ...doc.data(),
        }));
        setProducts(list);
        setLoading(false);
      },
      (error) => {
        console.error('Marketplace fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Derive categories dynamically from the actual categories in database
  const dynamicCategories = [
    'All Marketplace',
    ...new Set(products.map((p) => p.category).filter(Boolean))
  ];

  // Filter products based on search query and active filter
  const today = new Date().toISOString().slice(0, 10);
  const inWindow = (p) => {
    const ok = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
    return !(ok(p.availableUntil) && p.availableUntil < today) && !(ok(p.availableFrom) && p.availableFrom > today);
  };
  const filteredProducts = products.filter((p) => {
    if (!inWindow(p)) return false;
    const matchesSearch = 
      (p.name_en || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      activeFilter === 'All Marketplace' || 
      p.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>{i18n.t('ui_marketplace')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyOrders')} accessibilityLabel="My orders">
          <MaterialCommunityIcons name="receipt-text-outline" size={26} color="#00695C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Search */}
        <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
          <Searchbar
            placeholder="Search for eco products, crafts..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor="#666"
            placeholderTextColor="#999"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {dynamicCategories.map((f, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.filterChip, activeFilter === f && styles.activeChip]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.activeChipText]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 50, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#00695C" />
            <Text style={{ marginTop: 15, color: '#00695C', fontFamily: 'Outfit-Medium' }}>{i18n.t('ui_loading_marketplace')}</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LotusWatermark />
            <MaterialCommunityIcons name="store-remove-outline" size={48} color="#BECABE" style={{ marginTop: 20 }} />
            <Text style={styles.emptyText}>{i18n.t('ui_no_products_listed_yet')}</Text>
            <Text style={styles.emptySub}>{i18n.t('ui_check_back_soon_for_authentic_local_prod')}</Text>
          </View>
        ) : (
          <View style={styles.handcraftedContainer}>
            {filteredProducts.map((item, index) => {
              const imgUri = (item.images || []).find(u => typeof u === 'string' && u.startsWith('http'));
              const openProduct = () => navigation.navigate('ProductDetail', { product: item });
              return (
                <TouchableOpacity key={item.id || index} activeOpacity={0.9} onPress={openProduct}>
                <Surface style={styles.hcCard} elevation={2}>
                  <View style={styles.hcImageContainer}>
                    <ProgressiveImage source={{ uri: imgUri }} style={styles.hcImage} />
                    {item.isEcoFriendly && (
                      <View style={styles.ecoBadge}>
                        <MaterialCommunityIcons name="leaf" size={12} color="#FFF" />
                        <Text style={styles.ecoBadgeText}>{i18n.t('ui_eco_friendly')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.hcContent}>
                    <View style={styles.hcRow}>
                      <Text style={styles.hcTitle}>{item.name_en || 'Unnamed Product'}</Text>
                      <Text style={styles.hcPrice}>LKR {item.price}</Text>
                    </View>
                    <Text style={styles.hcDesc} numberOfLines={2}>{item.description || 'No description available'}</Text>
                    
                    <View style={styles.hcBottomRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <MaterialCommunityIcons name="storefront-outline" size={14} color="#00695C" />
                        <Text style={styles.hcRating} numberOfLines={1}>
                          {item.vendorBusinessName || 'Local vendor'}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.cartBtnSm} onPress={openProduct} accessibilityLabel={`Order ${item.name_en || 'product'}`}>
                        <MaterialCommunityIcons name="shopping-outline" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Surface>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={() => navigation.navigate('SOSScreen')} accessibilityLabel="Emergency SOS">
        <MaterialCommunityIcons name="car-emergency" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#00695C' },
  searchbar: { backgroundColor: '#F0F5F0', borderRadius: 12, height: 46, elevation: 0 },
  searchInput: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#333' },
  
  filterScroll: { paddingHorizontal: 15, marginTop: 15, marginBottom: 20, gap: 10, height: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#00695C', justifyContent: 'center' },
  activeChip: { backgroundColor: '#00695C' },
  filterText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#00695C' },
  activeChipText: { color: '#FFF' },
  
  handcraftedContainer: { paddingHorizontal: 15, gap: 15 },
  hcCard: { backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  hcImageContainer: { width: '100%', height: 160 },
  hcImage: { width: '100%', height: '100%' },
  ecoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#00695C', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  ecoBadgeText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#FFF' },
  hcContent: { padding: 15 },
  hcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  hcTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333', flex: 1 },
  hcPrice: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#00695C' },
  hcDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginBottom: 15, lineHeight: 18 },
  hcBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hcRating: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6B7280', marginLeft: 4, flex: 1 },
  cartBtnSm: { backgroundColor: '#00695C', padding: 8, borderRadius: 8 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#3F4941', marginTop: 15 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 5 },

  sosButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', elevation: 6 },
});
