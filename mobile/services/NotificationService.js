/**
 * NotificationService.js
 * Handles expo-notifications: permission, token registration,
 * foreground/background handlers, and deep-link routing.
 *
 * Usage: call NotificationService.init(navigation) once after login.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logEvent } from './Analytics';

const isExpoGo = Constants.appOwnership === 'expo';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Deep-link routing map: notification.data.type -> { screen, params }
// Screens live in different navigators per role; only routes that exist for that role are used.
const ROUTE_MAP = {
  booking_confirmed: () => ({ screen: 'VendorTabs', params: { screen: 'VendorOrders' } }),
  booking_rejected: () => ({ screen: 'VendorTabs', params: { screen: 'VendorHome' } }),
  new_booking: () => ({ screen: 'VendorTabs', params: { screen: 'VendorHome' } }),
  chat_message: (data) => ({
    screen: 'VendorChat', params: { bookingId: data.bookingId, order: {} },
  }),
  sos_update: () => ({ screen: 'SOSScreen', params: {} }),
  vendor_approved: () => ({ screen: 'VendorPortal', params: {} }),
  geofence_enter: () => ({ screen: 'CulturalEvents', params: {} }),
  event_reminder: () => ({ screen: 'CulturalEvents', params: {} }),
  admin_broadcast: () => null,
};

class NotificationServiceClass {
  _responseSubscription = null;
  _foregroundSubscription = null;
  _navigation = null;
  _initialized = false;
  _tokenListener = null;

  async init(navigation) {
    this._navigation = navigation;
    if (this._initialized) {
      // Already listening; just make sure the signed-in user's token is stored
      if (!isExpoGo) await this._registerToken();
      return;
    }
    this._initialized = true;
    
    // Always request permission and set up handlers so local notifications work in Expo Go
    await this._requestPermission();
    this._setupHandlers();

    if (isExpoGo) {
      console.log('[Notifications] Running in Expo Go — push tokens disabled, local notifications still active.');
      return;
    }
    
    await this._registerToken();
  }

  async _requestPermission() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') return;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Notifications] Permission not granted');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    } catch (e) {
      console.log('[Notifications] Permission request error:', e.message);
    }
  }

  async _registerToken() {
    try {
      // For Web, we need a VAPID key. If not present, skip to avoid 400 error.
      let tokenData;
      if (Platform.OS === 'web') {
        const vapidKey = Constants.expoConfig?.notification?.vapidPublicKey;
        if (!vapidKey) {
          console.log('[Notifications] Web registration skipped: No vapidPublicKey in app.json');
          return;
        }
        tokenData = await Notifications.getExpoPushTokenAsync({ vapidKey });
      } else {
        tokenData = await Notifications.getExpoPushTokenAsync();
      }

      const token = tokenData.data;
      const uid = auth.currentUser?.uid;
      if (uid && token) {
        await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
        console.log('[Notifications] Token registered:', token.slice(0, 20) + '...');
      }

      // Handle token refresh (registered once)
      if (this._tokenListener) return;
      this._tokenListener = Notifications.addPushTokenListener(async ({ data: newToken }) => {
        const currentUid = auth.currentUser?.uid;
        if (currentUid && newToken) {
          await setDoc(doc(db, 'users', currentUid), { expoPushToken: newToken }, { merge: true });
        }
      });
    } catch (e) {
      console.log('[Notifications] Token error:', e.message);
    }
  }

  _setupHandlers() {
    // Foreground notifications
    this._foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Foreground:', notification.request.content.title);
    });

    // Tap on notification -> navigate
    this._responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      logEvent('alert_opened', { kind: data.type || 'general' });
      this._route(data);
    });
  }

  _route(data) {
    if (!this._navigation || !data.type) return;
    const routeFn = ROUTE_MAP[data.type];
    if (!routeFn) return;
    const target = routeFn(data);
    if (!target) return;
    const { screen, params } = target;
    try {
      this._navigation.navigate(screen, params);
    } catch (e) {
      console.log('[Notifications] Navigation error:', e.message);
    }
  }

  /** Call on logout to clean up listeners */
  cleanup() {
    this._foregroundSubscription?.remove();
    this._responseSubscription?.remove();
  }

  /** Send a local test notification (dev use) */
  async sendLocal(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  }
}

export const NotificationService = new NotificationServiceClass();
