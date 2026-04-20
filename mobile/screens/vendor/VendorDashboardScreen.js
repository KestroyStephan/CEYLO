import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../firebaseConfig';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  orderBy, getDocs, Timestamp, getDoc,
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

const ONLINE_STATUS = [
  { key: 'online', label: 'Online', color: '#059669', bg: '#d1fae5', icon: '≡ƒƒó' },
  { key: 'busy', label: 'Busy', color: '#d97706', bg: '#fef3c7', icon: '≡ƒƒí' },
  { key: 'closed', label: 'Closed', color: '#dc2626', bg: '#fee2e2', icon: '≡ƒö┤' },
];

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function BookingCountdownRing({ seconds, total = 30 }) {
  const SIZE = 36;
  const RADIUS = 14;
  const CIRC = 2 * Math.PI * RADIUS;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: total * 1000, useNativeDriver: false,
    }).start();
  }, []);

  const AnimatedCircle = require('react-native-svg').Circle
    ? Animated.createAnimatedComponent(require('react-native-svg').Circle)
    : null;

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [0, CIRC] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
      <Text style={{ position: 'absolute', fontSize: 10, fontWeight: '700', color: '#d97706' }}>
        {seconds}s
      </Text>
    </View>
  );
}

export default function VendorDashboardScreen({ navigation }) {
  const [vendorData, setVendorData] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState('online');
  const [stats, setStats] = useState({ received: 0, completed: 0, revenue: 0 });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingCountdowns, setBookingCountdowns] = useState({});
  const prevOrderIds = useRef(new Set());
  const uid = auth.currentUser?.uid;

  // Vendor doc listener
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'vendors', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVendorData(data);
        setOnlineStatus(data.onlineStatus || 'online');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // Today's stats
  useEffect(() => {
    if (!uid) return;
    const fetchStats = async () => {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      try {
        const q = query(
          collection(db, 'bookings'),
          where('vendorId', '==', uid),
          where('createdAt', '>=', Timestamp.fromDate(todayMidnight))
        );
        const snap = await getDocs(q);
        let received = 0, completed = 0, revenue = 0;
        snap.forEach((d) => {
          received++;
          if (d.data().status === 'completed') {
            completed++;
            revenue += d.data().totalPrice || 0;
          }
        });
        setStats({ received, completed, revenue });
      } catch (e) { console.log('Stats error:', e.message); }
    };
    fetchStats();
  }, [uid]);

  // Live pending orders + haptic on new
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'bookings'),
      where('vendorId', '==', uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Detect new orders and haptic
      const newIds = new Set(orders.map((o) => o.id));
      const hasNew = orders.some((o) => !prevOrderIds.current.has(o.id));
      if (hasNew && prevOrderIds.current.size > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      prevOrderIds.current = newIds;

      setPendingOrders(orders);

      // Init 30s countdown per order
      const now = Date.now();
      setBookingCountdowns((prev) => {
        const updated = { ...prev };
        orders.forEach((o) => {
          if (!updated[o.id]) updated[o.id] = 30;
        });
        return updated;
      });
    });
    return () => unsub();
  }, [uid]);

  // Tick countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setBookingCountdowns((prev) => {
        const updated = {};
        Object.keys(prev).forEach((id) => {
          updated[id] = Math.max(0, (prev[id] || 0) - 1);
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const setStatus = async (status) => {
    setOnlineStatus(status);
    try {
      await updateDoc(doc(db, 'vendors', uid), { onlineStatus: status });
    } catch (e) {
      Alert.alert('Error', e.message);
      setOnlineStatus(vendorData?.onlineStatus || 'online');
    }
  };

  const handleAccept = async (order) => {
    try {
      await updateDoc(doc(db, 'bookings', order.id), { status: 'accepted' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDecline = async (order) => {
    try {
      await updateDoc(doc(db, 'bookings', order.id), { status: 'rejected', rejectionReason: 'Declined by vendor' });
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const currentStatusCfg = ONLINE_STATUS.find((s) => s.key === onlineStatus) || ONLINE_STATUS[0];

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={() => (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.businessName}>{vendorData?.businessName || 'Vendor'} ≡ƒæï</Text>
            </View>
            {/* 3-state status toggle */}
            <View style={[styles.statusBadge, { backgroundColor: currentStatusCfg.bg }]}>
              <Text style={styles.statusBadgeText}>{currentStatusCfg.icon} {currentStatusCfg.label}</Text>
            </View>
          </View>

          {/* Status toggle row */}
          <View style={styles.statusRow}>
            {ONLINE_STATUS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.statusToggleBtn, onlineStatus === s.key && { borderColor: s.color, backgroundColor: s.bg }]}
                onPress={() => setStatus(s.key)}
              >
                <Text style={[styles.statusToggleTxt, onlineStatus === s.key && { color: s.color }]}>
                  {s.icon} {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.received}</Text>
              <Text style={styles.statLabel}>Received</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statCard, styles.statCardRevenue]}>
              <Text style={[styles.statValue, { color: '#fff', fontSize: 15 }]}>
                LKR {stats.revenue.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: '#d1fae5' }]}>Revenue Today</Text>
            </View>
          </View>

          {/* Manage orders shortcut */}
          <TouchableOpacity
            style={styles.manageOrdersBtn}
            onPress={() => navigation.navigate('VendorOrders')}
          >
            <MaterialCommunityIcons name="clipboard-list" size={18} color="#059669" />
            <Text style={styles.manageOrdersTxt}>Manage All Orders</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#059669" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>≡ƒöö New Booking Requests</Text>
        </>
      )}
      data={pendingOrders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const countdown = bookingCountdowns[item.id] ?? 30;
        return (
          <View style={styles.orderCard}>
            <View style={styles.orderCardHead}>
              <View style={styles.touristAvatar}>
                <Text style={styles.touristAvatarText}>
                  {(item.customerName || 'C')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
                <Text style={styles.orderMeta}>{item.serviceName || ''}</Text>
              </View>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>{countdown}s</Text>
              </View>
            </View>

            <Text style={styles.itemsSummary} numberOfLines={2}>
              {item.items?.map((i) => `${i.name} x${i.qty}`).join(', ') || 'Service booking'}
            </Text>

            <View style={styles.orderMeta2}>
              <Text style={styles.orderTotal}>LKR {(item.totalPrice || 0).toLocaleString()}</Text>
              <Text style={styles.orderTime}>{timeAgo(item.createdAt)}</Text>
            </View>

            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item)}>
                <Text style={styles.declineBtnText}>Γ£ò Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(item)}
              >
                <Text style={styles.acceptBtnText}>Γ£ô Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>≡ƒô¡</Text>
          <Text style={styles.emptyText}>No new booking requests</Text>
          <Text style={styles.emptySubtext}>New requests will appear here in real-time</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { paddingBottom: 80 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 52,
  },
  greeting: { fontSize: 13, color: '#6b7280' },
  businessName: { fontSize: 22, fontWeight: '800', color: '#064e3b' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  statusRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statusToggleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  statusToggleTxt: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statCardRevenue: { backgroundColor: '#059669', flex: 1.4 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#059669' },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  manageOrdersBtn: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  manageOrdersTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: '#059669' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#064e3b', paddingHorizontal: 16, marginBottom: 8 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  orderCardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  touristAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  touristAvatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  orderMeta: { fontSize: 12, color: '#6b7280' },
  countdownBadge: {
    backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 4, borderWidth: 1, borderColor: '#fcd34d',
  },
  countdownText: { fontSize: 13, fontWeight: '700', color: '#d97706' },
  itemsSummary: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  orderMeta2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  orderTotal: { fontSize: 18, fontWeight: '900', color: '#059669' },
  orderTime: { fontSize: 12, color: '#9ca3af', alignSelf: 'flex-end' },
  orderActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  declineBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  acceptBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 10, padding: 12, alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.3, elevation: 3,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, color: '#374151', fontWeight: '700', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
