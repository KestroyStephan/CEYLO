import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, Card, Switch, ActivityIndicator, Surface, ProgressBar } from 'react-native-paper';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { startLocationTracking } from '../services/DriverLocationService';

const { width } = Dimensions.get('window');

export default function DriverDashboard({ navigation }) {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoOptimizer, setEcoOptimizer] = useState(true);
  const [stats, setStats] = useState({ earnings: '12,500', trips: 14, ecoScore: 92 });
  const [driverName, setDriverName] = useState('Driver');
  const [driverData, setDriverData] = useState(null);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();

    const user = auth.currentUser;
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setDriverName(snap.data().name || 'Driver');
      }
    });

    return () => {
      unsubUser();
    };
  }, []);

  // 1. On mount, read drivers/{uid}.isOnline from Firestore via onSnapshot
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubDriver = onSnapshot(doc(db, 'drivers', user.uid), (snap) => {
      if (snap.exists()) {
        setDriverData(snap.data());
        setIsOnline(snap.data().isOnline || false);
      }
    });
    return () => unsubDriver();
  }, []);

  // Real-time listener for pending ride requests matching driver's vehicleType
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !isOnline || !driverData?.vehicleType) {
      setRideRequests([]);
      return;
    }

    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending'),
      where('vehicleType', '==', driverData.vehicleType)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRideRequests(requests);
    }, (error) => {
      console.error('Ride requests error:', error);
    });

    return () => unsub();
  }, [isOnline, driverData?.vehicleType]);

  // 2. When toggle changes, write to Firestore: drivers/{uid}
  const handleToggleOnline = async (value) => {
    setIsOnline(value);
    try {
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isOnline: value,
      });
    } catch (error) {
      setIsOnline(!value); // revert on failure
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleAcceptFromDashboard = async (bookingId) => {
    setAccepting(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        driverId: auth.currentUser.uid,
        status: 'Confirmed',
        acceptedAt: new Date().toISOString(),
      });
      startLocationTracking(auth.currentUser.uid, bookingId);
      // Navigate to Ride tab (tab index 2 in DriverNavigator)
      navigation.navigate('DriverRide', { 
        bookingId: bookingId,
        fromDashboard: true 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to accept: ' + error.message);
    } finally {
      setAccepting(null);
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
            <Text style={styles.welcome}>Hi let's Ride,</Text>
            <Text style={styles.driverName}>{driverName}</Text>
          </View>
          {/* Replace existing avatar with dynamic profile photo / letter logic */}
          <TouchableOpacity onPress={() => signOut(auth)}>
            <View style={styles.avatarCircle}>
              {driverData?.profilePhotoUrl ? (
                <Image 
                  source={{ uri: driverData.profilePhotoUrl }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Text style={styles.avatarLetter}>
                  {(driverData?.name || driverName || 'D').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <Surface style={styles.onlineBar} elevation={2}>
          <View style={styles.onlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#006A3B' : '#BA1A1A' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <Switch value={isOnline} onValueChange={handleToggleOnline} color="#006A3B" />
        </Surface>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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

        {/* Real-time ride requests card */}
        {isOnline && (
          <View style={styles.rideRequestsCard}>
            <View style={styles.rideRequestsHeader}>
              <Text style={styles.rideRequestsTitle}>Ride Requests</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            {rideRequests.length === 0 ? (
              <View style={styles.scanningState}>
                <Ionicons name="radio-outline" size={32} color="#6F7A70" />
                <Text style={styles.scanningText}>Scanning for passengers...</Text>
              </View>
            ) : (
              rideRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestRoute}>
                    <Ionicons name="ellipse" size={8} color="#006A3B" />
                    <Text style={styles.requestLocation} numberOfLines={1}>
                      {request.pickup}
                    </Text>
                  </View>
                  <View style={styles.requestRoute}>
                    <Ionicons name="location" size={8} color="#BA1A1A" />
                    <Text style={styles.requestLocation} numberOfLines={1}>
                      {request.dropoff}
                    </Text>
                  </View>
                  <View style={styles.requestFooter}>
                    <Text style={styles.requestPrice}>
                      LKR {request.price?.toLocaleString() || 'TBD'}
                    </Text>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptFromDashboard(request.id)}
                      disabled={accepting === request.id}
                    >
                      {accepting === request.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { 
    color: '#FFFFFF', fontSize: 18, fontWeight: '700' 
  },
  rideRequestsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginTop: 16, elevation: 3, shadowColor: '#181D19',
    shadowOpacity: 0.08, shadowRadius: 10,
  },
  rideRequestsHeader: { 
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  rideRequestsTitle: { 
    fontSize: 16, fontWeight: '700', color: '#181D19' 
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { 
    width: 6, height: 6, borderRadius: 3, 
    backgroundColor: '#006A3B' 
  },
  liveText: { 
    fontSize: 10, fontWeight: '700', color: '#006A3B' 
  },
  scanningState: { 
    alignItems: 'center', paddingVertical: 20 
  },
  scanningText: { 
    fontSize: 13, color: '#6F7A70', marginTop: 8 
  },
  requestItem: {
    backgroundColor: '#F6FBF3', borderRadius: 12,
    padding: 12, marginBottom: 10,
  },
  requestRoute: { 
    flexDirection: 'row', alignItems: 'center', 
    gap: 8, marginBottom: 6 
  },
  requestLocation: { 
    fontSize: 13, color: '#181D19', flex: 1 
  },
  requestFooter: { 
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4,
  },
  requestPrice: { 
    fontSize: 16, fontWeight: '700', color: '#006A3B' 
  },
  acceptButton: {
    backgroundColor: '#006A3B', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 8,
  },
  acceptButtonText: { 
    color: '#FFFFFF', fontWeight: '700', fontSize: 12 
  },
});
