import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { Text, Surface, ProgressBar, IconButton, Button, Avatar, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function EcoPassportScreen({ navigation }) {
  const stats = {
    totalCO2Saved: '42.5kg',
    rank: 'Eco Expert',
    badges: 8,
    points: 1250,
    progress: 0.75
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
          <IconButton icon="share-variant" iconColor="#FFF" />
        </View>

        <View style={styles.profileBox}>
          <Surface style={styles.avatarSurface} elevation={4}>
            <Avatar.Image size={80} source={{ uri: 'https://i.pravatar.cc/150?u=me' }} />
          </Surface>
          <Text style={styles.rankText}>{stats.rank}</Text>
          <Text style={styles.pointText}>{stats.points} Eco Points</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        <Surface style={styles.statsCard} elevation={2}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats.totalCO2Saved}</Text>
              <Text style={styles.statLab}>CO2 Saved</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats.badges}</Text>
              <Text style={styles.statLab}>Badges</Text>
            </View>
          </View>
          <Divider style={{ marginVertical: 15 }} />
          <Text style={styles.progTitle}>Next Rank: Eco Legend</Text>
          <ProgressBar progress={stats.progress} color="#4CAF50" style={styles.progress} />
          <Text style={styles.progSub}>350 pts to go</Text>
        </Surface>

        <Text style={styles.sectionTitle}>Your Achievements</Text>
        <View style={styles.badgeGrid}>
          <Badge icon="leaf" label="Tree Planter" />
          <Badge icon="train" label="Green Commute" />
          <Badge icon="water" label="H2O Saver" />
          <Badge icon="bicycle" label="E-Tourer" />
          <Badge icon="trash-can" label="Zero Waste" locked />
          <Badge icon="solar-power" label="Sun Child" locked />
        </View>

        <Surface style={styles.impactCard} elevation={1}>
          <Text style={styles.impactTitle}>Your Impact is Equal to:</Text>
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <MaterialCommunityIcons name="tree" size={40} color="#4CAF50" />
              <Text style={styles.impactVal}>3</Text>
              <Text style={styles.impactLab}>Trees Grown</Text>
            </View>
            <View style={styles.impactItem}>
              <MaterialCommunityIcons name="lightbulb-on" size={40} color="#FFB300" />
              <Text style={styles.impactVal}>18</Text>
              <Text style={styles.impactLab}>Days of Light</Text>
            </View>
          </View>
        </Surface>

        <Button 
          mode="contained" 
          icon="certificate" 
          style={styles.certBtn} 
          buttonColor="#00695C"
          onPress={() => {}}
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
