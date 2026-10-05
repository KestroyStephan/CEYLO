import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import ProgressiveImage from '../components/ProgressiveImage';
import useStatusBarStyle from '../utils/useStatusBarStyle';

const ACCENT = '#00695C';
const STATUS = {
  pending:   { label: 'Waiting for the vendor', color: '#B26A00', icon: 'clock-outline' },
  accepted:  { label: 'Accepted',               color: ACCENT,    icon: 'check' },
  preparing: { label: 'Being prepared',         color: ACCENT,    icon: 'progress-wrench' },
  ready:     { label: 'Ready for pickup',       color: '#2E7D32', icon: 'shopping' },
  completed: { label: 'Collected',              color: '#5F6F6B', icon: 'check-all' },
  rejected:  { label: 'Declined by the vendor', color: '#C62828', icon: 'close' },
  cancelled: { label: 'Cancelled',              color: '#5F6F6B', icon: 'cancel' },
};
const FLOW = ['pending', 'accepted', 'preparing', 'ready', 'completed'];

/** Marketplace orders the traveller placed, with live status from the vendor. */
export default function MyOrdersScreen({ navigation, route }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const highlight = route.params?.highlight;
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setOrders([]);
      return undefined;
    }
    return onSnapshot(query(collection(db, 'orders'), where('touristId', '==', uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds ?? Infinity) - (a.createdAt?.seconds ?? Infinity));
      setOrders(list);
    }, () => setOrders([]));
  }, []);

  const cancel = (order) => Alert.alert('Cancel this order?', 'The vendor will see that you cancelled it.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel order', style: 'destructive', onPress: () => updateDoc(doc(db, 'orders', order.id), { status: 'cancelled' }).catch(e => Alert.alert('Could not cancel', e.message)) },
  ]);

  const renderOrder = ({ item }) => {
    const s = STATUS[item.status] || STATUS.pending;
    const step = FLOW.indexOf(item.status);
    const first = item.items?.[0] || {};
    const count = (item.items || []).reduce((n, it) => n + (it.qty || 1), 0);
    return (
      <View style={[styles.card, item.id === highlight && styles.cardHighlight]}>
        <View style={styles.row}>
          <ProgressiveImage source={{ uri: first.image }} style={styles.image} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{first.name || 'Order'}{count > 1 ? ` ×${count}` : ''}</Text>
            <Text style={styles.vendor} numberOfLines={1}>{item.vendorBusinessName || 'Local vendor'}</Text>
            <Text style={styles.total}>LKR {(item.totalPrice || 0).toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.status, { backgroundColor: `${s.color}14` }]}>
          <MaterialCommunityIcons name={s.icon} size={16} color={s.color} />
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>

        {step >= 0 && (
          <View style={styles.progress}>
            {FLOW.slice(1).map((st, i) => (
              <View key={st} style={[styles.bar, i < step && { backgroundColor: ACCENT }]} />
            ))}
          </View>
        )}

        {item.status === 'rejected' && item.rejectionReason ? <Text style={styles.reason}>Reason: {item.rejectionReason}</Text> : null}
        {item.pickupLocation && ['accepted', 'preparing', 'ready'].includes(item.status) ? (
          <Text style={styles.pickup}>Collect at {item.pickupLocation} and pay the vendor there.</Text>
        ) : null}
        {item.status === 'pending' && (
          <TouchableOpacity onPress={() => cancel(item)} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel order</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B2B28" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
      </View>
      {orders === null ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="shopping-outline" size={44} color="#9AA8A2" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Order local crafts and produce from the Marketplace and collect them from the vendor.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  back: { padding: 8, marginRight: 4 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 12 },
  cardHighlight: { borderWidth: 1.5, borderColor: ACCENT },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  image: { width: 64, height: 64, borderRadius: 12 },
  name: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#1B2B28' },
  vendor: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 1 },
  total: { fontSize: 15, fontFamily: 'Outfit-Bold', color: ACCENT, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 12 },
  statusText: { fontSize: 13, fontFamily: 'Outfit-SemiBold' },
  progress: { flexDirection: 'row', gap: 4, marginTop: 10 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E1E8E5' },
  reason: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#C62828', marginTop: 8 },
  pickup: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#3A4A46', marginTop: 8 },
  cancel: { alignSelf: 'flex-start', marginTop: 10 },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#C62828' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 4, textAlign: 'center' },
});
