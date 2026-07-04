import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Surface, IconButton, ActivityIndicator } from 'react-native-paper';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function GuideProfileScreen({ route, navigation }) {
  const { guide } = route.params;
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to book a guide.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        type: 'guide',
        guideId: guide.id,
        guideName: guide.name,
        touristId: auth.currentUser.uid,
        touristName: auth.currentUser.displayName || 'Tourist',
        status: 'pending',
        packageCost: guide.packageCost,
        createdAt: serverTimestamp()
      });
      Alert.alert('Success', `Booking request sent to ${guide.name}! They will review and accept it shortly.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Booking Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const SpecItem = ({ icon, label, val }) => (
    <View style={styles.specItem}>
      <MaterialCommunityIcons name={icon} size={24} color="#00695C" />
      <View style={{ marginLeft: 15 }}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specVal}>{val}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: guide.photoUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71' }} style={styles.coverImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
          <IconButton icon="arrow-left" iconColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />
          <Text style={styles.name}>{guide.name}</Text>
          <Text style={styles.subtitle}>Sri Lankan Tour Guide</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionCircle}>
              <MaterialCommunityIcons name="phone" size={24} color="#00695C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCircle}>
              <MaterialCommunityIcons name="message-text" size={24} color="#00695C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCircle}>
              <MaterialCommunityIcons name="star-outline" size={24} color="#00695C" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Surface style={styles.specsCard} elevation={0}>
            <SpecItem icon="certificate" label="License No." val={guide.guideLicense} />
            <View style={styles.divider} />
            <SpecItem icon="clock-outline" label="Experience" val={`${guide.experience} Years`} />
            <View style={styles.divider} />
            <SpecItem icon="translate" label="Languages" val={guide.languages} />
            <View style={styles.divider} />
            <SpecItem icon="map-marker-radius" label="Service Areas" val={guide.serviceAreas || 'Islandwide'} />
            <View style={styles.divider} />
            <SpecItem icon="compass-outline" label="Specializations" val={guide.specializations || 'General'} />
          </Surface>

          <Text style={styles.sectionTitle}>Pricing Details</Text>
          <Surface style={styles.priceCard} elevation={0}>
            <Text style={styles.priceText}>{guide.packageCost} LKR</Text>
            <Text style={styles.priceSub}>per day (standard rate)</Text>
          </Surface>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="contained" onPress={handleBook} loading={loading} style={styles.bookBtn} contentStyle={{ height: 60 }} labelStyle={{ fontFamily: 'Outfit-Bold', fontSize: 18 }}>
          Book Now
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  coverImage: { width: '100%', height: 350 },
  imageOverlay: { position: 'absolute', top: 0, width: '100%', height: 350, justifyContent: 'flex-end', padding: 20 },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  name: { fontSize: 32, fontFamily: 'Outfit-Bold', color: '#FFF' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit-Medium', color: '#E0F2F1', marginBottom: 10 },
  content: { padding: 20, paddingBottom: 100 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: -40, marginBottom: 30 },
  actionCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15 },
  specsCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 25 },
  specItem: { flexDirection: 'row', alignItems: 'center' },
  specLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  specVal: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#333' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  priceCard: { backgroundColor: '#E0F2F1', padding: 20, borderRadius: 20, alignItems: 'center' },
  priceText: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#00695C' },
  priceSub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#004D40' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  bookBtn: { borderRadius: 15, backgroundColor: '#00695C' }
});
