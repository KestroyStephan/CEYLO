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

const isExpoGo = Constants.appOwnership === 'expo';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

// Configure foreground notification behavior
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Deep-link routing map: notification.data.type ΓåÆ { screen, params }
const ROUTE_MAP = {
  booking_confirmed: (data) => ({ screen: 'VendorTabs', params: { screen: 'VendorOrders' } }),
  booking_rejected: (data) => ({ screen: 'VendorTabs', params: { screen: 'VendorDashboard' } }),
  new_booking: (data) => ({ screen: 'VendorTabs', params: { screen: 'VendorDashboard' } }),
  chat_message: (data) => ({
    screen: 'VendorChat', params: { bookingId: data.bookingId, order: {} },
  }),
  sos_update: (data) => ({ screen: 'VendorDashboard', params: {} }),
  vendor_approved: (data) => ({ screen: 'VendorPortal', params: {} }),
};

class NotificationServiceClass {
  _responseSubscription = null;
  _foregroundSubscription = null;
  _navigation = null;

  async init(navigation) {
    this._navigation = navigation;
    if (isExpoGo) {
      console.log('[Notifications] Running in Expo Go, skipping setup.');
      return;
    }
    await this._requestPermission();
    await this._registerToken();
    this._setupHandlers();
  }

  async _requestPermission() {
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
  }

  async _registerToken() {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      const uid = auth.currentUser?.uid;
      if (uid && token) {
        await updateDoc(doc(db, 'users', uid), { expoPushToken: token });
        console.log('[Notifications] Token registered:', token.slice(0, 20) + '...');
      }

      // Handle token refresh
      Notifications.addPushTokenListener(async ({ data: newToken }) => {
        const currentUid = auth.currentUser?.uid;
        if (currentUid && newToken) {
          await updateDoc(doc(db, 'users', currentUid), { expoPushToken: newToken });
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

    // Tap on notification ΓåÆ navigate
    this._responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      this._route(data);
    });
  }

  _route(data) {
    if (!this._navigation || !data.type) return;
    const routeFn = ROUTE_MAP[data.type];
    if (!routeFn) return;
    const { screen, params } = routeFn(data);
    try {
      this._navigation.navigate(screen, params);
    } catch (e) {
      console.log('[Notifications] Navigation error:', e.message);
    }
  }

  /** Call on logout to clean up listeners */
  cleanup() {
    if (isExpoGo) return;
    this._foregroundSubscription?.remove();
    this._responseSubscription?.remove();
  }

  /** Send a local test notification (dev use) */
  async sendLocal(title, body, data = {}) {
    if (isExpoGo) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  }
}

export const NotificationService = new NotificationServiceClass();
