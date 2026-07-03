import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function DriverHistoryScreen() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('driverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((r) => ['Completed', 'Cancelled'].includes(r.status));
      setRides(data);
      setLoading(false);
    }, (error) => {
      console.error('History fetch error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
      ' • ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const renderRide = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.routeIcons}>
          <Ionicons name="ellipse" size={10} color="#006A3B" />
          <View style={styles.routeLine} />
          <Ionicons name="location" size={10} color="#BA1A1A" />
        </View>
        <View style={styles.routeText}>
          <Text style={styles.locationText} numberOfLines={1}>{item.pickup}</Text>
          <Text style={styles.locationText} numberOfLines={1}>{item.dropoff}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <View style={styles.footerRight}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'Completed' ? 'rgba(0,106,59,0.1)' : 'rgba(186,26,26,0.1)' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'Completed' ? '#006A3B' : '#BA1A1A' }
            ]}>{item.status}</Text>
          </View>
          <Text style={styles.priceText}>LKR {item.price?.toLocaleString() || '0'}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centerLoading}><ActivityIndicator size="large" color="#006A3B" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride History</Text>
        <Text style={styles.headerSubtitle}>{rides.length} ride{rides.length !== 1 ? 's' : ''}</Text>
      </View>
      {rides.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#6F7A70" />
          <Text style={styles.emptyText}>No ride history yet</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#181D19' },
  headerSubtitle: { fontSize: 13, color: '#3F4941', marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  routeIcons: { alignItems: 'center', marginRight: 10, paddingTop: 4 },
  routeLine: { width: 1, height: 20, backgroundColor: '#BECABE', marginVertical: 2 },
  routeText: { flex: 1, justifyContent: 'space-between' },
  locationText: { fontSize: 13, color: '#181D19', marginBottom: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EBEFE8' },
  dateText: { fontSize: 11, color: '#6F7A70' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  priceText: { fontSize: 14, fontWeight: '700', color: '#006A3B' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#6F7A70', marginTop: 12 },
});
