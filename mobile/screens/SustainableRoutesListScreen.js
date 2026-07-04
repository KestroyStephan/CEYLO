import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProgressiveImage from '../components/ProgressiveImage';

const COLORS = {
  primary: '#00695C',
  dark: '#004D40',
  accent: '#D4AF37',
  ecoGreen: '#2E7D32',
  bg: '#F9FCF8',
  text: '#1A1A2E',
  sub: '#6B7280',
};

// Route data (same as HomeScreen to ensure consistency)
const ROUTES = [
  {
      id: 'route_1',
      title: 'Central Eco-Trail',
      subtitle: 'Knuckles & Horton Plains',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Knuckles_mountain_range_Sri_Lanka.jpg/800px-Knuckles_mountain_range_Sri_Lanka.jpg',
      duration: '3 Days',
      cost: 'LKR 15k',
      ecoScore: 92,
      type: 'Nature'
  },
  {
      id: 'route_2',
      title: 'Southern Heritage',
      subtitle: 'Galle Fort & Marine Life',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Galle_Fort_Lighthouse_Sri_Lanka.jpg/800px-Galle_Fort_Lighthouse_Sri_Lanka.jpg',
      duration: '2 Days',
      cost: 'LKR 12k',
      ecoScore: 85,
      type: 'Culture'
  },
  {
      id: 'route_3',
      title: 'Northern Peninsula',
      subtitle: 'Jaffna & Delft Island',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Nallur_Kandaswamy_Temple_Jaffna.jpg/800px-Nallur_Kandaswamy_Temple_Jaffna.jpg',
      duration: '4 Days',
      cost: 'LKR 20k',
      ecoScore: 95,
      type: 'Untouched'
  },
  {
      id: 'route_4',
      title: 'Eastern Safari',
      subtitle: 'Arugam Bay & Kumana',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Elephant_at_Yala_National_Park_Sri_Lanka.jpg/800px-Elephant_at_Yala_National_Park_Sri_Lanka.jpg',
      duration: '3 Days',
      cost: 'LKR 18k',
      ecoScore: 88,
      type: 'Wildlife'
  },
  {
      id: 'route_5',
      title: 'Cultural Triangle',
      subtitle: 'Sigiriya to Polonnaruwa',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Sigiriya_rock_fortress.jpg/800px-Sigiriya_rock_fortress.jpg',
      duration: '3 Days',
      cost: 'LKR 25k',
      ecoScore: 80,
      type: 'Heritage'
  },
  {
      id: 'route_6',
      title: 'Tea Country Train',
      subtitle: 'Kandy to Ella Scenic',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Nine_Arch_Bridge%2C_Demodara.jpg/800px-Nine_Arch_Bridge%2C_Demodara.jpg',
      duration: '1 Day',
      cost: 'LKR 5k',
      ecoScore: 98,
      type: 'Scenic'
  }
];

export default function SustainableRoutesListScreen({ navigation }) {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => navigation.navigate('ItineraryDetail', { routeData: item })}
      style={styles.cardContainer}
    >
      <View style={styles.routeCard}>
        <ProgressiveImage source={{ uri: item.image }} style={styles.routeImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.routeOverlay}>
          <View style={styles.cardTop}>
            <View style={[styles.routeTypeTag, { backgroundColor: item.type === 'Nature' || item.type === 'Wildlife' ? COLORS.ecoGreen : item.type === 'Untouched' ? '#0277BD' : COLORS.accent }]}>
              <Text style={styles.routeTypeText}>{item.type}</Text>
            </View>
            <View style={styles.ecoBadge}>
              <MaterialCommunityIcons name="leaf" size={14} color={COLORS.ecoGreen} />
              <Text style={styles.ecoBadgeText}>{item.ecoScore}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.routeTitle}>{item.title}</Text>
            <Text style={styles.routeSubtitle}>{item.subtitle}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#FFF" />
                <Text style={styles.metaText}>{item.duration}</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>•</Text>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="cash" size={14} color="#FFF" />
                <Text style={styles.metaText}>{item.cost}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={COLORS.dark} style={{ marginLeft: -10 }} />
        <View>
          <Text style={styles.headerTitle}>Sustainable Routes</Text>
          <Text style={styles.headerSub}>Curated low-carbon itineraries</Text>
        </View>
      </View>
      <FlatList
        data={ROUTES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 15 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: COLORS.dark },
  headerSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  cardContainer: { width: '100%', height: 220 },
  routeCard: { flex: 1, borderRadius: 20, overflow: 'hidden', elevation: 4, backgroundColor: '#EEE' },
  routeImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  routeOverlay: { flex: 1, padding: 20, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTypeTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  routeTypeText: { color: '#FFF', fontSize: 11, fontFamily: 'Outfit-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  ecoBadgeText: { color: COLORS.ecoGreen, fontFamily: 'Outfit-Bold', fontSize: 12 },
  routeTitle: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 22, marginBottom: 4 },
  routeSubtitle: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit-Medium' },
});
