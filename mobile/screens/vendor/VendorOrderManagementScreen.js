import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { auth, db, storage } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const STATUS_STEPS = ['accepted', 'preparing', 'ready', 'delivered'];
const STATUS_LABELS = { accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', delivered: 'Delivered' };

export default function VendorOrderManagementScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'bookings'),
      where('vendorId', '==', uid),
      where('status', 'in', ['accepted', 'preparing', 'ready'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const advanceStatus = async (order) => {
    const idx = STATUS_STEPS.indexOf(order.status);
    if (idx < STATUS_STEPS.length - 1) {
      try {
        await updateDoc(doc(db, 'bookings', order.id), { status: STATUS_STEPS[idx + 1] });
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    }
  };

  const openCamera = async (bookingId) => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera access is required for proof of service.');
        return;
      }
    }
    setActiveBookingId(bookingId);
    setCameraVisible(true);
  };

  const captureProof = async () => {
    if (!cameraRef) return;
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
      setCameraVisible(false);
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `proofs/${activeBookingId}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'bookings', activeBookingId), { proofUrl: url });
      Alert.alert('Uploaded Γ£ô', 'Proof of service saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderStepper = (order) => {
    const currentIdx = STATUS_STEPS.indexOf(order.status);
    return (
      <View style={styles.stepper}>
        {STATUS_STEPS.map((step, idx) => (
          <React.Fragment key={step}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                idx <= currentIdx && styles.stepDotActive,
                idx === currentIdx + 1 && styles.stepDotNext,
              ]}
              onPress={() => idx === currentIdx + 1 && advanceStatus(order)}
            >
              <Text style={[styles.stepDotText, idx <= currentIdx && styles.stepDotTextActive]}>
                {idx <= currentIdx ? 'Γ£ô' : idx + 1}
              </Text>
            </TouchableOpacity>
            {idx < STATUS_STEPS.length - 1 && (
              <View style={[styles.stepLine, idx < currentIdx && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={(r) => setCameraRef(r)} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureBtn} onPress={captureProof}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setCameraVisible(false)}>
            <Text style={styles.cancelCameraText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Orders</Text>
        <Text style={styles.orderCount}>{orders.length} active</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>≡ƒôª</Text>
          <Text style={styles.emptyText}>No active orders</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderCardHead}>
                <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.itemsSummary}>
                {item.items?.map((i) => `${i.name} x${i.qty}`).join(' ┬╖ ') || 'ΓÇö'}
              </Text>
              <Text style={styles.orderTotal}>LKR {(item.totalPrice || 0).toLocaleString()}</Text>
              {renderStepper(item)}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.proofBtn} onPress={() => openCamera(item.id)}>
                  <Text style={styles.proofBtnText}>≡ƒô╖ Proof of Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => navigation.navigate('VendorChat', { bookingId: item.id, order: item })}
                >
                  <Text style={styles.chatBtnText}>≡ƒÆ¼ Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 50, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#064e3b' },
  orderCount: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  orderCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { backgroundColor: '#d1fae5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  itemsSummary: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  orderTotal: { fontSize: 15, fontWeight: '800', color: '#059669', marginBottom: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#059669' },
  stepDotNext: { borderWidth: 2, borderColor: '#059669', backgroundColor: '#f0fdf4' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  stepDotTextActive: { color: '#fff' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#e5e7eb' },
  stepLineActive: { backgroundColor: '#059669' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  proofBtn: {
    flex: 1, borderWidth: 1, borderColor: '#059669', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  proofBtnText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  chatBtn: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10,
    padding: 10, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#f0fdf4',
  },
  chatBtnText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#059669' },
  cancelCameraBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  cancelCameraText: { color: '#fff', fontWeight: '600' },
});
