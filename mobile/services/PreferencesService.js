/**
 * PreferencesService.js
 * Traveller preferences (FR-010): eco and culture interest, budget, trip length, mobility and
 * crowd avoidance. Saved on the phone (works offline) and in Firestore (follows the account).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const KEY = 'travelPreferencesV2';

export const DEFAULT_PREFERENCES = {
  ecoPct: 75,
  culturePct: 50,
  budget: 'Standard',      // Economy | Standard | Luxury
  days: 5,
  mobility: 'standard',    // standard | low | walking
  avoidCrowds: false,
};

const clean = (p = {}) => ({ ...DEFAULT_PREFERENCES, ...p });

/** Phone copy first (instant, offline), then the account copy if the phone has none. */
export async function loadPreferences() {
  try {
    const local = await AsyncStorage.getItem(KEY);
    if (local) return clean(JSON.parse(local));
  } catch (e) {
    // fall through to Firestore
  }
  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const remote = snap.exists() ? snap.data().travelPreferences : null;
      if (remote && remote.ecoPct != null) {
        const prefs = clean(remote);
        AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
        return prefs;
      }
    } catch (e) {
      console.log('Could not load preferences from account:', e.message);
    }
  }
  return { ...DEFAULT_PREFERENCES };
}

export async function savePreferences(prefs) {
  const value = { ...clean(prefs), updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
  const uid = auth.currentUser?.uid;
  if (uid) {
    // Not awaited: the phone copy is enough to continue offline
    setDoc(doc(db, 'users', uid), { travelPreferences: value }, { merge: true })
      .catch(e => console.log('Preference sync failed:', e.message));
  }
  return value;
}

/** The trip mood the sliders point to: whichever interest is stronger. */
export function moodFromPreferences(p) {
  if (p.culturePct >= 60 && p.culturePct > p.ecoPct) return 'Culture Seeker';
  if (p.ecoPct >= 60) return 'Eco Explorer';
  return 'Family';
}
