import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
  StatusBar, Animated, Easing
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WHILE_WAIT_ITEMS = [
  {
    icon: 'file-document-check-outline',
    iconBg: '#E8F5E9',
    iconColor: '#006A3B',
    title: 'Check Documentation',
    subtitle: 'Ensure your license scans are high-resolution and clearly legible for faster approval.',
  },
  {
    icon: 'leaf-circle-outline',
    iconBg: '#FFF8DC',
    iconColor: '#8B6914',
    title: 'Review Eco-Ethics',
    subtitle: 'Brush up on our 2024 Sustainable Guiding Guidelines to prepare for your first booking.',
  },
];

export default function GuidePendingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('pending'); // pending | approved | rejected
  const [loading, setLoading] = useState(true);
  const [progressAnim] = useState(new Animated.Value(0.66)); // Stage 2 of 3 = 66%

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    Animated.timing(progressAnim, {
      toValue: 0.66,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const role = snap.data().role;
          if (role === 'guide') {
            setStatus('approved');
            setTimeout(() => navigation.replace('GuideDashboard'), 1800);
          } else if (role === 'guide_rejected') {
            setStatus('rejected');
          } else {
            setStatus('pending');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.log('GuidePendingScreen listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
        <Text style={styles.brandName}>LankaEco</Text>
        <View style={styles.avatarSmall}>
          <MaterialCommunityIcons name="account" size={20} color="#FFF" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Shield Hero */}
        <View style={styles.shieldContainer}>
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <MaterialCommunityIcons name="shield-check" size={42} color="#006A3B" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.heroTitle}>Application Received</Text>
        <Text style={styles.heroSubTitle}>
          We've received your registration for the{' '}
          <Text style={styles.link}>Eco-Guide Program</Text>.{' '}
          Our administration is currently reviewing your credentials.
        </Text>

        {/* Verification Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <Text style={styles.statusLabel}>VERIFICATION STATUS</Text>
            <Text style={styles.statusStage}>Stage 2 of 3</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <View style={styles.estimateRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#8B6914" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.estimateTitle}>Estimated: 24-48 Hours</Text>
              <Text style={styles.estimateBody}>
                We prioritize quality over speed to ensure the safety of our eco-tourists and the integrity of the environment.
              </Text>
            </View>
          </View>
        </View>

        {/* While You Wait */}
        <Text style={styles.sectionTitle}>While you wait...</Text>
        {WHILE_WAIT_ITEMS.map((item, i) => (
          <View key={i} style={styles.waitCard}>
            <View style={[styles.waitIcon, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.waitTitle}>{item.title}</Text>
              <Text style={styles.waitBody}>{item.subtitle}</Text>
            </View>
          </View>
        ))}

        {/* CTA Buttons */}
        {status === 'approved' ? (
          <LinearGradient colors={['#006A3B', '#004D2C']} style={styles.dashBtn}>
            <MaterialCommunityIcons name="view-dashboard" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.dashBtnText}>Go to Dashboard</Text>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginLeft: 10 }} />
          </LinearGradient>
        ) : (
          <TouchableOpacity
            style={styles.dashBtn}
            onPress={() => Alert.alert('Pending', 'Your account is still under review. You will be notified when approved.')}
          >
            <LinearGradient colors={['#006A3B', '#004D2C']} style={StyleSheet.absoluteFillObject} />
            <MaterialCommunityIcons name="home-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.dashBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => Alert.alert('Contact Support', 'Please email: support@lankaeco.lk')}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={20} color="#4A5E4A" style={{ marginRight: 8 }} />
          <Text style={styles.supportBtnText}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutRow} onPress={() => signOut(auth)}>
          <MaterialCommunityIcons name="logout" size={16} color="#8A9E8A" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F4' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F4F7F4' },
  brandName: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#006A3B', justifyContent: 'center', alignItems: 'center' },

  body: { paddingHorizontal: 20, paddingBottom: 60, alignItems: 'center' },

  shieldContainer: { marginTop: 24, marginBottom: 20 },
  shieldOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  shieldInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },

  heroTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A', textAlign: 'center', marginBottom: 10 },
  heroSubTitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#4A5E4A', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  link: { fontFamily: 'Outfit-Bold', color: '#006A3B' },

  statusCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: '#EEF2EE' },
  statusCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusLabel: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#8A9E8A', letterSpacing: 0.8 },
  statusStage: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  progressTrack: { height: 6, backgroundColor: '#EEF2EE', borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#006A3B', borderRadius: 3 },
  estimateRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12 },
  estimateTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#735C00', marginBottom: 4 },
  estimateBody: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#8B6914', lineHeight: 18 },

  sectionTitle: { alignSelf: 'flex-start', fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 12 },
  waitCard: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEF2EE' },
  waitIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  waitTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 4 },
  waitBody: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B', lineHeight: 18 },

  dashBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingVertical: 16, marginTop: 20, overflow: 'hidden', backgroundColor: '#006A3B' },
  dashBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF' },
  supportBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingVertical: 14, marginTop: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E8E0' },
  supportBtnText: { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#4A5E4A' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  logoutText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
});
