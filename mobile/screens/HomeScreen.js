import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl } from 'react-native';
import { Text, Avatar, IconButton, Surface, Card, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const WEATHER_CACHE_KEY = 'cached_weather_data';
const CACHE_TTL = 3600000; // 1 hour

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState('Traveler');
  const [weather, setWeather] = useState(null);
  const [ecoSpots, setEcoSpots] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchHomeData();
    fetchWeather();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchHomeData(), fetchWeather()]).then(() => setRefreshing(false));
  }, []);

  const fetchUserData = () => {
    const user = auth.currentUser;
    if (user) setUserName(user.displayName || 'Traveler');
  };

  const fetchWeather = async () => {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setWeather(data);
          return;
        }
      }

      // Fetch from API (Using placeholder if key missing)
      const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        // Fallback mock weather for aesthetic
        const mockWeather = { temp: 28, condition: 'Sunny', icon: 'weather-sunny' };
        setWeather(mockWeather);
        return;
      }

      // Default to Colombo
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Colombo&units=metric&appid=${API_KEY}`);
      const data = await response.json();
      const weatherData = {
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        icon: getWeatherIcon(data.weather[0].main),
      };
      setWeather(weatherData);
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data: weatherData, timestamp: Date.now() }));
    } catch (error) {
      console.log('Weather fetch failed', error);
    }
  };

  const getWeatherIcon = (condition) => {
    switch (condition.toLowerCase()) {
      case 'rain': return 'weather-pouring';
      case 'clouds': return 'weather-cloudy';
      case 'clear': return 'weather-sunny';
      default: return 'weather-partly-cloudy';
    }
  };

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // Mock data if Firestore collections are empty/missing
      const spotsCol = collection(db, 'destinations');
      const q = query(spotsCol, where('isEco', '==', true), limit(5));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setEcoSpots([
          { id: '1', name: 'Sinharaja Forest', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b', rating: 4.8 },
          { id: '2', name: 'Knuckles Range', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa', rating: 4.9 },
        ]);
      } else {
        setEcoSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

      const hq = query(spotsCol, where('isHiddenGem', '==', true), limit(5));
      const hSnapshot = await getDocs(hq);
      if (hSnapshot.empty) {
        setHiddenGems([
          { id: '3', name: 'Diyaluma Falls', image: 'https://images.unsplash.com/photo-1563290231-155097486e9b', rating: 4.7 },
          { id: '4', name: 'Pidurangala Rock', image: 'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a', rating: 4.9 },
        ]);
      } else {
        setHiddenGems(hSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.log('Home data fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Ayubowan,</Text>
        <Text style={styles.name}>{userName}!</Text>
      </View>
      <View style={styles.headerRight}>
        {weather && (
          <Surface style={styles.weatherCard} elevation={1}>
            <MaterialCommunityIcons name={weather.icon} size={20} color="#00695C" />
            <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
          </Surface>
        )}
        <Avatar.Image size={40} source={{ uri: 'https://i.pravatar.cc/100' }} />
      </View>
    </View>
  );

  const AIChatPill = () => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Chatbot')}>
      <LinearGradient colors={['#00695C', '#004D40']} style={styles.aiPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <MaterialCommunityIcons name="robot" size={24} color="#FFF" />
        <Text style={styles.aiText}>Plan your perfect Eco-Trip with Ceylo AI</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
      </LinearGradient>
    </TouchableOpacity>
  );

  const Section = ({ title, data, type }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {data.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => navigation.navigate('MapScreen', { destination: item })}>
            <Card style={styles.spotCard}>
              <Card.Cover source={{ uri: item.image }} style={styles.spotImage} />
              <Card.Content style={styles.spotContent}>
                <Text style={styles.spotName}>{item.name}</Text>
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00695C']} />}
    >
      <Header />
      <AIChatPill />

      <Section title="Trending Eco Spots 🌿" data={ecoSpots} />

      <Surface style={styles.eventCard} elevation={2}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2' }} 
          style={styles.eventImage} 
        />
        <View style={styles.eventOverlay}>
          <View style={styles.eventTag}><Text style={styles.tagText}>Happening Today</Text></View>
          <Text style={styles.eventTitle}>Kandy Esala Perahera</Text>
          <Text style={styles.eventLoc}>Temple of the Tooth, Kandy</Text>
        </View>
      </Surface>

      <Section title="Hidden Gems 💎" data={hiddenGems} />

      <View style={styles.itinerarySection}>
        <Text style={styles.sectionTitle}>Your Saved trips</Text>
        <Card style={styles.emptyItinerary}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="map-marker-plus" size={40} color="#00695C" />
            <Text style={styles.emptyText}>No trips yet. Let AI help you plan one!</Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  greeting: { fontSize: 16, fontFamily: 'Outfit-Regular', color: '#666' },
  name: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#004D40' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weatherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  weatherTemp: { fontFamily: 'Outfit-Bold', color: '#00695C', fontSize: 14 },
  aiPill: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, gap: 12, marginBottom: 30 },
  aiText: { flex: 1, color: '#FFF', fontFamily: 'Outfit-Medium', fontSize: 14 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#333' },
  seeAll: { color: '#00695C', fontFamily: 'Outfit-SemiBold' },
  horizontalScroll: { gap: 15 },
  spotCard: { width: 160, borderRadius: 15, overflow: 'hidden', backgroundColor: '#FFF' },
  spotImage: { height: 120 },
  spotContent: { padding: 10 },
  spotName: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#333' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  eventCard: { width: '100%', height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 30 },
  eventImage: { ...StyleSheet.absoluteFillObject },
  eventOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', padding: 20, justifyContent: 'flex-end' },
  eventTag: { backgroundColor: '#FF7043', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  tagText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  eventTitle: { color: '#FFF', fontSize: 22, fontFamily: 'Outfit-Bold' },
  eventLoc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Outfit-Regular' },
  itinerarySection: { marginBottom: 40 },
  emptyItinerary: { borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#00695C', backgroundColor: 'transparent', elevation: 0 },
  emptyContent: { alignItems: 'center', padding: 30, gap: 10 },
  emptyText: { color: '#00695C', fontFamily: 'Outfit-Medium', fontSize: 14, textAlign: 'center' },
});
