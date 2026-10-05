/**
 * Analytics.js
 * Research usage events for the evaluation (Objectives 4-6, RQ1 and RQ3-RQ6).
 * Events are only recorded after the traveller agrees on the consent screen, carry the
 * user id and recommendation strategy but never a name, and can be switched off in Profile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const consentKey = (uid) => `analyticsConsent_${uid}`;

let consent = null;   // true | false | null (not loaded yet)
let strategy = null;
let cachedUid = null;

// Cached values belong to one account; drop them when someone else signs in
function forUser(uid) {
  if (uid !== cachedUid) {
    cachedUid = uid;
    consent = null;
    strategy = null;
  }
}

export async function hasAnalyticsConsent() {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  forUser(uid);
  if (consent !== null) return consent;
  try {
    const local = await AsyncStorage.getItem(consentKey(uid));
    if (local !== null) return (consent = local === 'yes');
    const snap = await getDoc(doc(db, 'users', uid));
    const saved = snap.exists() ? snap.data().consent : null;
    if (saved) {
      consent = Boolean(saved.analytics);
      AsyncStorage.setItem(consentKey(uid), consent ? 'yes' : 'no').catch(() => {});
      return consent;
    }
  } catch (e) {
    console.log('Could not read analytics consent:', e.message);
  }
  return false;
}

/** Saves the consent choice on the phone and on the account. */
export async function setAnalyticsConsent(analytics, extra = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  forUser(uid);
  consent = Boolean(analytics);
  await AsyncStorage.setItem(consentKey(uid), consent ? 'yes' : 'no');
  await setDoc(doc(db, 'users', uid), {
    consent: { analytics: consent, at: new Date().toISOString(), version: 1 },
    ...extra,
  }, { merge: true });
}

async function myStrategy(uid) {
  if (strategy) return strategy;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    strategy = (snap.exists() && snap.data().recStrategy) || 'unassigned';
  } catch (e) {
    return 'unassigned';
  }
  return strategy;
}

/**
 * Records one usage event. Never throws and never blocks the screen that calls it.
 * type: recommendation_shown | itinerary_opened | itinerary_edited | destination_viewed |
 *       place_saved | place_checked_in | booking_made | event_viewed | alert_opened |
 *       vendor_contacted | sos_used | chat_message
 */
export function logEvent(type, data = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  (async () => {
    if (!(await hasAnalyticsConsent())) return;
    await addDoc(collection(db, 'usage_events'), {
      userId: uid,
      type,
      data,
      strategy: await myStrategy(uid),
      platform: Platform.OS,
      createdAt: serverTimestamp(),
    });
  })().catch(e => console.log('Usage event not recorded:', e.message));
}
