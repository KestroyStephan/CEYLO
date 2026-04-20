import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Haptics from 'expo-haptics';

export default function ProofOfServiceScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [captured, setCaptured] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const captureAndUpload = async () => {
    if (!cameraRef.current) return;
    setUploading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setCaptured(true);

      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `proofs/${bookingId}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'bookings', bookingId), {
        proofUrl: url,
        status: 'completed',
        completionTime: new Date().toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Γ£à Proof saved', 'Service marked as completed.', [
        { text: 'Back to Orders', onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
      setUploading(false);
    }
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noPermText}>Camera permission is required.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={requestPermission}>
          <Text style={styles.retryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />

      {/* Overlay instructions */}
      <View style={styles.overlay}>
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>≡ƒô╖ Proof of Service</Text>
          <Text style={styles.overlaySubtitle}>
            Take a photo showing the completed service
          </Text>
        </View>

        <View style={styles.overlayFooter}>
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadingText}>Uploading proof...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureBtn} onPress={captureAndUpload}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  noPermText: { fontSize: 16, color: '#374151', marginBottom: 16 },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },
  overlayHeader: {
    backgroundColor: 'rgba(0,0,0,0.55)', padding: 24, paddingTop: 52,
    alignItems: 'center',
  },
  overlayTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  overlaySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  overlayFooter: {
    backgroundColor: 'rgba(0,0,0,0.55)', padding: 32, alignItems: 'center', gap: 16,
  },
  captureBtn: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#059669' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  uploadingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 28,
  },
  cancelBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  retryBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 14, marginTop: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
