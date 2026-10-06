import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, Card, Switch, ActivityIndicator, Surface, ProgressBar } from 'react-native-paper';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { startLocationTracking, startAvailability, stopAvailability } from '../services/DriverLocationService';
import { requestsForDriver, acceptRide, RideTakenError, MATCH_RADIUS_KM } from '../utils/rideDispatch';
import { notifyBooking } from '../services/aiClient';
import { toast } from '../components/Toast';

const { width } = Dimensions.get('window');

export default function DriverDashboard({ navigation }) {
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earnings: 0, trips: 0, lowEmissionPct: null });
  const [driverName, setDriverName] = useState('Driver');
  const [driverData, setDriverData] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Share an approximate position while online so riders see nearby cars and requests can be matched
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !isOnline) {
      stopAvailability();
      return undefined;
    }
    startAvailability(uid, setDriverPos);
    const tick = setInterval(() => setNow(Date.now()), 20000);
    return () => {
      clearInterval(tick);
      stopAvailability();
    };
  }, [isOnline]);

  // Only fresh requests near this driver, nearest first
  const visibleRequests = requestsForDriver(rideRequests, driverPos, now);

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
    }, (err) => console.warn('Driver user listener error:', err?.message || err));

    // This month's completed rides: earnings, trips and the share in low-emission vehicles
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const unsubRides = onSnapshot(query(collection(db, 'bookings'), where('driverId', '==', user.uid)), (snap) => {
      const done = snap.docs.map(d => d.data()).filter(b => {
        const when = b.completedAt?.toDate?.() || b.createdAt?.toDate?.();
        return String(b.status).toLowerCase() === 'completed' && (!when || when >= monthStart);
      });
      const lowEmission = done.filter(b => ['Tuk', 'Bike'].includes(b.vehicleType)).length;
      setStats({
        earnings: done.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
        trips: done.length,
        lowEmissionPct: done.length ? Math.round((100 * lowEmission) / done.length) : null,
      });
    }, (e) => console.log('Driver stats unavailable:', e.message));

    return () => {
      unsubUser();
      unsubRides();
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
    }, (err) => console.warn('Driver profile listener error:', err?.message || err));
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
        ...(value ? {} : { isBusy: false }),
      });
    } catch (error) {
      setIsOnline(!value); // revert on failure
      toast.error('Error', 'Failed to update status');
    }
  };

  const handleAcceptFromDashboard = async (bookingId) => {
    setAccepting(bookingId);
    try {
      // Atomic claim: fails cleanly if another driver accepted first or the rider cancelled
      await acceptRide(bookingId, auth.currentUser.uid);
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), { isBusy: true }).catch(() => {});
      notifyBooking(bookingId);
      startLocationTracking(auth.currentUser.uid, bookingId);
      // Navigate to Ride tab (tab index 2 in DriverNavigator)
      navigation.navigate('DriverRide', { 
        bookingId: bookingId,
        fromDashboard: true 
      });
    } catch (error) {
      if (error instanceof RideTakenError) Alert.alert('Ride taken', error.message);
      else Alert.alert('Error', 'Failed to accept: ' + error.message);
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
            <Text style={styles.welcome}>{t('d_hi')}</Text>
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
            <Text style={styles.statusText}>{isOnline ? t('online') : t('offline')}</Text>
          </View>
          <Switch value={isOnline} onValueChange={handleToggleOnline} color="#006A3B" />
        </Surface>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.statsRow}>
          <StatCard label={t('d_earnings_label', { n: stats.trips })} value={`LKR ${stats.earnings.toLocaleString()}`} icon="wallet" color="#00695C" />
          <StatCard label={t('d_low_label')} value={stats.lowEmissionPct == null ? '-' : `${stats.lowEmissionPct}%`} icon="leaf" color="#4CAF50" />
        </View>

        <Card style={styles.optimizerCard}>
          <Card.Content>
            <View style={styles.optHeader}>
              <View>
                <Text style={styles.optTitle}>{t('d_low_title')}</Text>
                <Text style={styles.optSub}>{t('d_low_sub')}</Text>
              </View>
            </View>
            <View style={styles.progressArea}>
              <View style={styles.progressLabels}>
                <Text style={styles.progText}>{t('d_trips', { n: stats.trips })}</Text>
                <Text style={styles.progVal}>{stats.lowEmissionPct == null ? '-' : `${stats.lowEmissionPct}%`}</Text>
              </View>
              <ProgressBar progress={(stats.lowEmissionPct || 0) / 100} color="#4CAF50" style={styles.progress} />
              <Text style={styles.hint}>{t('d_hint')}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Real-time ride requests card */}
        {isOnline && (
          <View style={styles.rideRequestsCard}>
            <View style={styles.rideRequestsHeader}>
              <Text style={styles.rideRequestsTitle}>{t('d_requests')}</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('live')}</Text>
              </View>
            </View>

            {visibleRequests.length === 0 ? (
              <View style={styles.scanningState}>
                <Ionicons name="radio-outline" size={32} color="#6F7A70" />
                <Text style={styles.scanningText}>{t('d_scanning')}</Text>
                <Text style={[styles.scanningText, { fontSize: 12, marginTop: 4 }]}>Requests within {MATCH_RADIUS_KM} km of you appear here</Text>
              </View>
            ) : (
              visibleRequests.map((request) => (
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
                    <View>
                      <Text style={styles.requestPrice}>
                        LKR {request.price?.toLocaleString() || 'TBD'}
                      </Text>
                      {request.km != null && (
                        <Text style={{ fontSize: 12, color: '#3F4941', marginTop: 2 }}>
                          {request.km.toFixed(1)} km to pickup · ~{request.eta} min
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptFromDashboard(request.id)}
                      disabled={accepting === request.id}
                    >
                      {accepting === request.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.acceptButtonText}>{t('d_accept')}</Text>
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
