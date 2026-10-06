import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { BACKEND_URL } from '../config';

/**
 * Push notification to one CEYLO app user (their Expo token lives in push_tokens/{uid}).
 * Never throws: the decision itself is already saved, the notification is a courtesy.
 * Resolves to true when the push service accepted it.
 */
export async function notifyUser(uid, title, body, data = {}) {
    try {
        const snap = await getDoc(doc(db, 'push_tokens', uid));
        const token = snap.exists() ? snap.data().token : null;
        if (!token || !String(token).startsWith('ExponentPushToken')) return false;
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ messages: [{ to: token, sound: 'default', title, body, data }] }),
        });
        return res.ok;
    } catch (e) {
        console.warn('Notification not sent:', e.message);
        return false;
    }
}
