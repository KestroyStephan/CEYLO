import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Linking, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, Button, IconButton, List, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const EMBASSIES = [
  { country: 'United Kingdom', phone: '+94 11 5390639', address: 'Bauddhaloka Mawatha, Colombo 07' },
  { country: 'United States', phone: '+94 11 2498500', address: 'Galle Road, Colombo 03' },
  { country: 'Germany', phone: '+94 11 2580431', address: 'Alfred House Gardens, Colombo 03' },
  { country: 'China', phone: '+94 11 2688610', address: 'Vidya Mawatha, Colombo 07' },
];

export default function SOSScreen() {
  const [active, setActive] = useState(false);
  const [activeDocId, setActiveDocId] = useState(null);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  const sendSOSAlert = async () => {
    if (active && activeDocId) {
      setLoading(true);
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const alertRef = doc(db, "sos_alerts", activeDocId);
        await updateDoc(alertRef, { status: 'resolved', resolvedAt: serverTimestamp() });
        setActive(false);
        setActiveDocId(null);
      } catch (error) {
        console.error("Error resolving SOS:", error);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      let location = null;
      let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        location = await Location.getCurrentPositionAsync({});
      }

      const user = auth.currentUser;
      const alertData = {
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'Tourist',
        phone: user?.phoneNumber || 'N/A',
        status: 'active',
        timestamp: serverTimestamp(),
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : null
      };

      const docRef = await addDoc(collection(db, "sos_alerts"), alertData);
      setActive(true);
      setActiveDocId(docRef.id);
      alert("Emergency Alert Sent! Admin is being notified.");
    } catch (error) {
      console.error("Error sending SOS:", error);
      alert("Failed to send alert. Please call emergency services directly.");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (num) => Linking.openURL(`tel:${num}`);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#FF5252', '#D32F2F']} style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Support</Text>
        <Text style={styles.headerSubtitle}>Immediate assistance across Sri Lanka</Text>
      </LinearGradient>

      <View style={styles.sosSection}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: active ? 0.4 : 0 }]} />
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={[styles.sosBtn, active && { backgroundColor: '#B71C1C' }]}
          onPress={sendSOSAlert}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.sosText}>...</Text>
          ) : (
            <>
              <Text style={styles.sosText}>{active ? 'ALERT' : 'SOS'}</Text>
              <Text style={styles.tapText}>{active ? 'ON - Tap to off' : 'Tap for Help'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actionGrid}>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="phone-classic" mode="contained" containerColor="#D32F2F" iconColor="#FFF" onPress={() => handleCall('119')} />
          <Text style={styles.actionLabel}>Police</Text>
          <Text style={styles.actionNum}>119</Text>
        </Surface>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="ambulance" mode="contained" containerColor="#00695C" iconColor="#FFF" onPress={() => handleCall('1990')} />
          <Text style={styles.actionLabel}>Ambulance</Text>
          <Text style={styles.actionNum}>1990</Text>
        </Surface>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="fire" mode="contained" containerColor="#E65100" iconColor="#FFF" onPress={() => handleCall('110')} />
          <Text style={styles.actionLabel}>Fire</Text>
          <Text style={styles.actionNum}>110</Text>
        </Surface>
      </View>

      <View style={[styles.actionGrid, { marginTop: 15 }]}>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="shield-account" mode="contained" containerColor="#FFB300" iconColor="#FFF" onPress={() => handleCall('0112421052')} />
          <Text style={styles.actionLabel}>Tourist Police</Text>
          <Text style={styles.actionNum}>Hotline</Text>
        </Surface>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="face-woman" mode="contained" containerColor="#C2185B" iconColor="#FFF" onPress={() => handleCall('1929')} />
          <Text style={styles.actionLabel}>Women Aid</Text>
          <Text style={styles.actionNum}>1929</Text>
        </Surface>
        <Surface style={styles.actionCard} elevation={2}>
          <IconButton icon="hospital-box" mode="contained" containerColor="#1976D2" iconColor="#FFF" onPress={() => handleCall('0112691111')} />
          <Text style={styles.actionLabel}>Gen. Hospital</Text>
          <Text style={styles.actionNum}>Colombo</Text>
        </Surface>
      </View>

      <View style={styles.embassySection}>
        <Text style={styles.sectionTitle}>Embassy & Consulates</Text>
        <Searchbar
          placeholder="Search by country..."
          onChangeText={setSearch}
          value={search}
          style={styles.search}
          inputStyle={{ fontFamily: 'Outfit-Regular' }}
        />
        <Surface style={styles.embassyList} elevation={1}>
          {EMBASSIES.filter(e => e.country.toLowerCase().includes(search.toLowerCase())).map((e, i) => (
            <List.Item
              key={i}
              title={e.country}
              titleStyle={styles.listTitle}
              description={e.address}
              descriptionStyle={styles.listDesc}
              left={props => <List.Icon {...props} icon="flag-outline" color="#D32F2F" />}
              right={props => (
                <IconButton icon="phone" onPress={() => handleCall(e.phone)} />
              )}
            />
          ))}
        </Surface>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 40, paddingTop: 60, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 16, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  sosSection: { height: 300, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FF5252' },
  sosBtn: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15 },
  sosText: { color: '#FFF', fontSize: 42, fontFamily: 'Outfit-Bold' },
  tapText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Outfit-Medium', marginTop: 5 },
  actionGrid: { flexDirection: 'row', justifyContent: 'center', gap: 15, paddingHorizontal: 20 },
  actionCard: { width: width / 3.6, backgroundColor: '#FFF', borderRadius: 20, padding: 15, alignItems: 'center', gap: 5 },
  actionLabel: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666' },
  actionNum: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  embassySection: { padding: 24, marginTop: 20 },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15 },
  search: { borderRadius: 15, backgroundColor: '#FFF', marginBottom: 15 },
  embassyList: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  listTitle: { fontFamily: 'Outfit-Bold', fontSize: 16 },
  listDesc: { fontFamily: 'Outfit-Regular', fontSize: 12, color: '#999' },
});
