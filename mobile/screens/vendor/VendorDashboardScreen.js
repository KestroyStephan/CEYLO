// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Animated, Dimensions, StatusBar, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Ellipse, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../firebaseConfig';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  orderBy, getDocs, Timestamp, getDoc,
} from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, Divider } from 'react-native-paper';
import { signOut } from 'firebase/auth';

const { width } = Dimensions.get('window');
const PRIMARY   = '#006A3B';
const SECONDARY = '#006A6A';
const TERTIARY  = '#735C00';
const ERROR     = '#BA1A1A';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';

// Simple lotus watermark SVG
const LotusWatermark = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" style={{ opacity: 0.04 }}>
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill={PRIMARY} />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill={PRIMARY} transform="rotate(45 60 70)" />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill={PRIMARY} transform="rotate(90 60 70)" />
    <Ellipse cx="60" cy="70" rx="12" ry="28" fill={PRIMARY} transform="rotate(135 60 70)" />
    <Circle cx="60" cy="62" r="10" fill={PRIMARY} />
  </Svg>
);

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function VendorDashboardScreen({ navigation }) {
  const [vendorData,      setVendorData]      = useState(null);
  const [isAccepting,     setIsAccepting]     = useState(true);
  const [stats,           setStats]           = useState({ orders: 0, revenue: 0, rating: 0 });
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [menuVisible,     setMenuVisible]     = useState(false);
  const prevIds = useRef(new Set());
  const uid = auth.currentUser?.uid;

  const handleLogout = async () => {
    setMenuVisible(false);
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout: ' + error.message);
            }
          },
        },
      ]
    );
  };

  // Vendor doc listener
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'vendors', uid), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setVendorData(d);
        setIsAccepting(d.isAcceptingOrders !== false);
      }
      setLoading(false);
    }, err => {
      console.log("VendorDashboardScreen: vendors listener error:", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // Today's stats
  useEffect(() => {
    if (!uid) return;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, 'orders'),
      where('vendorId', '==', uid),
      where('createdAt', '>=', Timestamp.fromDate(midnight))
    );
    getDocs(q).then(snap => {
      let revenue = 0, ratings = [], orders = 0;
      snap.forEach(d => {
        const data = d.data();
        orders++;
        if (data.status === 'completed') revenue += data.totalPrice || 0;
        if (data.rating) ratings.push(data.rating);
      });
      const rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      setStats({ orders, revenue, rating: parseFloat(rating.toFixed(1)) });
    }).catch(() => {});
  }, [uid]);

  // Live pending orders
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'orders'),
      where('vendorId', '==', uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const newIds = new Set(orders.map(o => o.id));
      const hasNew = orders.some(o => !prevIds.current.has(o.id));
      if (hasNew && prevIds.current.size > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      prevIds.current = newIds;
      setPendingOrders(orders);
    });
    return () => unsub();
  }, [uid]);

  const toggleAccepting = async () => {
    const next = !isAccepting;
    setIsAccepting(next);
    if (uid) await updateDoc(doc(db, 'vendors', uid), { isAcceptingOrders: next }).catch(() => {});
  };

  const STAT_CARDS = [
    { label: "Today's Orders", value: stats.orders,          border: PRIMARY,   icon: 'receipt-outline' },
    { label: 'Revenue (LKR)',  value: `${stats.revenue.toLocaleString()}`, border: SECONDARY, icon: 'cash-outline' },
    { label: 'Avg Rating',     value: stats.rating || '—',   border: TERTIARY,  icon: 'star-outline' },
  ];

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[PRIMARY, '#004D2C']} style={styles.headerGrad}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons name="menu" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerLogo}>Ceylo</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity 
                  onPress={() => setMenuVisible(true)}
                  style={styles.avatarCircle}
                  activeOpacity={0.8}
                >
                  <Text style={styles.avatarLetter}>
                    {vendorData?.businessName?.[0]?.toUpperCase() || 'V'}
                  </Text>
                </TouchableOpacity>
              }
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                marginTop: 40,
              }}
            >
              <Menu.Item
                onPress={handleLogout}
                title="Logout"
                leadingIcon="logout"
                titleStyle={{ color: '#BA1A1A' }}
              />
            </Menu>
          </View>
          <Text style={styles.welcomeLabel}>WELCOME BACK,</Text>
          <Text style={styles.businessName}>{vendorData?.businessName || 'Vendor'}</Text>
          <Text style={styles.dashboardTitle}>Vendor Dashboard</Text>
        </LinearGradient>

        {/* Accepting Orders Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Ionicons name={isAccepting ? 'checkmark-circle' : 'pause-circle'} size={28}
              color={isAccepting ? PRIMARY : '#6F7A70'} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.toggleTitle}>
                {isAccepting ? 'Accepting Orders' : 'Not Accepting Orders'}
              </Text>
              <Text style={styles.toggleSub}>
                {isAccepting ? 'Tourists can book your services' : 'You won\'t receive new bookings'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleAccepting} activeOpacity={0.8}
            style={[styles.toggleSwitch, isAccepting && styles.toggleSwitchOn]}>
            <View style={[styles.toggleKnob, isAccepting && styles.toggleKnobOn]} />
          </TouchableOpacity>
        </View>

        {/* Stats Bento Grid */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((s, i) => (
            <View key={i} style={[styles.statCard, { borderLeftColor: s.border }]}>
              <Ionicons name={s.icon} size={20} color={s.border} style={{ marginBottom: 6 }} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Live Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {pendingOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.lotusWrap}><LotusWatermark /></View>
            <Ionicons name="receipt-outline" size={40} color={OUTLINE_V} />
            <Text style={styles.emptyText}>No pending orders</Text>
            <Text style={styles.emptySub}>New bookings will appear here in real-time</Text>
          </View>
        ) : (
          pendingOrders.map(order => (
            <TouchableOpacity key={order.id} style={styles.orderCard}
              onPress={() => navigation.navigate('VendorIncomingOrder', { order })} activeOpacity={0.85}>
              <View style={styles.orderTop}>
                <View style={styles.orderAvatar}>
                  <Text style={styles.orderAvatarText}>{(order.customerName || 'C')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.orderCustomer}>{order.customerName || 'Tourist'}</Text>
                  <Text style={styles.orderTime}>{timeAgo(order.createdAt)}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
              <Text style={styles.orderItems} numberOfLines={2}>
                {order.items?.map(i => i.name).join(' · ') || 'Service booking'}
              </Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>LKR {(order.totalPrice || 0).toLocaleString()}</Text>
                <TouchableOpacity style={styles.viewBtn}
                  onPress={() => navigation.navigate('VendorIncomingOrder', { order })}>
                  <Text style={styles.viewBtnText}>View Order</Text>
                  <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Eco-Impact Banner */}
        <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.ecoBanner}>
          <View style={styles.lotusWrapBanner}><LotusWatermark /></View>
          <Ionicons name="leaf" size={32} color="rgba(255,255,255,0.9)" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.ecoTitle}>Your Eco Impact</Text>
            <Text style={styles.ecoSub}>You've earned a Verified Eco Vendor badge! Keep up sustainable practices.</Text>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* FAB — Emergency (bottom: 100) */}
      <TouchableOpacity style={styles.fabEmergency}>
        <Ionicons name="alert-circle" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* FAB — Add Product (bottom: 168) */}
      <TouchableOpacity style={styles.fabAddProduct}
        onPress={() => navigation.navigate('AddNewProduct')} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  headerGrad:    { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerLogo:    { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  avatarCircle:  { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter:  { fontSize: 18, fontWeight: '800', color: '#FFF' },
  welcomeLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  businessName:  { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 4 },
  dashboardTitle:{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  toggleCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 16,
    shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  toggleLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleTitle:   { fontSize: 15, fontWeight: '700', color: ON_SURF },
  toggleSub:     { fontSize: 12, color: ON_SURF_V, marginTop: 2 },
  toggleSwitch:  { width: 50, height: 28, borderRadius: 14, backgroundColor: OUTLINE_V, padding: 3 },
  toggleSwitchOn:{ backgroundColor: PRIMARY },
  toggleKnob:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', alignSelf: 'flex-start' },
  toggleKnobOn:  { alignSelf: 'flex-end' },
  statsGrid:     { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  statCard:      { flex: 1, backgroundColor: SURFACE, borderRadius: 16, padding: 14, borderLeftWidth: 4,
    shadowColor: '#181D19', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  statValue:     { fontSize: 22, fontWeight: '900', color: ON_SURF, marginBottom: 2 },
  statLabel:     { fontSize: 11, color: ON_SURF_V, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 12, gap: 10 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: ON_SURF },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, gap: 5 },
  liveDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ERROR },
  liveText:      { fontSize: 10, fontWeight: '800', color: ERROR, letterSpacing: 1 },
  emptyCard:     { backgroundColor: SURFACE, marginHorizontal: 16, borderRadius: 20, padding: 40, alignItems: 'center',
    shadowColor: '#181D19', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, overflow: 'hidden' },
  lotusWrap:     { position: 'absolute', right: 0, bottom: 0 },
  lotusWrapBanner: { position: 'absolute', right: 10, top: 0 },
  emptyText:     { fontSize: 16, fontWeight: '700', color: ON_SURF, marginTop: 12 },
  emptySub:      { fontSize: 13, color: ON_SURF_V, marginTop: 4, textAlign: 'center' },
  orderCard:     { backgroundColor: SURFACE, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  orderTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  orderAvatar:   { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE_C, alignItems: 'center', justifyContent: 'center' },
  orderAvatarText: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  orderCustomer: { fontSize: 15, fontWeight: '700', color: ON_SURF },
  orderTime:     { fontSize: 12, color: ON_SURF_V, marginTop: 2 },
  pendingBadge:  { backgroundColor: '#FFF7ED', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  orderItems:    { fontSize: 13, color: ON_SURF_V, marginBottom: 12 },
  orderFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderTotal:    { fontSize: 16, fontWeight: '800', color: PRIMARY },
  viewBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText:   { fontSize: 13, fontWeight: '700', color: PRIMARY },
  ecoBanner:     { marginHorizontal: 16, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginTop: 20, overflow: 'hidden' },
  ecoTitle:      { fontSize: 16, fontWeight: '800', color: '#FFF' },
  ecoSub:        { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  fabEmergency:  { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: ERROR, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  fabAddProduct: { position: 'absolute', bottom: 168, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
});
