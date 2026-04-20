import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar, ActivityIndicator, Surface, IconButton, Divider, Chip } from 'react-native-paper';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function GuideDashboard({ navigation }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGuests, setActiveGuests] = useState([
    { id: '1', name: 'Sarah Miller', mood: 'Family', lang: 'English' },
    { id: '2', name: 'Klaus Schmidt', mood: 'Eco Explorer', lang: 'German' }
  ]);

  useEffect(() => {
    const q = query(collection(db, "tours"), where("guideId", "==", auth.currentUser?.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tourList = [];
      snapshot.forEach((doc) => tourList.push({ id: doc.id, ...doc.data() }));
      setTours(tourList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const StatBox = ({ label, value, icon, color }) => (
    <Surface style={styles.statBox} elevation={1}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <View>
        <Text style={styles.statVal}>{value}</Text>
        <Text style={styles.statLab}>{label}</Text>
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcome}>Welcome Back, Guide</Text>
            <Text style={styles.guideName}>{auth.currentUser?.displayName || 'Travel Expert'}</Text>
          </View>
          <IconButton icon="logout" iconColor="#FFF" onPress={() => signOut(auth)} />
        </View>
        <View style={styles.statsRow}>
          <StatBox label="Active Tours" value={tours.length} icon="map-marker-path" color="#00695C" />
          <StatBox label="Rating" value="4.9" icon="star" color="#FFD600" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Currently Guiding</Text>
        {activeGuests.map(guest => (
          <Surface key={guest.id} style={styles.guestCard} elevation={1}>
            <Avatar.Text size={45} label={guest.name[0]} style={{ backgroundColor: '#B2DFDB' }} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.guestName}>{guest.name}</Text>
              <View style={styles.guestMeta}>
                <Chip icon="heart" style={styles.moodChip} textStyle={{ fontSize: 10 }}>{guest.mood}</Chip>
                <Chip icon="translate" style={styles.langChip} textStyle={{ fontSize: 10 }}>{guest.lang}</Chip>
              </View>
            </View>
            <IconButton icon="message-text" iconColor="#00695C" mode="contained-tonal" />
          </Surface>
        ))}

        <View style={styles.toursHeader}>
          <Text style={styles.sectionTitle}>Upcoming Assignments</Text>
          <Button mode="text" labelStyle={{ fontFamily: 'Outfit-Bold' }}>Calendar</Button>
        </View>

        {tours.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No upcoming tours assigned.</Text>
          </View>
        ) : (
          tours.map(item => (
            <Card key={item.id} style={styles.tourCard}>
              <Card.Cover source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} style={styles.tourImg} />
              <Card.Content style={styles.tourContent}>
                <View style={styles.tourMeta}>
                  <Text style={styles.tourTitle}>{item.title}</Text>
                  <Text style={styles.tourDate}>{item.date || 'April 25, 2026'}</Text>
                </View>
                <Text style={styles.tourDesc} numberOfLines={2}>{item.description}</Text>
                <Divider style={{ marginVertical: 12 }} />
                <View style={styles.tourFooter}>
                  <View style={styles.guestCount}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#666" />
                    <Text style={styles.guestCountText}>{item.groupSize || 4} Guests</Text>
                  </View>
                  <Button mode="contained" buttonColor="#00695C" compact>Briefing</Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Surface style={styles.bottomNav} elevation={5}>
        <IconButton icon="view-dashboard" iconColor="#00695C" size={28} />
        <IconButton icon="calendar-month" iconColor="#999" size={28} />
        <View style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
        </View>
        <IconButton icon="chat" iconColor="#999" size={28} />
        <IconButton icon="account-settings" iconColor="#999" size={28} />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcome: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.7)' },
  guideName: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF' },
  statsRow: { flexDirection: 'row', gap: 15 },
  statBox: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statVal: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
  statLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
  scrollContent: { padding: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15 },
  guestCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  guestName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333' },
  guestMeta: { flexDirection: 'row', gap: 8, marginTop: 5 },
  moodChip: { backgroundColor: '#E1F5FE', height: 24 },
  langChip: { backgroundColor: '#F3E5F5', height: 24 },
  toursHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  tourCard: { borderRadius: 25, overflow: 'hidden', backgroundColor: '#FFF', marginBottom: 20, elevation: 1 },
  tourImg: { height: 160 },
  tourContent: { padding: 15 },
  tourMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  tourTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#333' },
  tourDate: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#00695C' },
  tourDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', lineHeight: 18 },
  tourFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guestCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  guestCountText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666' },
  empty: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
  emptyText: { marginTop: 10, fontFamily: 'Outfit-Medium' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 25 },
  addBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#00695C', justifyContent: 'center', alignItems: 'center', marginTop: -40, elevation: 6 },
});
