/**
 * In-app voice calls between people who share a booking, order or ride.
 *
 * A call is a Firestore document calls/{callId}:
 *   { callerId, callerName, calleeId, calleeName, contextType: 'booking'|'order', contextId,
 *     status: 'ringing'|'accepted'|'declined'|'missed'|'ended', createdAt, answeredAt, endedAt, durationSec }
 * Both phones listen to it; the voice itself goes through Agora on the channel named after callId.
 * The backend gives each side a short-lived Agora token after checking they are on the call.
 */
import { Platform } from 'react-native';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { API_BASE_URL, AGORA_APP_ID } from '../config';
import { toast } from '../components/Toast';

const listeners = new Set();
let current = null; // { callId, role: 'caller'|'callee', otherName }

/** CallHost subscribes here to show the ringing / in-call screen. */
export function onCallChange(fn) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function setActiveCall(call) {
  current = call;
  listeners.forEach(fn => fn(current));
}

async function authed(path, body) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Start a call. `contextType`/`contextId` name the booking or order the two people share
 * (the security rules only allow calls between people on the same booking or order).
 */
export async function startCall({ calleeId, calleeName, contextType, contextId }) {
  if (Platform.OS === 'web') {
    toast.info('Use the mobile app', 'In-app calls work in the CEYLO phone app.');
    return;
  }
  const me = auth.currentUser;
  if (!me || !calleeId || calleeId === me.uid) return;
  if (current) { toast.info('Already on a call', 'Finish the current call first.'); return; }
  try {
    const ref = await addDoc(collection(db, 'calls'), {
      callerId: me.uid,
      callerName: me.displayName || 'CEYLO user',
      calleeId,
      calleeName: calleeName || '',
      contextType,
      contextId,
      status: 'ringing',
      createdAt: serverTimestamp(),
    });
    setActiveCall({ callId: ref.id, role: 'caller', otherName: calleeName || 'Calling…' });
    authed('/api/call/notify', { callId: ref.id }).catch(() => {}); // ring their phone even if the app is closed
  } catch (e) {
    toast.error('Could not start the call', e.message.includes('permission') ? 'You can call only people on your accepted bookings and orders.' : e.message);
  }
}

/** Agora channel credentials for a call this user is part of. */
export async function callCredentials(callId) {
  const data = await authed('/api/call/token', { callId });
  return { appId: data.appId || AGORA_APP_ID, channel: data.channel || callId, token: data.token || '' };
}

export const updateCall = (callId, fields) => updateDoc(doc(db, 'calls', callId), fields);

export const watchCall = (callId, fn) => onSnapshot(doc(db, 'calls', callId), snap => fn(snap.exists() ? snap.data() : null), () => fn(null));

/** Calls ringing for this user right now. */
export function watchIncoming(uid, fn) {
  return onSnapshot(
    query(collection(db, 'calls'), where('calleeId', '==', uid), where('status', '==', 'ringing')),
    snap => fn(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    () => fn([]),
  );
}
