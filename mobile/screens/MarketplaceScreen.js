import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Surface, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const FILTERS = ['All Marketplace', 'Handcrafted', 'Tea & Spices', 'Workshops', 'Art'];

export default function MarketplaceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Marketplace');
  
  const [loading, setLoading] = useState(true);
  const [handcrafted, setHandcrafted] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [experiences, setExperiences] = useState([]);

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const prompt = `Generate a realistic JSON list of Sri Lankan marketplace items for a mobile app. 
      Do NOT wrap in markdown.
      Schema:
      {
        "handcrafted": [
          { "id": "1", "name": "Traditional Ves Mask", "price": 120, "desc": "Hand-carved Kaduru wood", "rating": 4.9, "reviews": 42, "image": "https://images.unsplash.com/photo-1590494490899-72c1c696e5d2" }
        ],
        "flavors": [
          { "id": "1", "name": "Private Reserve Ceylon Tea", "price": 45, "image": "https://images.unsplash.com/photo-1576092762791-dd9e2220abd4" },
          { "id": "2", "name": "Organic Spice Box", "price": 32 }
        ],
        "experiences": [
          { "id": "1", "name": "Rural Cooking Masterclass", "duration": "4 Hours", "location": "Sigiriya", "price": 55, "image": "https://images.unsplash.com/photo-1556910103-1c02745aae4d" }
        ]
      }
      Provide 2 handcrafted items, 2 flavors, and 2 experiences. Use realistic high-quality Unsplash image URLs.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (!data || !data.choices || !data.choices[0]) {
        throw new Error('API Error');
      }
      
      const parsed = JSON.parse(data.choices[0].message.content);
      
      // Fallback images just in case AI hallucinates bad URLs
      const safeHandcrafted = parsed.handcrafted?.map((h, i) => ({...h, image: h.image || `https://images.unsplash.com/photo-1601248464673-9eb1f5850444?w=500&q=${i}`})) || [];
      const safeFlavors = parsed.flavors || [];
      const safeExperiences = parsed.experiences?.map((e, i) => ({...e, image: e.image || `https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=${i}`})) || [];

      setHandcrafted(safeHandcrafted);
      setFlavors(safeFlavors);
      setExperiences(safeExperiences);
      
    } catch (error) {
      console.warn("Using fallback data due to API error", error);
      // Fallback Data
      setHandcrafted([
        { id: '1', name: 'Traditional Ves Mask', price: 120, desc: 'Hand-carved Kaduru wood, painted with natural pigments by master artisans in...', rating: 4.9, reviews: 42, image: 'https://images.unsplash.com/photo-1590494490899-72c1c696e5d2' },
        { id: '2', name: 'Artisan Indigo Batik', price: 85, desc: 'Sustainable cotton-silk blend, hand-waxed and dyed using traditional...', rating: 5.0, reviews: 18, image: 'https://images.unsplash.com/photo-1558485293-138350dbb0ce' }
      ]);
      setFlavors([
        { id: '1', name: 'Private Reserve Ceylon Tea', price: 45, image: 'https://images.unsplash.com/photo-1576092762791-dd9e2220abd4' },
        { id: '2', name: 'Organic Spice Box', price: 32 }
      ]);
      setExperiences([
        { id: '1', name: 'Rural Cooking Masterclass', duration: '4 Hours', location: 'Sigiriya', price: 55, image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d' },
        { id: '2', name: 'Pottery & Clay Sculpture', duration: '3 Hours', location: 'Molagoda', price: 40, image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.openDrawer ? navigation.openDrawer() : null}>
          <MaterialCommunityIcons name="menu" size={28} color="#00695C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore Sri Lanka</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="magnify" size={26} color="#00695C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Search */}
        <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
          <Searchbar
            placeholder="Search for hand-carved masks, Ceylo..."
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
          {FILTERS.map((f, i) => (
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
            <Text style={{ marginTop: 15, color: '#00695C', fontFamily: 'Outfit-Medium' }}>Groq AI curating real items...</Text>
          </View>
        ) : (
          <>
            {/* Handcrafted Goods Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Handcrafted Goods</Text>
              <Text style={styles.viewAll}>View All →</Text>
            </View>
            
            <View style={styles.handcraftedContainer}>
              {handcrafted.map((item, index) => (
                <Surface key={index} style={styles.hcCard} elevation={2}>
                  <View style={styles.hcImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.hcImage} />
                    <View style={styles.ecoBadge}>
                      <MaterialCommunityIcons name="leaf" size={12} color="#FFF" />
                      <Text style={styles.ecoBadgeText}>ECO-CERT</Text>
                    </View>
                  </View>
                  <View style={styles.hcContent}>
                    <View style={styles.hcRow}>
                      <Text style={styles.hcTitle}>{item.name}</Text>
                      <Text style={styles.hcPrice}>${item.price}</Text>
                    </View>
                    <Text style={styles.hcDesc} numberOfLines={2}>{item.desc}</Text>
                    
                    <View style={styles.hcBottomRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="star-outline" size={14} color="#B8860B" />
                        <Text style={styles.hcRating}>{item.rating} ({item.reviews} reviews)</Text>
                      </View>
                      <TouchableOpacity style={styles.cartBtnSm}>
                        <MaterialCommunityIcons name="cart-outline" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Surface>
              ))}
            </View>

            {/* Local Flavors Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Local Flavors</Text>
              <Text style={styles.viewAll}>View All →</Text>
            </View>
            
            <View style={{ paddingHorizontal: 15 }}>
              {flavors[0] && (
                <TouchableOpacity style={styles.flavorBanner}>
                  <Image source={{ uri: flavors[0].image || 'https://images.unsplash.com/photo-1576092762791-dd9e2220abd4' }} style={styles.flavorBannerImg} />
                  <View style={styles.flavorBannerOverlay}>
                    <Text style={styles.fbTitle}>{flavors[0].name}</Text>
                    <Text style={styles.fbSub}>Direct from the Nuwara Eliya highlands.</Text>
                    <View style={styles.fbBottom}>
                      <Text style={styles.fbPrice}>${parseFloat(flavors[0].price).toFixed(2)}</Text>
                      <TouchableOpacity style={styles.purchaseBtn}>
                        <Text style={styles.purchaseText}>Purchase Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              <View style={styles.flavorGrid}>
                {flavors[1] && (
                  <Surface style={styles.flavorBox1} elevation={1}>
                    <Text style={styles.boxTitle}>Organic  <Text style={styles.boxPrice}>${flavors[1].price}</Text></Text>
                    <Text style={styles.boxTitle}>{flavors[1].name?.split(' ')[1] || 'Spice'}</Text>
                    <Text style={styles.boxTitle}>{flavors[1].name?.split(' ')[2] || 'Box'}</Text>
                    <Text style={styles.boxSub}>True{'\n'}Cinnamon{'\n'}&{'\n'}Cardamom</Text>
                    
                    <View style={styles.boxBottomRow}>
                      <View style={styles.dotsRow}>
                        <View style={[styles.dot, {backgroundColor: '#F0F0F0'}]} />
                        <View style={[styles.dot, {backgroundColor: '#D0D0E0', marginLeft: -8}]} />
                        <View style={[styles.dot, {backgroundColor: '#9090A0', marginLeft: -8}]} />
                      </View>
                      <TouchableOpacity style={styles.miniCartBtn}>
                        <MaterialCommunityIcons name="shopping-outline" size={16} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </Surface>
                )}
                
                <Surface style={styles.flavorBox2} elevation={1}>
                  <Text style={styles.box2Title}>Curated{'\n'}Flavor{'\n'}Journey</Text>
                  <Text style={styles.box2Sub}>A monthly{'\n'}subscription of{'\n'}island rarities.</Text>
                  <TouchableOpacity style={styles.exploreBtn}>
                    <Text style={styles.exploreBtnText}>Explore{'\n'}Subscription</Text>
                  </TouchableOpacity>
                </Surface>
              </View>
            </View>

            {/* Authentic Experiences Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Authentic Experiences</Text>
            </View>
            
            <View style={{ paddingHorizontal: 15, gap: 15 }}>
              {experiences.map((exp, index) => (
                <TouchableOpacity key={index} style={styles.expCard}>
                  <Image source={{ uri: exp.image }} style={styles.expImage} />
                  <LinearGradientOverlay />
                  <View style={styles.expContent}>
                    <View style={styles.expTag}><Text style={styles.expTagText}>{index === 0 ? 'Workshop' : 'Artisan Class'}</Text></View>
                    <Text style={styles.expTitle}>{exp.name}</Text>
                    
                    <View style={styles.expMetaRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#E0E0E0" />
                      <Text style={styles.expMetaText}>{exp.duration}</Text>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color="#E0E0E0" style={{ marginLeft: 10 }} />
                      <Text style={styles.expMetaText}>{exp.location}</Text>
                    </View>
                    
                    <View style={styles.expBottom}>
                      <Text style={styles.expPrice}>${exp.price} / person</Text>
                      <TouchableOpacity style={styles.bookWhiteBtn}>
                        <Text style={styles.bookWhiteText}>Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

          </>
        )}
      </ScrollView>

      {/* Floating SOS Button */}
      <TouchableOpacity style={styles.sosButton}>
        <MaterialCommunityIcons name="car-emergency" size={24} color="#FFF" />
      </TouchableOpacity>
      
    </View>
  );
}

// Helper for gradient overlay without extra imports
const LinearGradientOverlay = () => (
  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15 }]} />
);

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
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 15, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#222' },
  viewAll: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#00695C' },
  
  handcraftedContainer: { paddingHorizontal: 15, gap: 15 },
  hcCard: { backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden' },
  hcImageContainer: { width: '100%', height: 160 },
  hcImage: { width: '100%', height: '100%' },
  ecoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#D4AF37', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  ecoBadgeText: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#FFF' },
  hcContent: { padding: 15 },
  hcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  hcTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333', flex: 1 },
  hcPrice: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#00695C' },
  hcDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginBottom: 15, lineHeight: 18 },
  hcBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hcRating: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#888', marginLeft: 4 },
  cartBtnSm: { backgroundColor: '#00695C', padding: 8, borderRadius: 8 },
  
  flavorBanner: { width: '100%', height: 180, borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  flavorBannerImg: { width: '100%', height: '100%' },
  flavorBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, justifyContent: 'flex-end' },
  fbTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF', lineHeight: 28 },
  fbSub: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#EEE', marginBottom: 15 },
  fbBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fbPrice: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF' },
  purchaseBtn: { backgroundColor: '#00695C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  purchaseText: { color: '#FFF', fontFamily: 'Outfit-Medium', fontSize: 13 },
  
  flavorGrid: { flexDirection: 'row', gap: 15 },
  flavorBox1: { flex: 1, backgroundColor: '#F0F5F0', borderRadius: 15, padding: 15, height: 180 },
  boxTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#222' },
  boxPrice: { color: '#00695C' },
  boxSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 10, lineHeight: 18 },
  boxBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1 },
  dotsRow: { flexDirection: 'row' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' },
  miniCartBtn: { backgroundColor: '#FFF', padding: 8, borderRadius: 8, elevation: 2 },
  
  flavorBox2: { flex: 1, backgroundColor: '#00695C', borderRadius: 15, padding: 15, height: 180, justifyContent: 'space-between' },
  box2Title: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF' },
  box2Sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', lineHeight: 16 },
  exploreBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 8 },
  exploreBtnText: { color: '#FFF', fontSize: 11, fontFamily: 'Outfit-Medium', textAlign: 'center' },
  
  expCard: { width: '100%', height: 200, borderRadius: 15, overflow: 'hidden', justifyContent: 'flex-end', padding: 15 },
  expImage: { ...StyleSheet.absoluteFillObject },
  expContent: { zIndex: 2 },
  expTag: { alignSelf: 'flex-start', backgroundColor: '#B8860B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
  expTagText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#FFF' },
  expTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#FFF', marginBottom: 8 },
  expMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  expMetaText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#E0E0E0', marginLeft: 4 },
  expBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expPrice: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },
  bookWhiteBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  bookWhiteText: { color: '#00695C', fontFamily: 'Outfit-Bold', fontSize: 13 },
  
  sosButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', elevation: 6 },
});
