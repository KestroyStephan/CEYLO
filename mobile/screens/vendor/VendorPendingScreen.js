// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const PRIMARY   = '#006A3B';
const ERROR     = '#BA1A1A';
const TERTIARY  = '#735C00';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';

const STATUS_CFG = {
  vendor_pending: {
    color: '#735C00', bg: '#FFFBEB', border: '#F59E0B',
    icon: 'time-outline', iconColor: '#D97706',
    title: 'Application Under Review',
    message: 'Your application is being carefully reviewed by our team. This usually takes 1–2 business days. Thank you for your patience!',
  },
  vendor_active: {
    color: PRIMARY, bg: '#F0FDF4', border: '#6EE7B7',
    icon: 'checkmark-circle', iconColor: PRIMARY,
    title: 'You\'re Approved! 🎉',
    message: 'Welcome to the CEYLO vendor family! Redirecting you to your dashboard now...',
  },
  vendor: {
    color: PRIMARY, bg: '#F0FDF4', border: '#6EE7B7',
    icon: 'checkmark-circle', iconColor: PRIMARY,
    title: 'You\'re Approved! 🎉',
    message: 'Welcome to the CEYLO vendor family! Redirecting you to your dashboard now...',
  },
  vendor_rejected: {
    color: ERROR, bg: '#FEF2F2', border: '#FCA5A5',
    icon: 'close-circle', iconColor: ERROR,
    title: 'Application Rejected',
    message: null,
  },
};

const NEXT_STEPS = [
  { icon: 'document-text-outline', text: 'Our team reviews your submitted documents' },
  { icon: 'notifications-outline', text: 'You\'ll be notified here automatically' },
  { icon: 'storefront-outline',    text: 'Once approved, gain full vendor dashboard access' },
];

export default function VendorPendingScreen({ navigation }) {
  const [vendorStatus, setVendorStatus] = useState('pending_verification');
  const [rejectionReason, setRejectionReason] = useState('');
  const [displayStatus, setDisplayStatus] = useState('pending_verification');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to users doc for role changes
    const userUnsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const role = data.role;
          
          if (role === 'vendor_active' || 
              role === 'vendor') {
            // Admin approved - redirect to dashboard
            setTimeout(() => {
              navigation.replace('VendorPortal');
            }, 2000);
          }
        }
      },
      (err) => {
        console.log("VendorPendingScreen users listener error:", err.message);
      }
    );

    // Listen to vendors doc for status + rejection reason
    const vendorUnsub = onSnapshot(
      doc(db, 'vendors', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setVendorStatus(data.status);
          setRejectionReason(data.rejectionReason || '');
          
          if (data.status === 'approved') {
            setDisplayStatus('approved');
          } else if (data.status === 'rejected') {
            setDisplayStatus('rejected');
          } else {
            setDisplayStatus('pending_verification');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.log("VendorPendingScreen vendors listener error:", err.message);
        setLoading(false);
      }
    );

    return () => {
      userUnsub();
      vendorUnsub();
    };
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const STATUS_CFG = {
    pending_verification: {
      color: '#735C00', bg: '#FFFBEB', border: '#F59E0B',
      icon: 'hourglass-outline', iconColor: '#D97706',
      title: 'Application Under Review',
      message: 'Usually takes 1-2 business days.',
    },
    approved: {
      color: PRIMARY, bg: '#F0FDF4', border: '#6EE7B7',
      icon: 'checkmark-circle-outline', iconColor: PRIMARY,
      title: 'Welcome to CEYLO!',
      message: 'Welcome to CEYLO! Redirecting to your dashboard...',
    },
    rejected: {
      color: ERROR, bg: '#FEF2F2', border: '#FCA5A5',
      icon: 'close-circle-outline', iconColor: ERROR,
      title: 'Application Rejected',
      message: rejectionReason ? `Reason: ${rejectionReason}` : 'Application Rejected.',
    },
  };

  const cfg = STATUS_CFG[displayStatus] || STATUS_CFG.pending_verification;
  const isPending  = displayStatus === 'pending_verification';
  const isApproved = displayStatus === 'approved';
  const isRejected = displayStatus === 'rejected';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.appName}>CEYLO Vendor</Text>
        <View style={styles.logoCircle}>
          <Ionicons name="leaf" size={20} color={PRIMARY} />
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <View style={[styles.statusIconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={52} color={cfg.iconColor} />
        </View>
        <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={styles.statusMessage}>{cfg.message}</Text>
        {isApproved && <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />}
      </View>

      {/* Next Steps (pending only) */}
      {isPending && (
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>👋 What happens next?</Text>
          {NEXT_STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons name={s.icon} size={20} color={PRIMARY} />
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Rejected actions */}
      {isRejected && (
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What can you do?</Text>
          <Text style={styles.stepText}>• You may re-apply with corrected documents</Text>
          <TouchableOpacity style={styles.supportBtn} onPress={() => Alert.alert('Support', 'Please email support@ceylo.lk')}>
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={PRIMARY} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content:   { padding: 24, paddingTop: 56, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  appName:   { fontSize: 26, fontWeight: '900', color: ON_SURF },
  logoCircle:{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,106,59,0.1)', alignItems: 'center', justifyContent: 'center' },
  statusCard: { borderWidth: 1.5, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 20,
    shadowColor: '#181D19', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  statusIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  statusMessage: { fontSize: 14, color: ON_SURF_V, textAlign: 'center', lineHeight: 22 },
  rejectReasonBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginTop: 8, width: '100%' },
  rejectReasonLabel: { fontSize: 12, fontWeight: '700', color: ERROR, marginBottom: 4 },
  rejectReasonText: { fontSize: 14, color: ON_SURF, lineHeight: 20 },
  stepsCard: { backgroundColor: SURFACE, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#181D19', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  stepsTitle:  { fontSize: 16, fontWeight: '800', color: ON_SURF, marginBottom: 16 },
  stepRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  stepNumCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  stepIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,106,59,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepText:    { flex: 1, fontSize: 14, color: ON_SURF_V, lineHeight: 20 },
  supportBtn:  { marginTop: 12, paddingVertical: 12, backgroundColor: PRIMARY, borderRadius: 10, alignItems: 'center' },
  supportBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, paddingVertical: 14, marginTop: 24 },
  logoutText:  { color: PRIMARY, fontSize: 15, fontWeight: '700' },
});
