import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function DriverPendingScreen() {
  const [status, setStatus] = useState('pending_verification');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const role = snap.data().role;
        if (role === 'driver_active' || role === 'driver') {
          // App.js auth/role listener will auto-redirect
        }
      }
    });

    const unsubDriver = onSnapshot(doc(db, 'drivers', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStatus(data.status);
        setRejectionReason(data.rejectionReason || '');
      }
    });

    return () => {
      unsubUser();
      unsubDriver();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {status === 'pending_verification' && (
        <View style={[styles.card, styles.pendingCard]}>
          <Ionicons name="hourglass-outline" size={48} color="#FF8F00" />
          <Text style={styles.title}>Application Under Review</Text>
          <Text style={styles.subtitle}>
            Our team is reviewing your driver application. 
            This usually takes 1-2 business days.
          </Text>
        </View>
      )}

      {status === 'approved' && (
        <View style={[styles.card, styles.approvedCard]}>
          <Ionicons name="checkmark-circle" size={48} color="#006A3B" />
          <Text style={styles.title}>Welcome to CEYLO!</Text>
          <ActivityIndicator size="small" color="#006A3B" style={{ marginTop: 12 }} />
        </View>
      )}

      {status === 'rejected' && (
        <View style={[styles.card, styles.rejectedCard]}>
          <Ionicons name="close-circle" size={48} color="#BA1A1A" />
          <Text style={styles.title}>Application Rejected</Text>
          <Text style={styles.subtitle}>
            Reason: {rejectionReason || 'Not specified'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  pendingCard: { borderLeftWidth: 4, borderLeftColor: '#FF8F00' },
  approvedCard: { borderLeftWidth: 4, borderLeftColor: '#006A3B' },
  rejectedCard: { borderLeftWidth: 4, borderLeftColor: '#BA1A1A' },
  title: { fontSize: 18, fontWeight: '700', color: '#181D19', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#3F4941', marginTop: 8, textAlign: 'center' },
  logoutButton: { borderWidth: 1.5, borderColor: '#6F7A70', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#3F4941', fontWeight: '600' },
});
