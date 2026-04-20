import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, Animated, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar, Switch, ActivityIndicator, Surface, IconButton, Divider, ProgressBar } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function DriverDashboard({ navigation }) {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoOptimizer, setEcoOptimizer] = useState(true);
  const [stats, setStats] = useState({ earnings: '12,500', trips: 14, ecoScore: 92 });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();

    const q = query(collection(db, "bookings"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = [];
      snapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      setRequests(bookings);
    });

    return () => unsubscribe();
  }, []);

  const toggleOnline = async () => {
    setIsOnline(!isOnline);
    if (auth.currentUser) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { isOnline: !isOnline });
    }
  };

  const StatCard = ({ label, value, icon, color }) => (
    <Surface style={styles.statCard} elevation={1}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
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
            <Text style={styles.welcome}>Good Morning,</Text>
            <Text style={styles.driverName}>Dhammika</Text>
          </View>
          <TouchableOpacity onPress={() => signOut(auth)}>
            <Avatar.Image size={45} source={{ uri: 'https://i.pravatar.cc/150?u=driver' }} />
          </TouchableOpacity>
        </View>

        <Surface style={styles.onlineBar} elevation={2}>
          <View style={styles.onlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF5252' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online & Accepting' : 'Currently Offline'}</Text>
          </View>
          <Switch value={isOnline} onValueChange={toggleOnline} color="#00695C" />
        </Surface>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard label="Earnings" value={`LKR ${stats.earnings}`} icon="wallet" color="#00695C" />
          <StatCard label="Eco Score" value={`${stats.ecoScore}%`} icon="leaf" color="#4CAF50" />
        </View>

        <Card style={styles.optimizerCard}>
          <Card.Content>
            <View style={styles.optHeader}>
              <View>
                <Text style={styles.optTitle}>Eco Optimizer</Text>
                <Text style={styles.optSub}>Auto-routing for fuel efficiency</Text>
              </View>
              <Switch value={ecoOptimizer} onValueChange={setEcoOptimizer} color="#4CAF50" />
            </View>
            <View style={styles.progressArea}>
              <View style={styles.progressLabels}>
                <Text style={styles.progText}>Green Bonus Progress</Text>
                <Text style={styles.progVal}>75%</Text>
              </View>
              <ProgressBar progress={0.75} color="#4CAF50" style={styles.progress} />
              <Text style={styles.hint}>Complete 2 more eco-rides for 5% commission rebate!</Text>
            </View>
          </Card.Content>
        </Card>

        <Text style={styles.sectionTitle}>Nearby Requests ({requests.length})</Text>
        {requests.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="radar" size={48} color="#CCC" />
            <Text style={styles.emptyText}>Scanning for passengers...</Text>
          </View>
        ) : (
          requests.map(item => (
            <Card key={item.id} style={styles.requestCard}>
              <Card.Content>
                <View style={styles.reqHeader}>
                  <Text style={styles.clientName}>{item.userName || "Guest"}</Text>
                  <Chip style={styles.ecoTag} textStyle={styles.ecoTagText}>Eco-Trip</Chip>
                  <Text style={styles.price}>LKR {item.price || '450'}</Text>
                </View>
                <View style={styles.route}>
                  <View style={styles.routeLine} />
                  <View style={styles.nodeRow}>
                    <MaterialCommunityIcons name="circle-slice-8" size={14} color="#00695C" />
                    <Text style={styles.nodeText} numberOfLines={1}>{item.pickup || "Main St, Colombo 01"}</Text>
                  </View>
                  <View style={[styles.nodeRow, { marginTop: 10 }]}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#D32F2F" />
                    <Text style={styles.nodeText} numberOfLines={1}>{item.dropoff || "Galle Face Green"}</Text>
                  </View>
                </View>
                <Button mode="contained" buttonColor="#00695C" style={styles.acceptBtn}>Accept Ride</Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Surface style={styles.bottomMenu} elevation={5}>
        <IconButton icon="home" iconColor="#00695C" size={28} />
        <IconButton icon="history" iconColor="#999" size={28} />
        <View style={styles.goBtn}>
          <MaterialCommunityIcons name="navigation" size={32} color="#FFF" />
        </View>
        <IconButton icon="wallet" iconColor="#999" size={28} />
        <IconButton icon="cog" iconColor="#999" size={28} />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  welcome: { fontSize: 14, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.7)' },
  driverName: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF' },
  onlineBar: { position: 'absolute', bottom: -25, width: width - 48, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  scrollContent: { marginTop: 40, padding: 24 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statVal: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
  statLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
  optimizerCard: { borderRadius: 20, backgroundColor: '#FFF', marginBottom: 25, elevation: 1 },
  optHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  optTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#00695C' },
  optSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  progressArea: { gap: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#333' },
  progVal: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  progress: { height: 8, borderRadius: 4 },
  hint: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666', fontStyle: 'italic' },
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15 },
  requestCard: { borderRadius: 20, marginBottom: 15, elevation: 1 },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  clientName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333' },
  ecoTag: { backgroundColor: '#E8F5E9', height: 24 },
  ecoTagText: { fontSize: 9, color: '#4CAF50', fontFamily: 'Outfit-Bold' },
  price: { flex: 1, textAlign: 'right', fontSize: 16, fontFamily: 'Outfit-Bold', color: '#00695C' },
  route: { paddingLeft: 5, paddingVertical: 5 },
  routeLine: { position: 'absolute', left: 11, top: 20, bottom: 20, width: 2, backgroundColor: '#E0E0E0' },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nodeText: { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#555' },
  acceptBtn: { marginTop: 15, borderRadius: 12 },
  empty: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, fontFamily: 'Outfit-Medium' },
  bottomMenu: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 25 },
  goBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#00695C', justifyContent: 'center', alignItems: 'center', marginTop: -40, elevation: 6 },
});
