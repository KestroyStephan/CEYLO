import React from 'react';
import { SUSTAINABLE_ROUTES } from '../utils/destinations';
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
const ROUTES = SUSTAINABLE_ROUTES;

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
        <IconButton accessibilityLabel="Go back" icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={COLORS.dark} style={{ marginLeft: -10 }} />
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
