import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function DriverFeesScreen() {
  const [completedRides, setCompletedRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('driverId', '==', user.uid),
      where('status', '==', 'Completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCompletedRides(data);
      setLoading(false);
    }, (error) => {
      console.error('Fees fetch error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalEarnings = completedRides.reduce((sum, r) => sum + (r.price || 0), 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEarnings = completedRides
    .filter((r) => {
      const rideDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return rideDate >= today;
    })
    .reduce((sum, r) => sum + (r.price || 0), 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEarnings = completedRides
    .filter((r) => {
      const rideDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return rideDate >= weekAgo;
    })
    .reduce((sum, r) => sum + (r.price || 0), 0);

  if (loading) {
    return <View style={styles.centerLoading}><ActivityIndicator size="large" color="#006A3B" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & Fees</Text>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earnings</Text>
        <Text style={styles.totalAmount}>LKR {totalEarnings.toLocaleString()}</Text>
        <Text style={styles.totalSubtext}>{completedRides.length} completed rides</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="today-outline" size={20} color="#006A3B" />
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>LKR {todayEarnings.toLocaleString()}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={20} color="#006A6A" />
          <Text style={styles.statLabel}>This Week</Text>
          <Text style={styles.statValue}>LKR {weekEarnings.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Collections</Text>
      {completedRides.slice(0, 10).map((ride) => (
        <View key={ride.id} style={styles.rideRow}>
          <View style={styles.rideRowLeft}>
            <Text style={styles.rideDestination} numberOfLines={1}>{ride.dropoff || 'Trip'}</Text>
            <Text style={styles.rideDate}>
              {ride.createdAt?.toDate
                ? ride.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : ''}
            </Text>
          </View>
          <Text style={styles.ridePrice}>+LKR {ride.price?.toLocaleString() || '0'}</Text>
        </View>
      ))}

      {completedRides.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={40} color="#6F7A70" />
          <Text style={styles.emptyText}>No earnings yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#181D19' },
  totalCard: { backgroundColor: '#006A3B', borderRadius: 18, padding: 20, marginBottom: 16, alignItems: 'center' },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  totalSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, elevation: 2 },
  statLabel: { fontSize: 11, color: '#6F7A70', marginTop: 6 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#181D19', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#181D19', marginBottom: 10 },
  rideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  rideRowLeft: { flex: 1 },
  rideDestination: { fontSize: 13, fontWeight: '600', color: '#181D19' },
  rideDate: { fontSize: 11, color: '#6F7A70', marginTop: 2 },
  ridePrice: { fontSize: 14, fontWeight: '700', color: '#006A3B' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#6F7A70', marginTop: 10 },
});
