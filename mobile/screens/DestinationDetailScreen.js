import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, IconButton, Button, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function DestinationDetailScreen({ route, navigation }) {
  const place = route?.params?.place || {};
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [aiData, setAiData] = useState(null);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setUserLoc(loc.coords);
    })();
    fetchInsights();
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if(!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const prompt = `Analyze the Sri Lankan destination: ${place.name || 'Sigiriya'} (${place.province || 'Central Province'}). Category: ${place.category || 'Heritage'}. 
Provide a JSON response with the following strictly formatted keys:
{
  "translation": "The Sinhala and Tamil names (e.g., වික්ටෝරියා උද්‍යානය • விக்டோரியா பூங்கா)",
  "ai_insight": "A captivating, engaging 3-sentence description of its history, significance, and what visitors experience.",
  "history": "A detailed paragraph explaining the historical background and origin of this location.",
  "practical_info": "A bullet-style summary of tips (e.g. what to wear, entry fees, warnings).",
  "opening_hours": "e.g., 08:00 - 18:00",
  "best_time": "e.g., Early Morning",
  "distance_from_hub": "e.g., 17 km • 30 mins (from the nearest major city/hub)",
  "explore_nearby": [
    { "name": "Nearby Attraction 1", "image": "https://images.unsplash.com/photo-1588693959664-98e6c7102711" },
    { "name": "Nearby Attraction 2", "image": "https://images.unsplash.com/photo-1589923188900-85dae523342b" },
    { "name": "Nearby Attraction 3", "image": "https://images.unsplash.com/photo-1576092762791-dd9e2220abd4" }
  ]
}
Only output the raw JSON string without markdown wrapping.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (!data || !data.choices || !data.choices[0]) {
        throw new Error('Invalid response from Groq API: ' + JSON.stringify(data));
      }
      
      let resultText = data.choices[0].message.content;
      
      resultText = resultText.replace(/```json\n?|\n?```/gi, '').trim();
      
      const parsed = JSON.parse(resultText);
      setAiData(parsed);
    } catch (error) {
      console.error('Failed to fetch AI insights', error);
      setAiData({
        translation: "සීගිරිය • சிகிரியா",
        ai_insight: place.description || "A wonderful destination to explore.",
        history: "A beautiful location with a deep cultural past.",
        practical_info: "Wear comfortable shoes and bring water.",
        opening_hours: "08:00 - 18:00",
        best_time: "08:00 AM",
        distance_from_hub: "15 km • 25 mins",
        explore_nearby: [
          { name: "Hakgala Gardens", image: "https://images.unsplash.com/photo-1588693959664-98e6c7102711" },
          { name: "Gregory Lake", image: "https://images.unsplash.com/photo-1589923188900-85dae523342b" },
          { name: "Pedro Tea Factory", image: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd4" }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const TABS = ['Overview', 'History', 'Practical Info', 'Reviews'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: place.image || 'https://images.unsplash.com/photo-1589923188900-85dae523342b' }} style={styles.heroImage} />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} />
          
          <IconButton icon="arrow-left" iconColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />
          <IconButton icon="share-variant" iconColor="#FFF" style={styles.shareBtn} />
          <IconButton icon="heart-outline" iconColor="#FFF" style={styles.favBtn} />

          <View style={styles.heroTags}>
            <View style={styles.pillBadge}><Text style={styles.pillText}>{place.category || 'Destination'}</Text></View>
            <View style={[styles.pillBadge, { backgroundColor: '#00695C' }]}><Text style={[styles.pillText, {color:'#FFF'}]}>{place.province || 'Sri Lanka'}</Text></View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{place.name || 'Destination'}</Text>
              <Text style={styles.subTitle}>{aiData?.translation || '...'}</Text>
            </View>
            <Surface style={styles.ecoRing} elevation={2}>
              <Text style={styles.ecoValue}>{place.ecoScore || 80}</Text>
              <Text style={styles.ecoLabel}>ECO</Text>
            </Surface>
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color="#00695C" />
              <Text style={styles.loadingText}>Groq AI is analyzing this destination...</Text>
            </View>
          ) : null}

          {!loading && activeTab === 'Overview' && (
            <View>
              {/* AI Insights Section */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="robot-outline" size={24} color="#00695C" />
                <Text style={styles.sectionTitle}>AI Insights</Text>
              </View>
              <Surface style={styles.aiCard} elevation={0}>
                <Text style={styles.aiText}>{aiData?.ai_insight}</Text>
              </Surface>

              {/* Quick Info Grid */}
              <View style={styles.quickInfoRow}>
                <Surface style={styles.quickInfoCard} elevation={0}>
                  <View style={styles.quickInfoLabelRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#00695C" />
                    <Text style={styles.quickInfoLabel}>Opening Hours</Text>
                  </View>
                  <Text style={styles.quickInfoValue}>{aiData?.opening_hours}</Text>
                  <Text style={styles.quickInfoSub}>Open Daily</Text>
                </Surface>

                <Surface style={styles.quickInfoCard} elevation={0}>
                  <View style={styles.quickInfoLabelRow}>
                    <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#B8860B" />
                    <Text style={styles.quickInfoLabel}>Best Time</Text>
                  </View>
                  <Text style={styles.quickInfoValue}>{aiData?.best_time}</Text>
                  <Text style={styles.quickInfoSub}>Avoid Midday Heat</Text>
                </Surface>
              </View>

              {/* Distance Box */}
              <TouchableOpacity onPress={() => navigation.navigate('Transport', { destination: place })} activeOpacity={0.8}>
                <Surface style={styles.distanceBox} elevation={0}>
                  <MaterialCommunityIcons name="car" size={20} color="#FFF" style={styles.distanceIconBg} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.distanceLabel}>Distance from your location</Text>
                    <Text style={styles.distanceValue}>
                      {place.coords && userLoc ? `${getDistance(userLoc.latitude, userLoc.longitude, place.coords.latitude, place.coords.longitude)} km away` : aiData?.distance_from_hub}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                </Surface>
              </TouchableOpacity>

              {/* Explore Nearby Grid */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Explore Nearby</Text>
              <View style={styles.masonryGrid}>
                {aiData?.explore_nearby && aiData.explore_nearby.length >= 3 && (
                  <>
                    {/* Large Left Item */}
                    <View style={styles.masonryLeft}>
                      <Image source={{ uri: aiData.explore_nearby[0].image }} style={styles.masonryImgLarge} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.masonryGradient} />
                      <Text style={styles.masonryTag}>RECOMMENDED</Text>
                      <Text style={styles.masonryTitle}>{aiData.explore_nearby[0].name}</Text>
                    </View>

                    {/* Right Stack */}
                    <View style={styles.masonryRight}>
                      <Image source={{ uri: aiData.explore_nearby[1].image }} style={styles.masonryImgSmall} />
                      <View style={styles.masonryImgSmallWrapper}>
                        <Image source={{ uri: aiData.explore_nearby[2].image }} style={styles.masonryImgSmall} />
                        <View style={styles.pinOverlay}>
                          <MaterialCommunityIcons name="map-marker" size={16} color="#FFF" />
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {!loading && activeTab === 'History' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Historical Background</Text>
              <Text style={styles.description}>{aiData?.history}</Text>
            </View>
          )}

          {!loading && activeTab === 'Practical Info' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Visitor Tips</Text>
              <Text style={styles.description}>{aiData?.practical_info}</Text>
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>Best Time to Visit</Text>
              <Text style={styles.description}>{aiData?.best_time}</Text>
            </View>
          )}

          {!loading && activeTab === 'Reviews' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewName}>Sarah Jenkins</Text>
                <Text style={styles.reviewStars}>⭐⭐⭐⭐⭐</Text>
                <Text style={styles.reviewText}>"Absolutely breathtaking! The climb was tough but the view from the top is unlike anything else."</Text>
              </View>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewName}>David M.</Text>
                <Text style={styles.reviewStars}>⭐⭐⭐⭐</Text>
                <Text style={styles.reviewText}>"Very crowded during the weekend, but the historical value is incredible. Bring plenty of water!"</Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Button mode="outlined" icon="calendar-plus" textColor="#333" style={styles.outlineBtn} contentStyle={{ height: 50 }}>
          Add to Itinerary
        </Button>
        <Button mode="contained" icon="car" buttonColor="#00695C" style={styles.solidBtn} contentStyle={{ height: 50 }} onPress={() => navigation.navigate('Transport', { destination: place })}>
          Book Transport
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: width, height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  topGradient: { ...StyleSheet.absoluteFillObject, height: 100 },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  shareBtn: { position: 'absolute', top: 40, right: 60 },
  favBtn: { position: 'absolute', top: 40, right: 10 },
  heroTags: { position: 'absolute', bottom: 40, left: 24, flexDirection: 'row', gap: 10 },
  pillBadge: { backgroundColor: '#00695C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#FFF' },
  content: { paddingHorizontal: 24, paddingVertical: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#333', lineHeight: 32 },
  subTitle: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#999', marginTop: 4 },
  ecoRing: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F9FBE7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5, marginTop: -30 },
  ecoValue: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#827717' },
  ecoLabel: { fontSize: 8, fontFamily: 'Outfit-Bold', color: '#827717' },
  thumbnailRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 20 },
  thumbnail: { width: 70, height: 50, borderRadius: 10 },
  tabContainer: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#00695C' },
  tabText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#999' },
  activeTabText: { color: '#00695C', fontFamily: 'Outfit-Bold' },
  loadingArea: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 15, fontFamily: 'Outfit-Medium', color: '#666' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
  aiCard: { backgroundColor: '#F9FBF9', padding: 20, borderRadius: 15, marginBottom: 20 },
  aiText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#444', lineHeight: 22 },
  quickInfoRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  quickInfoCard: { flex: 1, backgroundColor: '#F5F7F5', padding: 15, borderRadius: 15 },
  quickInfoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  quickInfoLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#00695C' },
  quickInfoValue: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#333' },
  quickInfoSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#999', marginTop: 2 },
  distanceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 15 },
  distanceIconBg: { backgroundColor: '#00695C', padding: 8, borderRadius: 20 },
  distanceLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  distanceValue: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#333' },
  masonryGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  masonryLeft: { flex: 1, height: 210, borderRadius: 15, overflow: 'hidden', position: 'relative' },
  masonryImgLarge: { width: '100%', height: '100%' },
  masonryGradient: { position: 'absolute', bottom: 0, width: '100%', height: 100 },
  masonryTag: { position: 'absolute', bottom: 30, left: 15, color: '#E0E0E0', fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
  masonryTitle: { position: 'absolute', bottom: 12, left: 15, color: '#FFF', fontSize: 14, fontFamily: 'Outfit-SemiBold' },
  masonryRight: { flex: 1, gap: 10, height: 210 },
  masonryImgSmall: { width: '100%', height: 100, borderRadius: 15 },
  masonryImgSmallWrapper: { position: 'relative', width: '100%', height: 100 },
  pinOverlay: { position: 'absolute', bottom: -5, right: 10, backgroundColor: '#FF5252', padding: 10, borderRadius: 20 },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 15, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', gap: 10, zIndex: 100, elevation: 10 },
  outlineBtn: { flex: 1, borderRadius: 10, borderColor: '#DDD', backgroundColor: '#F5F5F5' },
  solidBtn: { flex: 1, borderRadius: 10 },
  tabContent: { marginTop: 10, minHeight: 300 },
  description: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#555', lineHeight: 24 },
  reviewCard: { backgroundColor: '#F9FBF9', padding: 15, borderRadius: 10, marginBottom: 15 },
  reviewName: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  reviewStars: { fontSize: 12, marginVertical: 4 },
  reviewText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', fontStyle: 'italic' }
});
