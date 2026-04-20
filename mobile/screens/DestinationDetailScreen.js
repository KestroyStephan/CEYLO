import React from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, Button, Avatar, Chip, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DestinationDetailScreen({ route, navigation }) {
  const { place } = route.params || { 
    place: { 
      name: 'Sigiriya Rock', 
      image: 'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a',
      type: 'Cultural',
      ecoScore: 85,
      rating: 4.9,
      reviews: 1240,
      description: 'The Ancient Rock Fortress of Sigiriya is a UNESCO World Heritage site and one of the most stunning landmarks in Sri Lanka.'
    } 
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image Section */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: place.image }} style={styles.heroImage} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} />
        <IconButton icon="arrow-left" iconColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />
        <IconButton icon="heart-outline" iconColor="#FFF" style={styles.favBtn} />
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{place.name}</Text>
            <Text style={styles.location}>Matale District, Central Province</Text>
          </View>
          <Surface style={styles.ecoRing} elevation={2}>
            <Text style={styles.ecoValue}>{place.ecoScore}</Text>
            <Text style={styles.ecoLabel}>ECO SCORE</Text>
          </Surface>
        </View>

        <View style={styles.chipRow}>
          <Chip style={styles.chip} icon="leaf" textStyle={styles.chipText}>Eco-Certified</Chip>
          <Chip style={styles.chip} icon="castle" textStyle={styles.chipText}>UNESCO Site</Chip>
          <Chip style={styles.chip} icon="clock-outline" textStyle={styles.chipText}>6AM - 5PM</Chip>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{place.description}</Text>

        <Surface style={styles.infoGrid} elevation={1}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="bus-side" size={24} color="#00695C" />
            <Text style={styles.infoLabel}>Accessible by Bus</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="weather-sunny" size={24} color="#00695C" />
            <Text style={styles.infoLabel}>Best: Jan - April</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="wheelchair-accessibility" size={24} color="#00695C" />
            <Text style={styles.infoLabel}>Partial Access</Text>
          </View>
        </Surface>

        <Text style={styles.sectionTitle}>Reviews ({place.reviews})</Text>
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Avatar.Text size={36} label="JD" style={{ backgroundColor: '#00695C' }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.reviewerName}>John Doe</Text>
              <View style={styles.starRow}>
                {[1,2,3,4,5].map(i => <MaterialCommunityIcons key={i} name="star" size={14} color="#FFB300" />)}
              </View>
            </View>
            <Text style={styles.reviewDate}>2 days ago</Text>
          </View>
          <Text style={styles.reviewText}>Absolutely breathtaking! The climb is worth every step for the view from the top.</Text>
        </View>

        <Text style={styles.sectionTitle}>Eco-Verified Vendors Nearby</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vendorScroll}>
          {[1,2,3].map(i => (
            <Surface key={i} style={styles.vendorCard} elevation={1}>
              <Text style={styles.vendorName}>Heritage Stay #{i}</Text>
              <View style={styles.vendorFooter}>
                <Text style={styles.vendorPrice}>LKR 12k / night</Text>
                <MaterialCommunityIcons name="shield-check" size={18} color="#4CAF50" />
              </View>
            </Surface>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionContainer}>
        <Button mode="contained" style={styles.primaryBtn} buttonColor="#00695C" onPress={() => {}}>
          Save to Itinerary
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: width, height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  topGradient: { ...StyleSheet.absoluteFillObject, height: 100 },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  favBtn: { position: 'absolute', top: 40, right: 10 },
  content: { padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#333' },
  location: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#666' },
  ecoRing: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#4CAF50' },
  ecoValue: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  ecoLabel: { fontSize: 8, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  chip: { backgroundColor: '#F0F4F2' },
  chipText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#00695C' },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15, marginTop: 10 },
  description: { fontSize: 16, fontFamily: 'Outfit-Regular', color: '#555', lineHeight: 24, marginBottom: 25 },
  infoGrid: { flexDirection: 'row', padding: 20, borderRadius: 20, backgroundColor: '#F8F9FA', marginBottom: 25 },
  infoItem: { flex: 1, alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 10, fontFamily: 'Outfit-Medium', textAlign: 'center', color: '#666' },
  verticalDivider: { width: 1, backgroundColor: '#E0E0E0', height: 40 },
  reviewCard: { padding: 15, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 25 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewerName: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  starRow: { flexDirection: 'row', marginTop: 2 },
  reviewDate: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999' },
  reviewText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#555', lineHeight: 20 },
  vendorScroll: { marginBottom: 100 },
  vendorCard: { width: 180, padding: 15, borderRadius: 15, backgroundColor: '#FFF', marginRight: 15 },
  vendorName: { fontFamily: 'Outfit-SemiBold', color: '#333', marginBottom: 8 },
  vendorFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorPrice: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#00695C' },
  actionContainer: { position: 'absolute', bottom: 0, width: width, padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  primaryBtn: { borderRadius: 15, height: 55, justifyContent: 'center' },
});
