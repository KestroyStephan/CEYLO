import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { 
  collection, query, orderBy, onSnapshot, where 
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function BookingManagementScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Queried from root orders collection filtering by vendorId
    const q = query(
      collection(db, 'orders'),
      where('vendorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error('Orders fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const orderTime = timestamp.toDate 
      ? timestamp.toDate() 
      : new Date(timestamp);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getStatusColor(status) {
    const colors = {
      pending: '#FF8F00',
      accepted: '#006A6A',
      preparing: '#006A6A',
      ready: '#006A3B',
      completed: '#3F4941',
      cancelled: '#BA1A1A',
      rejected: '#BA1A1A',
    };
    return colors[status] || '#3F4941';
  }

  const renderOrderRow = ({ item }) => (
    <TouchableOpacity 
      style={styles.row}
      onPress={() => navigation.navigate('VendorOrderManagement', { orderId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.rowMain}>
        <Text style={styles.customerName}>
          {item.touristName || item.customerName || 'Unknown Customer'}
        </Text>
        <Text style={styles.timeAgo}>
          {getTimeAgo(item.createdAt)}
        </Text>
      </View>

      <View style={styles.rowItems}>
        <Text style={styles.itemsText} numberOfLines={1}>
          {Array.isArray(item.items) 
            ? item.items.map(i => `${i.name} x${i.qty || i.quantity || 1}`).join(', ')
            : 'No items listed'}
        </Text>
      </View>

      {item.notes ? (
        <Text style={styles.notesText} numberOfLines={1}>
          Note: {item.notes}
        </Text>
      ) : null}

      <View style={styles.rowFooter}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(item.status) + '20' }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: getStatusColor(item.status) }
          ]}>
            {(item.status || 'pending').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.amount}>
          LKR {(item.totalPrice || item.totalAmount || 0).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} total order{orders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#6F7A70" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Orders from customers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#F6FBF3',
  },
  headerTitle: { 
    fontSize: 24, fontWeight: '700', color: '#181D19',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: { fontSize: 13, color: '#3F4941', marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#181D19',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowMain: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: 6 
  },
  customerName: { fontSize: 15, fontWeight: '700', color: '#181D19' },
  timeAgo: { fontSize: 11, color: '#6F7A70' },
  rowItems: { marginBottom: 4 },
  itemsText: { fontSize: 13, color: '#3F4941' },
  notesText: { fontSize: 12, color: '#6F7A70', fontStyle: 'italic', marginBottom: 6 },
  rowFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginTop: 6 
  },
  statusBadge: { 
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  amount: { fontSize: 14, fontWeight: '700', color: '#006A3B' },
  emptyState: { 
    flex: 1, alignItems: 'center', justifyContent: 'center', 
    paddingHorizontal: 40 
  },
  emptyText: { 
    fontSize: 16, fontWeight: '600', color: '#181D19', 
    marginTop: 12 
  },
  emptySubtext: { 
    fontSize: 13, color: '#6F7A70', marginTop: 4, 
    textAlign: 'center' 
  },
});
