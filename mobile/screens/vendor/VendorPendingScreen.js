import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const STATUS_CONFIG = {
  pending: {
    color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: 'ΓÅ│',
    title: 'Application Under Review',
    message: 'Your application is being reviewed by our team. This usually takes 1ΓÇô2 business days.',
  },
  approved: {
    color: '#059669', bg: '#f0fdf4', border: '#6ee7b7', icon: 'Γ£à',
    title: 'You Are Approved!',
    message: 'Welcome to the CEYLO vendor family. Redirecting you to your dashboard...',
  },
  rejected: {
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: 'Γ¥î',
    title: 'Application Rejected',
    message: null,
  },
};

export default function VendorPendingScreen() {
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onSnapshot(doc(db, 'vendors', uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVendorData(data);
        setLoading(false);

        if (data.status === 'approved') {
          try {
            // Update role ΓåÆ triggers App.js onAuthStateChanged re-render ΓåÆ routes to VendorNavigator
            await updateDoc(doc(db, 'users', uid), { role: 'vendor' });
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const status = vendorData?.status || 'pending';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.appName}>CEYLO Vendor</Text>
      </View>

      <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={styles.statusIcon}>{cfg.icon}</Text>
        <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={styles.statusMessage}>
          {status === 'rejected'
            ? `Reason: ${vendorData?.rejectionReason || 'Not specified.'}`
            : cfg.message}
        </Text>
        {status === 'approved' && <ActivityIndicator color="#059669" style={{ marginTop: 16 }} />}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>≡ƒôï What happens next?</Text>
        {status === 'pending' && (
          <>
            <Text style={styles.infoItem}>1. Our team reviews your documents</Text>
            <Text style={styles.infoItem}>2. You'll be notified here automatically</Text>
            <Text style={styles.infoItem}>3. Once approved, you'll access your dashboard</Text>
          </>
        )}
        {status === 'rejected' && (
          <>
            <Text style={styles.infoItem}>ΓÇó You may re-apply with corrected documents</Text>
            <Text style={styles.infoItem}>ΓÇó Contact support if you believe this is an error</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 24, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  header: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 28, fontWeight: '800', color: '#064e3b' },
  statusCard: {
    borderWidth: 1.5, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statusIcon: { fontSize: 52, marginBottom: 12 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  statusMessage: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  infoBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#064e3b', marginBottom: 12 },
  infoItem: { fontSize: 14, color: '#4b5563', marginBottom: 8, lineHeight: 20 },
  logoutBtn: {
    borderWidth: 1.5, borderColor: '#059669', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  logoutText: { color: '#059669', fontSize: 15, fontWeight: '600' },
});
