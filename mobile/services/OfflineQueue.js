/**
 * OfflineQueue.js
 * Persistent queue for operations that fail due to no network connection.
 * Priority order on flush: SOS ΓåÆ bookings ΓåÆ reviews ΓåÆ other
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../firebaseConfig';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import 'react-native-get-random-values';

const QUEUE_KEY = 'ceylo_offline_queue';
const PRIORITY = { sos: 0, booking: 1, review: 2, other: 3 };

// Generate a simple UUID-like ID
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

class OfflineQueueService {
  constructor() {
    this._flushing = false;
    this._unsubscribeNetInfo = null;
  }

  /** Start listening for reconnection and auto-flush */
  startListening() {
    this._unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.flush();
      }
    });
  }

  stopListening() {
    if (this._unsubscribeNetInfo) {
      this._unsubscribeNetInfo();
      this._unsubscribeNetInfo = null;
    }
  }

  /** Add an operation to the queue */
  async enqueue(type, payload) {
    try {
      const queue = await this._load();
      queue.push({
        id: generateId(),
        type,
        payload,
        enqueuedAt: new Date().toISOString(),
        priority: PRIORITY[type] ?? PRIORITY.other,
      });
      await this._save(queue);
      console.log(`[OfflineQueue] Enqueued: ${type}`);
    } catch (e) {
      console.error('[OfflineQueue] Enqueue error:', e.message);
    }
  }

  /** Flush the queue ΓÇö write all pending operations to Firestore */
  async flush() {
    if (this._flushing) return;
    this._flushing = true;
    try {
      const queue = await this._load();
      if (queue.length === 0) { this._flushing = false; return; }

      // Sort by priority then enqueue time
      queue.sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : a.enqueuedAt.localeCompare(b.enqueuedAt)
      );

      const remaining = [];
      for (const item of queue) {
        try {
          await this._execute(item);
          console.log(`[OfflineQueue] Flushed: ${item.type} ${item.id}`);
        } catch (e) {
          console.error(`[OfflineQueue] Flush failed for ${item.id}:`, e.message);
          remaining.push(item);
        }
      }
      await this._save(remaining);
    } finally {
      this._flushing = false;
    }
  }

  /** Execute a single queued operation */
  async _execute(item) {
    const { type, payload } = item;
    switch (type) {
      case 'sos':
        await setDoc(doc(db, 'EmergencyLogs', payload.docId), payload.data);
        break;
      case 'booking':
        await addDoc(collection(db, 'bookings'), payload);
        break;
      case 'review':
        await addDoc(collection(db, 'reviews'), payload);
        break;
      default:
        console.warn(`[OfflineQueue] Unknown type: ${type}`);
    }
  }

  async _load() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async _save(queue) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async getQueueLength() {
    const q = await this._load();
    return q.length;
  }
}

export const OfflineQueue = new OfflineQueueService();
