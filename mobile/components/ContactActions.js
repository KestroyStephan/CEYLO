import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { toast } from './Toast';
import { startCall } from '../services/calls';

/** The signed-in user's own phone (profile first, then the sign-in number). Saved on bookings and orders. */
export async function getMyPhone() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const phone = snap.exists() ? snap.data().phone : null;
    return phone || user.phoneNumber || null;
  } catch {
    return user.phoneNumber || null;
  }
}

/** A partner's phone: guides, drivers and vendors have public profiles. Tourists' profiles stay private. */
export async function getPartnerPhone(uid, collectionName = 'users') {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, collectionName, uid));
    return snap.exists() ? (snap.data().phone || null) : null;
  } catch {
    return null;
  }
}

/**
 * Get in touch with the other person on a booking, order or ride: a phone call, WhatsApp,
 * or the in-app chat. Numbers are only passed in once the booking is accepted, so strangers
 * never see each other's numbers.
 *
 * <ContactActions name="Saman" phone="0771234567" onChat={() => navigation.navigate(...)} />
 */

// 077 123 4567 / +94 77 123 4567 / 0094… -> +94771234567 (other countries are left as typed)
export function toInternational(phone) {
  const raw = String(phone || '').replace(/[^\d+]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0094')) return `+${raw.slice(2)}`;
  if (raw.startsWith('94') && raw.length === 11) return `+${raw}`;
  if (raw.startsWith('0') && raw.length === 10) return `+94${raw.slice(1)}`;
  return raw;
}

/**
 * appCall = { calleeId, contextType: 'booking'|'order', contextId } adds an in-app voice call
 * (no phone numbers needed); only people on the same booking or order can call each other.
 */
export default function ContactActions({ name, phone, onChat, appCall, style }) {
  const number = toInternational(phone);

  const call = () => {
    if (!number) { toast.info('No phone number', `${name || 'They'} has not shared a phone number. Use the chat instead.`); return; }
    Linking.openURL(`tel:${number}`).catch(() => toast.error('Could not start the call', 'Your phone cannot make calls from here.'));
  };

  const whatsapp = async () => {
    if (!number) { toast.info('No phone number', `${name || 'They'} has not shared a phone number. Use the chat instead.`); return; }
    const digits = number.replace('+', '');
    const app = `whatsapp://send?phone=${digits}`;
    try {
      if (await Linking.canOpenURL(app)) await Linking.openURL(app);
      else await Linking.openURL(`https://wa.me/${digits}`);
    } catch {
      toast.error('WhatsApp not available', 'Install WhatsApp or use the call button.');
    }
  };

  return (
    <View style={[{ gap: 8 }, style]}>
    {appCall?.calleeId && appCall?.contextId ? (
      <TouchableOpacity style={[styles.btn, styles.appCall]}
        onPress={() => startCall({ calleeId: appCall.calleeId, calleeName: name, contextType: appCall.contextType, contextId: appCall.contextId })}
        accessibilityLabel={`In-app voice call with ${name || ''}`}>
        <MaterialCommunityIcons name="phone-in-talk" size={18} color="#FFFFFF" />
        <Text style={styles.callText}>Call in app (free)</Text>
      </TouchableOpacity>
    ) : null}
    <View style={styles.row}>
      <TouchableOpacity style={[styles.btn, styles.call]} onPress={call} accessibilityLabel={`Call ${name || ''}`}>
        <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
        <Text style={styles.callText}>Call</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={whatsapp} accessibilityLabel={`WhatsApp ${name || ''}`}>
        <MaterialCommunityIcons name="whatsapp" size={18} color="#1B7F4B" />
        <Text style={styles.ghostText}>WhatsApp</Text>
      </TouchableOpacity>
      {onChat ? (
        <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={onChat} accessibilityLabel={`Chat with ${name || ''}`}>
          <MaterialCommunityIcons name="message-text-outline" size={18} color="#00695C" />
          <Text style={styles.ghostText}>Chat</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  call: { backgroundColor: '#00695C' },
  appCall: { flex: 0, backgroundColor: '#004D40' },
  callText: { color: '#FFFFFF', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  ghost: { backgroundColor: '#E8F3EC' },
  ghostText: { color: '#00695C', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
});
