// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const PRIMARY   = '#006A3B';
const SECONDARY = '#006A6A';
const ERROR     = '#BA1A1A';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';

const TABS = ['Pending','Confirmed','Active','Completed','Cancelled'];
const STATUS_MAP = {
  Pending:   ['pending'],
  Confirmed: ['accepted'],
  Active:    ['preparing','ready'],
  Completed: ['completed'],
  Cancelled: ['rejected','cancelled'],
};
const STATUS_BADGE = {
  pending:   { bg:'#FFF7ED', color:'#D97706', label:'Pending' },
  accepted:  { bg:'#E0F2F1', color: SECONDARY, label:'Confirmed' },
  preparing: { bg:'#EDE9FE', color:'#7C3AED', label:'Preparing' },
  ready:     { bg:'#E0F2FE', color:'#0369A1', label:'Ready' },
  completed: { bg: SURFACE_C, color: ON_SURF_V, label:'Completed' },
  rejected:  { bg:'#FEF2F2', color: ERROR, label:'Rejected' },
  cancelled: { bg:'#FEF2F2', color: ERROR, label:'Cancelled' },
};

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function BookingManagementScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Pending');
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const statuses = STATUS_MAP[activeTab];
    const q = query(collection(db,'orders'), where('vendorId','==',uid), where('status','in',statuses));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      setLoading(false);
    }, err => {
      console.log("BookingManagementScreen: bookings listener error:", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [uid, activeTab]);

  const updateStatus = async (orderId, status) => {
    try { await updateDoc(doc(db,'orders',orderId), { status }); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const renderAction = (order) => {
    const btns = [];
    if (order.status === 'pending') {
      btns.push(
        <TouchableOpacity key="accept" style={styles.actionBtnPrimary} onPress={() => updateStatus(order.id,'accepted')}>
          <Text style={styles.actionBtnPrimaryText}>Accept Order</Text>
        </TouchableOpacity>,
        <TouchableOpacity key="reject" style={styles.actionBtnOutlineError} onPress={() =>
          Alert.alert('Reject Order','Are you sure?',[
            {text:'Cancel',style:'cancel'},
            {text:'Reject',style:'destructive', onPress:()=>updateStatus(order.id,'rejected')},
          ])}>
          <Text style={styles.actionBtnOutlineErrorText}>Reject</Text>
        </TouchableOpacity>
      );
    } else if (order.status === 'accepted') {
      btns.push(<TouchableOpacity key="prep" style={styles.actionBtnPrimary} onPress={() => updateStatus(order.id,'preparing')}>
        <Text style={styles.actionBtnPrimaryText}>Start Preparing</Text></TouchableOpacity>);
    } else if (order.status === 'preparing') {
      btns.push(<TouchableOpacity key="ready" style={styles.actionBtnPrimary} onPress={() => updateStatus(order.id,'ready')}>
        <Text style={styles.actionBtnPrimaryText}>Mark as Ready</Text></TouchableOpacity>);
    } else if (order.status === 'ready') {
      btns.push(<TouchableOpacity key="complete" style={styles.actionBtnPrimary}
        onPress={() => navigation.navigate('ProofOfService', { orderId: order.id })}>
        <Text style={styles.actionBtnPrimaryText}>Complete & Upload Proof</Text></TouchableOpacity>);
    }
    btns.push(
      <TouchableOpacity key="chat" style={styles.chatBtn}
        onPress={() => navigation.navigate('VendorChat', { bookingId: order.id, order })}>
        <Ionicons name="chatbubble-outline" size={16} color={PRIMARY} />
      </TouchableOpacity>
    );
    return <View style={styles.actionRow}>{btns}</View>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {/* Tab Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => { setActiveTab(tab); setExpanded(null); }}
            style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}>
            <Text style={[styles.tabChipText, activeTab === tab && { color: '#FFF' }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={OUTLINE_V} />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} orders</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
            const isOpen = expanded === item.id;
            return (
              <TouchableOpacity style={styles.orderCard} onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.85}>
                <View style={styles.orderTop}>
                  <View style={styles.orderAvatar}>
                    <Text style={styles.orderAvatarText}>{(item.customerName||'C')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.customerName}>{item.customerName || 'Tourist'}</Text>
                    <Text style={styles.orderMeta}>{item.items?.length || 0} items · {timeAgo(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={ON_SURF_V} style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.orderTotal}>LKR {(item.totalPrice||0).toLocaleString()}</Text>
                {isOpen && (
                  <View style={styles.expandedSection}>
                    {item.items?.map((it, i) => (
                      <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemName}>{it.name}</Text>
                        <Text style={styles.itemQty}>x{it.qty}</Text>
                        <Text style={styles.itemPrice}>LKR {((it.price||0)*it.qty).toLocaleString()}</Text>
                      </View>
                    ))}
                    {item.notes && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>Customer Notes:</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    )}
                    {renderAction(item)}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: SURFACE_C },
  headerTitle: { fontSize: 24, fontWeight: '800', color: ON_SURF },
  tabScroll:   { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: SURFACE_C },
  tabChip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: OUTLINE_V, backgroundColor: SURFACE },
  tabChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabChipText: { fontSize: 13, fontWeight: '600', color: ON_SURF_V },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:   { fontSize: 16, color: ON_SURF_V, fontWeight: '600' },
  orderCard:   { backgroundColor: SURFACE, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  orderTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  orderAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE_C, alignItems: 'center', justifyContent: 'center' },
  orderAvatarText: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  customerName: { fontSize: 15, fontWeight: '700', color: ON_SURF },
  orderMeta:   { fontSize: 12, color: ON_SURF_V },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  orderTotal:  { fontSize: 14, fontWeight: '800', color: PRIMARY, marginTop: 4 },
  expandedSection: { borderTopWidth: 1, borderTopColor: SURFACE_C, marginTop: 12, paddingTop: 12 },
  itemRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemName:    { flex: 1, fontSize: 14, color: ON_SURF },
  itemQty:     { fontSize: 13, color: ON_SURF_V, marginRight: 12 },
  itemPrice:   { fontSize: 13, fontWeight: '700', color: PRIMARY },
  notesBox:    { backgroundColor: SURFACE_C, borderRadius: 10, padding: 10, marginTop: 6 },
  notesLabel:  { fontSize: 12, fontWeight: '700', color: ON_SURF_V, marginBottom: 4 },
  notesText:   { fontSize: 13, color: ON_SURF },
  actionRow:   { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  actionBtnPrimary: { flex: 1, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnPrimaryText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  actionBtnOutlineError: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: ERROR, alignItems: 'center' },
  actionBtnOutlineErrorText: { color: ERROR, fontWeight: '700', fontSize: 13 },
  chatBtn:     { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
});
