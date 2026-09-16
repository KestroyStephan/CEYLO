import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function WaitingApprovalScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, guideName, guidePhoto } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      if (snap.exists()) {
        setBooking(snap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, [bookingId]);

  const handlePayNow = async () => {
    // Mock Payment
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'confirmed' });
      navigation.navigate('Main'); // Navigate back to home or a success screen
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelAndGoHome = async () => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
      navigation.navigate('Main');
    } catch (error) {
      console.error(error);
    }
  };

  const handleFindAnother = () => {
    navigation.navigate('GuidesList');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#006A3B" />
      </View>
    );
  }

  const status = booking?.status || 'pending';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.closeBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: guidePhoto || 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400' }}
          style={styles.avatar}
        />
        <Text style={styles.guideName}>{guideName}</Text>

        {status === 'pending' && (
          <>
            <MaterialCommunityIcons name="clock-fast" size={60} color="#F57C00" style={styles.icon} />
            <Text style={styles.title}>Waiting for Approval</Text>
            <Text style={styles.subtitle}>
              Your request has been sent to {guideName}. We'll notify you as soon as they respond!
            </Text>
            <ActivityIndicator size="small" color="#F57C00" style={{ marginTop: 20, marginBottom: 40 }} />
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1, marginRight: 8 }]} onPress={handleCancelAndGoHome}>
                <Text style={styles.cancelBtnText}>Cancel Request</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, marginLeft: 8 }]} onPress={handleFindAnother}>
                <Text style={styles.secondaryBtnText}>Pick Another</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {status === 'accepted' && (
          <>
            <MaterialCommunityIcons name="check-decagram" size={60} color="#006A3B" style={styles.icon} />
            <Text style={styles.title}>Request Approved!</Text>
            <Text style={styles.subtitle}>
              {guideName} is available and has accepted your request. You can now securely complete the payment to confirm the booking.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handlePayNow}>
              <Text style={styles.primaryBtnText}>Pay Securely</Text>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryBtn, { marginTop: 12, flexDirection: 'row', gap: 8, width: '100%' }]} 
              onPress={() => {
                if (booking) {
                  const tId = booking.touristId || booking.userId;
                  const gId = booking.guideId || 'demo';
                  const combinedChatId = `${tId}_${gId}`;
                  console.log("WaitingApprovalScreen navigating to chat:", combinedChatId);
                  navigation.navigate('MessageScreen', { chatId: combinedChatId, recipientName: guideName });
                }
              }}
            >
              <MaterialCommunityIcons name="message-text-outline" size={18} color="#006A3B" />
              <Text style={styles.secondaryBtnText}>Message Guide</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'declined' && (
          <>
            <MaterialCommunityIcons name="close-circle-outline" size={60} color="#D32F2F" style={styles.icon} />
            <Text style={styles.title}>Request Declined</Text>
            <Text style={styles.subtitle}>
              Unfortunately, {guideName} is unable to accept your request at this time.
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleFindAnother}>
              <Text style={styles.secondaryBtnText}>Find Another Guide</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  closeBtn: { padding: 4 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, borderWidth: 3, borderColor: '#006A3B' },
  guideName: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 40 },
  icon: { marginBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#6B7B6B', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  primaryBtn: { backgroundColor: '#006A3B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 16, borderRadius: 12 },
  primaryBtnText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },
  secondaryBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#006A3B', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  cancelBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D32F2F', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#D32F2F' },
  actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' }
});
