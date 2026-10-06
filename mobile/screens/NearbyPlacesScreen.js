import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/Map';
import { nearbyWorship, openDirections, fmtKm, WORSHIP_KINDS } from '../services/places';

// Religious and cultural places around the traveller (or around a destination they are viewing)
export default function NearbyPlacesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const around = route?.params?.around || null; // { latitude, longitude, name }
  const [origin, setOrigin] = useState(around);
  const [places, setPlaces] = useState([]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('loading'); // loading | ready | error | no-location
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  const load = async (coords) => {
    setStatus('loading');
    try {
      setPlaces(await nearbyWorship(coords, 5000));
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    (async () => {
      if (around) { load(around); return; }
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') { setStatus('no-location'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => Location.getLastKnownPositionAsync());
      if (!pos) { setStatus('no-location'); return; }
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setOrigin(c);
      load(c);
    })();
  }, []);

  const shown = useMemo(() => (filter === 'all' ? places : places.filter(p => p.kind === filter)), [places, filter]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(WORSHIP_KINDS).map(k => [k, places.filter(p => p.kind === k).length])), [places]);

  const focus = (p) => {
    setSelected(p.id);
    mapRef.current?.animateToRegion?.({ latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2E1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nearby places of worship</Text>
          <Text style={styles.sub} numberOfLines={1}>{around?.name ? `Around ${around.name}` : 'Within 5 km of you'}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {[['all', 'All', places.length], ...Object.entries(WORSHIP_KINDS).map(([k, v]) => [k, v.short, counts[k] || 0])].map(([k, label, n]) => (
          <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[styles.chip, filter === k && styles.chipOn]}>
            <Text style={[styles.chipText, filter === k && styles.chipTextOn]}>{label} {status === 'ready' ? n : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {origin && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{ latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation={!around}
        >
          {shown.map(p => (
            <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }} title={p.name}
              description={`${WORSHIP_KINDS[p.kind].label} · ${fmtKm(p.distanceKm)}`} pinColor={WORSHIP_KINDS[p.kind].color} onPress={() => setSelected(p.id)} />
          ))}
        </MapView>
      )}

      {status === 'loading' && <View style={styles.state}><ActivityIndicator color="#00695C" /><Text style={styles.stateText}>Finding places near you…</Text></View>}
      {status === 'no-location' && <View style={styles.state}><MaterialCommunityIcons name="map-marker-off" size={32} color="#8A9E8A" /><Text style={styles.stateText}>Allow location access to see places around you.</Text></View>}
      {status === 'error' && (
        <View style={styles.state}>
          <MaterialCommunityIcons name="wifi-off" size={32} color="#8A9E8A" />
          <Text style={styles.stateText}>Could not load nearby places. {error}</Text>
          {origin && <TouchableOpacity onPress={() => load(origin)} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>}
        </View>
      )}
      {status === 'ready' && (
        <FlatList
          data={shown}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<Text style={styles.stateText}>No places of this kind within 5 km.</Text>}
          renderItem={({ item: p }) => {
            const k = WORSHIP_KINDS[p.kind];
            return (
              <TouchableOpacity onPress={() => focus(p)} style={[styles.row, selected === p.id && styles.rowOn]} activeOpacity={0.8}>
                <View style={[styles.icon, { backgroundColor: `${k.color}18` }]}>
                  <MaterialCommunityIcons name={k.icon} size={22} color={k.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{k.label} · {fmtKm(p.distanceKm)}{p.openNow != null ? ` · ${p.openNow ? 'Open now' : 'Closed now'}` : ''}</Text>
                  {!!p.address && <Text style={styles.addr} numberOfLines={1}>{p.address}</Text>}
                </View>
                <TouchableOpacity onPress={() => openDirections(p, p.distanceKm < 1.5 ? 'walking' : 'driving')} style={styles.go} accessibilityLabel={`Directions to ${p.name}`}>
                  <MaterialCommunityIcons name="directions" size={22} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6FBF5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7A6B' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DCE5DC' },
  chipOn: { backgroundColor: '#00695C', borderColor: '#00695C' },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#2E4832' },
  chipTextOn: { color: '#FFF' },
  map: { height: 220, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  state: { alignItems: 'center', padding: 32, gap: 10 },
  stateText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7A6B', textAlign: 'center' },
  retry: { backgroundColor: '#00695C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  retryText: { color: '#FFF', fontFamily: 'Outfit-Bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E6ECE6' },
  rowOn: { borderColor: '#00695C' },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  meta: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#2E4832', marginTop: 1 },
  addr: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7A6B', marginTop: 1 },
  go: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00695C', alignItems: 'center', justifyContent: 'center' },
});
