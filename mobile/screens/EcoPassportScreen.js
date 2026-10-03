import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Image, Alert } from 'react-native';
import { Text, Surface, ProgressBar, IconButton, Button, Avatar, Chip, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { auth } from '../firebaseConfig';
import { loadEcoStats } from '../utils/ecoStats';

const { width } = Dimensions.get('window');

export default function EcoPassportScreen({ navigation }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadEcoStats(auth.currentUser?.uid)
      .then(setStats)
      .catch(e => {
        console.log('Eco stats error:', e.message);
        setStats(null);
      });
  }, []);

  const s = stats || { points: 0, rank: 'Explorer', co2SavedKg: 0, greenKm: 0, itineraries: 0, reviews: 0, progress: 0, nextRank: 'Eco Friend', pointsToNext: 300 };
  const badges = [
    { icon: 'leaf', label: 'Trip Planner', earned: s.itineraries >= 1 },
    { icon: 'train', label: 'Green Commute', earned: !!s.usedTransit },
    { icon: 'walk', label: 'Walker', earned: !!s.walked },
    { icon: 'star', label: 'Reviewer', earned: s.reviews >= 1 },
    { icon: 'map-marker-multiple', label: 'Globetrotter', earned: s.itineraries >= 3 },
    { icon: 'trophy', label: 'Eco Legend', earned: s.rank === 'Eco Legend' },
  ];
  // A mature tree absorbs roughly 21 kg of CO2 per year
  const treesEquivalent = Math.round((s.co2SavedKg / 21) * 10) / 10;

  const shareCertificate = async () => {
    const name = auth.currentUser?.displayName || 'CEYLO Traveller';
    const html = `
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px; border: 8px solid #1B5E20;">
        <h1 style="color: #1B5E20;">CEYLO Eco-Certificate</h1>
        <p>This certifies that</p>
        <h2>${name}</h2>
        <p>has reached the rank of <b>${s.rank}</b> with <b>${s.points}</b> Eco Points,</p>
        <p>travelling ${s.greenKm} km by low-carbon transport and saving an estimated ${s.co2SavedKg} kg of CO2.</p>
        <p style="color: #666;">${new Date().toDateString()}</p>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Error', 'Could not create the certificate.');
    }
  };

  const Badge = ({ icon, label, locked }) => (
    <View style={styles.badgeWrapper}>
      <Surface style={[styles.badge, locked && { backgroundColor: '#F5F5F5' }]} elevation={locked ? 0 : 2}>
        <MaterialCommunityIcons name={icon} size={32} color={locked ? '#CCC' : '#4CAF50'} />
      </Surface>
      <Text style={[styles.badgeLabel, locked && { color: '#999' }]}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1B5E20', '#4CAF50']} style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton icon="arrow-left" iconColor="#FFF" onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Eco Passport</Text>
          <IconButton icon="share-variant" iconColor="#FFF" onPress={shareCertificate} />
        </View>

        <View style={styles.profileBox}>
          <Surface style={styles.avatarSurface} elevation={4}>
            {auth.currentUser?.photoURL
              ? <Avatar.Image size={80} source={{ uri: auth.currentUser.photoURL }} />
              : <Avatar.Icon size={80} icon="account" style={{ backgroundColor: '#4CAF50' }} />}
          </Surface>
          <Text style={styles.rankText}>{s.rank}</Text>
          <Text style={styles.pointText}>{s.points} Eco Points</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        <Surface style={styles.statsCard} elevation={2}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{s.co2SavedKg}kg</Text>
              <Text style={styles.statLab}>CO2 Saved</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{badges.filter(b => b.earned).length}</Text>
              <Text style={styles.statLab}>Badges</Text>
            </View>
          </View>
          <Divider style={{ marginVertical: 15 }} />
          <Text style={styles.progTitle}>{s.nextRank ? `Next Rank: ${s.nextRank}` : 'Top rank reached!'}</Text>
          <ProgressBar progress={s.progress} color="#4CAF50" style={styles.progress} />
          <Text style={styles.progSub}>{s.nextRank ? `${s.pointsToNext} pts to go` : 'Keep exploring sustainably'}</Text>
        </Surface>

        <Text style={styles.sectionTitle}>Your Achievements</Text>
        <View style={styles.badgeGrid}>
          {badges.map(b => <Badge key={b.label} icon={b.icon} label={b.label} locked={!b.earned} />)}
        </View>

        <Surface style={styles.impactCard} elevation={1}>
          <Text style={styles.impactTitle}>Your Impact is Equal to:</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <MaterialCommunityIcons name="tree" size={40} color="#4CAF50" />
              <Text style={styles.impactVal}>{treesEquivalent}</Text>
              <Text style={styles.impactLab}>Tree-Years of CO2</Text>
            </View>
            <View style={styles.impactItem}>
              <MaterialCommunityIcons name="bus" size={40} color="#FFB300" />
              <Text style={styles.impactVal}>{s.greenKm}</Text>
              <Text style={styles.impactLab}>Low-Carbon km</Text>
            </View>
          </View>
        </Surface>

        <Button 
          mode="contained" 
          icon="certificate" 
          style={styles.certBtn} 
          buttonColor="#00695C"
          onPress={shareCertificate}
        >
          View Eco-Certificate
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 80, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#FFF' },
  profileBox: { alignItems: 'center' },
  avatarSurface: { padding: 4, borderRadius: 44, backgroundColor: '#FFF', marginBottom: 15 },
  rankText: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF' },
  pointText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)' },
  cardContainer: { padding: 24, marginTop: -40 },
  statsCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 20, marginBottom: 30 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1B5E20' },
  statLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
  divider: { width: 1, backgroundColor: '#EEE', height: 30 },
  progTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#333', marginBottom: 10 },
  progress: { height: 10, borderRadius: 5 },
  progSub: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#999', marginTop: 5, textAlign: 'right' },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 20 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 30 },
  badgeWrapper: { width: width / 3.8, alignItems: 'center' },
  badge: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  badgeLabel: { fontSize: 10, fontFamily: 'Outfit-SemiBold', textAlign: 'center', color: '#333' },
  impactCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 30 },
  impactTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 20 },
  impactRow: { flexDirection: 'row', justifyContent: 'space-around' },
  impactItem: { alignItems: 'center', gap: 5 },
  impactVal: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#333' },
  impactLab: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#666' },
  certBtn: { borderRadius: 15, height: 55, justifyContent: 'center', marginBottom: 40 },
});
