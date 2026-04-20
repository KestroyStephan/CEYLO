import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const TABS = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
const STATUS_MAP = {
  Pending: 'pending',
  Confirmed: 'accepted',
  Active: 'preparing',
  Completed: 'completed',
  Cancelled: ['rejected', 'cancelled'],
};

const STATUS_COLORS = {
  pending: '#d97706',
  accepted: '#059669',
  preparing: '#2563eb',
  ready: '#7c3aed',
  completed: '#374151',
  rejected: '#dc2626',
  cancelled: '#dc2626',
};

export default function BookingManagementScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const statusFilter = STATUS_MAP[activeTab];
    const status_in = Array.isArray(statusFilter) ? statusFilter : [statusFilter];

    const q = query(
      collection(db, 'bookings'),
      where('vendorId', '==', uid),
      where('status', 'in', status_in)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [uid, activeTab]);

  const advanceStatus = async (booking) => {
    const progression = {
      accepted: 'preparing',
      preparing: 'ready',
      ready: 'completed',
    };
    const nextStatus = progression[booking.status];
    if (!nextStatus) return;

    const labels = {
      accepted: 'Confirm start',
      preparing: 'Mark as ready',
      ready: 'Complete service',
    };
    Alert.alert(
      labels[booking.status],
      nextStatus === 'completed' ? 'Mark as completed and capture proof of service?' : `Move to "${nextStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus === 'completed' ? 'Complete & Capture Proof' : 'Confirm',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', booking.id), { status: nextStatus });
              if (nextStatus === 'completed') {
                navigation.navigate('ProofOfService', { bookingId: booking.id });
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const NEXT_ACTION = {
    accepted: { label: 'Start Service', color: '#2563eb' },
    preparing: { label: 'Mark Ready', color: '#7c3aed' },
    ready: { label: 'Complete Γ£ô', color: '#059669' },
  };

  const renderBooking = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const action = NEXT_ACTION[item.status];
    const dateStr = item.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }) || 'ΓÇö';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        {/* Card Header */}
        <View style={styles.bookingHead}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(item.customerName || 'C')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || '#9ca3af' }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20} color="#9ca3af" style={{ marginLeft: 8 }}
          />
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <Text style={styles.detailLabel}>SERVICE</Text>
            <Text style={styles.detailValue}>{item.serviceName || 'ΓÇö'}</Text>

            {item.items?.length > 0 && (
              <>
                <Text style={styles.detailLabel}>ITEMS</Text>
                {item.items.map((i, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{i.name}</Text>
                    <Text style={styles.itemQty}>x{i.qty}</Text>
                    <Text style={styles.itemPrice}>LKR {((i.price || 0) * (i.qty || 1)).toLocaleString()}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>LKR {(item.totalPrice || 0).toLocaleString()}</Text>
            </View>

            {item.notes && (
              <>
                <Text style={styles.detailLabel}>NOTES FROM CUSTOMER</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </>
            )}

            {/* Action buttons */}
            {action && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: action.color }]}
                  onPress={() => advanceStatus(item)}
                >
                  <Text style={styles.actionBtnText}>{action.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => navigation.navigate('VendorChat', {
                    bookingId: item.id, order: item,
                  })}
                >
                  <MaterialCommunityIcons name="chat-outline" size={18} color="#059669" />
                  <Text style={styles.chatBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => { setActiveTab(tab); setLoading(true); }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={renderBooking}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>≡ƒôï</Text>
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingTop: 12 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabActive: { backgroundColor: '#059669' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  bookingCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  bookingHead: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusDot: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 12 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginTop: 10, marginBottom: 4 },
  detailValue: { fontSize: 15, color: '#374151', fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemName: { flex: 1, fontSize: 14, color: '#374151' },
  itemQty: { fontSize: 13, color: '#6b7280', marginRight: 8 },
  itemPrice: { fontSize: 14, color: '#059669', fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#059669' },
  notesText: { fontSize: 14, color: '#4b5563', fontStyle: 'italic', lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chatBtn: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4',
  },
  chatBtnText: { color: '#059669', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
});
