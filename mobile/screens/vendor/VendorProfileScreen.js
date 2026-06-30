import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function VendorProfileScreen({ navigation }) {
  const [vendorData, setVendorData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubVendor = onSnapshot(
      doc(db, 'vendors', user.uid),
      (snap) => {
        if (snap.exists()) setVendorData(snap.data());
        setLoading(false);
      },
      (error) => {
        console.error('Vendor profile fetch error:', error);
        setLoading(false);
      }
    );

    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) setUserData(snap.data());
      },
      (error) => {
        console.error('User profile fetch error:', error);
      }
    );

    return () => {
      unsubVendor();
      unsubUser();
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Logout Failed', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  const infoItems = [
    { icon: 'person-outline', label: 'Owner Name', value: userData?.name },
    { icon: 'business-outline', label: 'Business Name', value: vendorData?.businessName },
    { icon: 'pricetag-outline', label: 'Business Type', value: vendorData?.businessType },
    { icon: 'mail-outline', label: 'Email', value: userData?.email },
    { icon: 'call-outline', label: 'Phone', value: vendorData?.phone },
    { icon: 'location-outline', label: 'Address', value: vendorData?.address },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <View style={styles.headerSection}>
        <View style={styles.avatarLarge}>
          <Ionicons name="storefront" size={36} color="#006A3B" />
        </View>
        <Text style={styles.businessNameHeader}>
          {vendorData?.businessName || 'Vendor'}
        </Text>
        {vendorData?.status === 'approved' && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#006A3B" />
            <Text style={styles.verifiedText}>Verified Vendor</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        {infoItems.map((item, index) => (
          <View key={item.label}>
            <View style={styles.infoRow}>
              <Ionicons name={item.icon} size={20} color="#3F4941" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>
                  {item.value || 'Not provided'}
                </Text>
              </View>
            </View>
            {index < infoItems.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#BA1A1A" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,106,59,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  businessNameHeader: { 
    fontSize: 20, fontWeight: '700', color: '#181D19',
    fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,106,59,0.1)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, marginTop: 8,
  },
  verifiedText: { fontSize: 11, color: '#006A3B', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 4,
    shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 3, marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  infoTextContainer: { marginLeft: 14, flex: 1 },
  infoLabel: { 
    fontSize: 11, color: '#6F7A70', marginBottom: 2, 
    textTransform: 'uppercase', letterSpacing: 0.5 
  },
  infoValue: { fontSize: 14, color: '#181D19', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#EBEFE8', marginHorizontal: 14 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#BA1A1A',
    borderRadius: 14, paddingVertical: 14, gap: 8,
  },
  logoutText: { color: '#BA1A1A', fontSize: 15, fontWeight: '700' },
});
