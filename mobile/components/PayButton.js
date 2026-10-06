import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { payOnline, onlinePaymentsAvailable } from '../services/aiClient';

/**
 * "Pay online" for a ride, guide tour or marketplace order, or a "Paid" badge once PayHere has
 * confirmed it. `record` is the live Firestore document, so the badge appears by itself.
 */
export default function PayButton({ kind, id, record, amountLabel, cashHint = 'You can also pay in cash.' }) {
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onlinePaymentsAvailable().then(setAvailable);
  }, []);

  if (record?.paymentStatus === 'paid') {
    return (
      <View style={[styles.row, styles.paid]}>
        <MaterialCommunityIcons name="check-decagram" size={20} color="#1B5E20" />
        <Text style={styles.paidText}>
          Paid online{record.paidAmount ? ` · ${record.paidCurrency || ''} ${Number(record.paidAmount).toLocaleString()}` : ''}
        </Text>
      </View>
    );
  }
  if (available === false) return null;

  const start = async () => {
    setBusy(true);
    try {
      await payOnline(kind, id);
    } catch (e) {
      Alert.alert('Payment could not start', e.message.includes('409') ? e.message.split(': ').pop().replace(/[{}"]/g, '').replace('error:', '') : 'Check your connection and try again, or pay in cash.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TouchableOpacity style={[styles.row, styles.btn]} onPress={start} disabled={busy || available === null} accessibilityLabel={`Pay ${amountLabel} online`}>
        {busy ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name="credit-card-outline" size={20} color="#FFF" />}
        <Text style={styles.btnText}>{record?.paymentStatus === 'failed' ? 'Try the payment again' : `Pay ${amountLabel} online`}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Card, eZ Cash, mCash or Genie through PayHere. {cashHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 },
  btn: { backgroundColor: '#1A3C8F' },
  btnText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 15 },
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', textAlign: 'center', marginTop: 6 },
  paid: { backgroundColor: '#E8F5E9' },
  paidText: { color: '#1B5E20', fontFamily: 'Outfit-Bold', fontSize: 15 },
});
