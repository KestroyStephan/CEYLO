import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text, Surface, Button, Avatar, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const VEHICLES = [
  { id: 'tuk', name: 'Tuk-Tuk', icon: 'auto-fix', price: '250', eco: '85', time: '2m' },
  { id: 'car', name: 'Premium Car', icon: 'car', price: '650', eco: '60', time: '5m' },
  { id: 'van', name: 'Family Van', icon: 'van-passenger', price: '1200', eco: '50', time: '8m' },
  { id: 'bike', name: 'Eco-Bike', icon: 'bicycle', price: '150', eco: '100', time: '3m' },
];

export default function TransportScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [selectedType, setSelectedType] = useState('tuk');
  const [step, setStep] = useState(1); // 1: Selector, 2: Searching, 3: Confirmed
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const handleBook = () => {
    setStep(2);
    setTimeout(() => setStep(3), 3000);
  };

  const RenderVehicle = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedType(item.id)}
      style={[styles.vehicleBtn, selectedType === item.id && styles.selectedVehicle]}
    >
      <MaterialCommunityIcons name={item.icon} size={32} color={selectedType === item.id ? '#FFF' : '#00695C'} />
      <Text style={[styles.vName, selectedType === item.id && { color: '#FFF' }]}>{item.name}</Text>
      <Text style={[styles.vPrice, selectedType === item.id && { color: '#FFF' }]}>LKR {item.price}</Text>
      <View style={[styles.ecoTag, { backgroundColor: selectedType === item.id ? 'rgba(255,255,255,0.2)' : '#E8F5E9' }]}>
        <Text style={[styles.ecoTagText, { color: selectedType === item.id ? '#FFF' : '#4CAF50' }]}>{item.eco}% ECO</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 6.9271,
          longitude: 79.8612,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {location && <Marker coordinate={location} title="Pickup" pinColor="#00695C" />}
      </MapView>

      <IconButton icon="arrow-left" mode="contained" containerColor="#FFF" style={styles.backBtn} onPress={() => navigation.goBack()} />

      <Surface style={styles.bottomSheet} elevation={5}>
        <View style={styles.dragBar} />
        
        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.sheetTitle}>Where to?</Text>
            <TouchableOpacity style={styles.destBox}>
              <MaterialCommunityIcons name="map-marker-search" size={20} color="#00695C" />
              <Text style={styles.destText}>Search destination...</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Select Vehicle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
              {VEHICLES.map(v => <RenderVehicle key={v.id} item={v} />)}
            </ScrollView>

            <Button mode="contained" onPress={handleBook} style={styles.bookBtn} buttonColor="#00695C">
              Book {VEHICLES.find(v => v.id === selectedType).name}
            </Button>
          </View>
        )}

        {step === 2 && (
          <View style={styles.loadingArea}>
            <ActivityIndicator animating={true} color="#00695C" size="large" />
            <Text style={styles.loadingText}>Finding nearest Eco-Driver...</Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.confirmedArea}>
            <View style={styles.driverRow}>
              <Avatar.Image size={60} source={{ uri: 'https://i.pravatar.cc/150?u=driver' }} />
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.driverName}>Dhammika Bandara</Text>
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD600" />
                  <Text style={styles.ratingText}>4.9 (2.4k trips)</Text>
                </View>
                <Text style={styles.plate}>WP BCD-1234 • White Tuk</Text>
              </View>
              <IconButton icon="phone" mode="contained" containerColor="#E0F2F1" iconColor="#00695C" />
            </View>
            <Divider style={{ marginVertical: 15 }} />
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusVal}>3 mins</Text>
                <Text style={styles.statusLab}>Away</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusVal}>LKR 310</Text>
                <Text style={styles.statusLab}>Estimate</Text>
              </View>
            </View>
            <Button mode="outlined" style={styles.cancelBtn} textColor="#FF5252">Cancel Trip</Button>
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, minHeight: 350 },
  dragBar: { width: 40, height: 4, backgroundColor: '#EEE', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  content: { gap: 15 },
  sheetTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#333' },
  destBox: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F5F7F9', borderRadius: 15, gap: 10 },
  destText: { color: '#666', fontFamily: 'Outfit-Regular' },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#333', marginTop: 10 },
  vehicleScroll: { gap: 12, paddingVertical: 10 },
  vehicleBtn: { width: 100, padding: 15, borderRadius: 20, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  selectedVehicle: { backgroundColor: '#00695C', borderColor: '#004D40' },
  vName: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#00695C', marginTop: 8 },
  vPrice: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666' },
  ecoTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  ecoTagText: { fontSize: 8, fontFamily: 'Outfit-Bold' },
  bookBtn: { marginTop: 10, borderRadius: 15, height: 55, justifyContent: 'center' },
  loadingArea: { height: 300, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingText: { fontFamily: 'Outfit-Medium', color: '#00695C' },
  confirmedArea: { paddingVertical: 10 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverName: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#666' },
  plate: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#999', marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statusItem: { alignItems: 'center' },
  statusVal: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#00695C' },
  statusLab: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  cancelBtn: { borderRadius: 15, borderColor: '#FF5252' },
});
