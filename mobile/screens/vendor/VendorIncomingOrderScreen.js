import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, Animated,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const REJECT_REASONS = ['Too busy', 'Item unavailable', 'Item out of stock', 'Other'];
const TIMER_SECONDS = 20;

export default function VendorIncomingOrderScreen({ route, navigation }) {
  const { order } = route.params;
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const autoRejected = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!autoRejected.current) {
            autoRejected.current = true;
            handleReject('No response', true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    return () => clearInterval(timerRef.current);
  }, []);

  const handleAccept = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'bookings', order.id), { status: 'accepted' });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
      setSubmitting(false);
    }
  };

  const handleReject = async (reason, auto = false) => {
    clearInterval(timerRef.current);
    if (!auto) setShowRejectModal(false);
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'bookings', order.id), {
        status: 'rejected',
        rejectionReason: reason,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
      setSubmitting(false);
    }
  };

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Order</Text>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Timer progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: barWidth }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CUSTOMER</Text>
          <Text style={styles.customerName}>{order.customerName || 'Unknown'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ORDER ITEMS</Text>
          {(order.items || []).map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>x{item.qty}</Text>
                <Text style={styles.itemPrice}>LKR {((item.price || 0) * (item.qty || 1)).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>LKR {(order.totalPrice || 0).toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionArea}>
        <TouchableOpacity
          style={[styles.acceptBtn, submitting && styles.btnDisabled]}
          onPress={handleAccept}
          disabled={submitting}
        >
          <Text style={styles.acceptBtnText}>Γ£ô  ACCEPT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, submitting && styles.btnDisabled]}
          onPress={() => setShowRejectModal(true)}
          disabled={submitting}
        >
          <Text style={styles.rejectBtnText}>Γ£ò  REJECT</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reason for Rejection</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={rejectReason} onValueChange={(v) => setRejectReason(v)}>
                {REJECT_REASONS.map((r) => (
                  <Picker.Item key={r} label={r} value={r} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => handleReject(rejectReason)}>
              <Text style={styles.confirmBtnText}>Confirm Rejection</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRejectModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#064e3b' },
  timerBadge: {
    backgroundColor: '#fef2f2', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 6, borderWidth: 1, borderColor: '#fca5a5',
  },
  timerText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  progressTrack: { height: 6, backgroundColor: '#fee2e2' },
  progressBar: { height: 6, backgroundColor: '#dc2626' },
  content: { padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginBottom: 8, letterSpacing: 1 },
  customerName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  itemName: { fontSize: 15, color: '#374151', flex: 1 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemQty: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  itemPrice: { fontSize: 14, color: '#059669', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#374151' },
  totalAmount: { fontSize: 20, fontWeight: '900', color: '#059669' },
  actionArea: {
    padding: 20, gap: 12, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  acceptBtn: {
    backgroundColor: '#059669', borderRadius: 14, padding: 18, alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.3, elevation: 4,
  },
  acceptBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  rejectBtn: { borderWidth: 2, borderColor: '#dc2626', borderRadius: 14, padding: 16, alignItems: 'center' },
  rejectBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  btnDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#064e3b', marginBottom: 16 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  confirmBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#6b7280', fontSize: 15 },
});
