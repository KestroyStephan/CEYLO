import React, { useEffect, useMemo, useRef, useState } from 'react';
import i18n from '../i18n';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import MapView, { Marker, Polyline, LocalTile } from '../components/Map';
import { cacheRoute, getCachedRoute, routeBounds, compass } from '../services/RouteCache';
import { loadRegions, getRegionTilePathTemplate, downloadCorridor } from '../utils/offlineMapUtils';
import { logEvent } from '../services/Analytics';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { toast } from '../components/Toast';

const ACCENT = '#00695C';
const ARRIVE_M = 60;      // within this distance a stop counts as reached
const STEP_DONE_M = 30;   // a turn is done once we pass this close to it
const OFF_ROUTE_M = 150;  // further than this from the route line shows the off-route warning

// Distances in metres on a local flat projection; accurate enough at city scale
function metres(a, b) {
  const R = 6371000;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function bearing(a, b) {
  const f1 = a.latitude * Math.PI / 180, f2 = b.latitude * Math.PI / 180;
  const dl = (b.longitude - a.longitude) * Math.PI / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function distanceToLine(p, line) {
  if (line.length < 2) return line.length ? metres(p, line[0]) : Infinity;
  const k = Math.cos(p.latitude * Math.PI / 180) * 111320;
  const toXY = (q) => ({ x: (q.longitude - p.longitude) * k, y: (q.latitude - p.latitude) * 110540 });
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = toXY(line[i - 1]), b = toXY(line[i]);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len)) : 0;
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < best) best = d;
  }
  return best;
}
const showDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);

/** FR-021: guidance along a saved itinerary that keeps working without signal. */
export default function RouteGuideScreen({ route: navRoute, navigation }) {
  useStatusBarStyle('dark-content');
  const insets = useSafeAreaInsets();
  const { itineraryId, plan = [], title } = navRoute.params || {};
  const mapRef = useRef(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(null);
  const [stopIndex, setStopIndex] = useState(0);   // 0 = getting to the first stop from wherever the traveller is
  const [stepIndex, setStepIndex] = useState(0);
  const [online, setOnline] = useState(true);
  const [regions, setRegions] = useState([]);
  const [follow, setFollow] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await getCachedRoute(itineraryId);
      if (cached && alive) setRoute(cached);
      const fresh = await cacheRoute(itineraryId, plan);
      if (alive && fresh) setRoute(fresh);
      if (alive) setLoading(false);
    })();
    loadRegions().then(setRegions).catch(() => {});
    logEvent('route_guide_opened', { itineraryId });
    const unsubNet = NetInfo.addEventListener(s => setOnline(Boolean(s.isConnected && s.isInternetReachable !== false)));
    return () => { alive = false; unsubNet(); };
  }, [itineraryId]);

  // Live GPS (works offline: positioning does not need data)
  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.info('Location needed', 'Allow location access to follow the route.');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
        (loc) => setPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading }),
      );
    })();
    return () => sub?.remove();
  }, []);

  const stops = route?.stops || [];
  const nextStop = stops[stopIndex];
  const legSteps = useMemo(() => (route?.steps || []).filter(s => s.leg === stopIndex - 1), [route, stopIndex]);
  const step = legSteps[Math.min(stepIndex, legSteps.length - 1)];

  // Advance turns and stops as the traveller moves
  useEffect(() => {
    if (!pos || !route) return;
    if (step && !step.arrive && metres(pos, step) < STEP_DONE_M) setStepIndex(i => Math.min(i + 1, legSteps.length - 1));
    if (nextStop && metres(pos, nextStop) < ARRIVE_M) {
      logEvent('route_stop_reached', { itineraryId, stop: nextStop.name, offline: !online });
      if (stopIndex < stops.length - 1) {
        Alert.alert(stopIndex === 0 ? 'At the start' : 'Arrived', `You have reached ${nextStop.name}. Next: ${stops[stopIndex + 1].name}.`);
        setStopIndex(i => i + 1);
        setStepIndex(0);
      } else {
        toast.success('Trip complete', `You have reached ${nextStop.name}, the last stop. Check in there to stamp your Eco Passport.`);
        setStopIndex(stops.length);
      }
    }
    if (follow) mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 500);
  }, [pos]);

  // Before the first stop the traveller is not on the trip route yet, so there is nothing to be off
  const onTripLegs = stopIndex > 0;
  const offRoute = onTripLegs && pos && route && !route.straight ? distanceToLine(pos, route.line) > OFF_ROUTE_M : false;
  const turnByTurn = onTripLegs && !route?.straight && step;
  const toStop = pos && nextStop ? metres(pos, nextStop) : null;
  const toStep = pos && step && onTripLegs ? metres(pos, step) : null;
  const done = stopIndex >= stops.length;

  const recenter = () => {
    setFollow(true);
    if (pos) mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 400);
  };

  const skipStop = (dir) => {
    setStepIndex(0);
    setStopIndex(i => Math.max(0, Math.min(stops.length - 1, i + dir)));
  };

  const downloadMap = async () => {
    if (!route) return;
    setDownloading(0);
    try {
      await downloadCorridor(`Route: ${title || 'itinerary'}`, route.line, routeBounds(route), (d, total) => setDownloading(Math.round((100 * d) / total)), { itineraryId });
      setRegions(await loadRegions());
      toast.success('Map saved', 'The map along this route is on your phone and will show without signal.');
    } catch (e) {
      Alert.alert('Map not saved', e.message);
    } finally {
      setDownloading(null);
    }
  };

  const openGoogleMaps = () => {
    if (!nextStop) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${nextStop.latitude},${nextStop.longitude}`).catch(() => {});
  };

  const routeMapSaved = regions.some(r => r.itineraryId === itineraryId);

  if (loading && !route) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={ACCENT} />
        <Text style={styles.loadingText}>{i18n.t('ui_preparing_your_route')}</Text>
      </View>
    );
  }
  if (!route) {
    return (
      <View style={[styles.container, styles.center, { padding: 32 }]}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={48} color="#90A4AE" />
        <Text style={styles.loadingText}>{i18n.t('ui_this_itinerary_needs_at_least_two_stops')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: stops[0].latitude, longitude: stops[0].longitude, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
        showsUserLocation
        showsMyLocationButton={false}
        mapType={!online && regions.length > 0 ? 'none' : 'standard'}
        onPanDrag={() => setFollow(false)}
      >
        {!online && regions.map(r => (
          <LocalTile key={r.id} pathTemplate={getRegionTilePathTemplate(r.id)} tileSize={256} zIndex={-1} />
        ))}
        <Polyline coordinates={route.line} strokeColor={ACCENT} strokeWidth={5} lineDashPattern={route.straight ? [8, 8] : undefined} />
        {stops.map((s, i) => (
          <Marker key={`${s.name}-${i}`} coordinate={s} title={s.name} pinColor={i === stopIndex ? '#FF7043' : i < stopIndex ? '#9E9E9E' : ACCENT} />
        ))}
      </MapView>

      {/* Instruction card */}
      <View style={[styles.topCard, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Close route guide">
          <MaterialCommunityIcons name="close" size={22} color="#1B2B28" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {done ? (
            <Text style={styles.instruction}>{i18n.t('ui_all_stops_reached')}</Text>
          ) : (
            <>
              <Text style={styles.instruction} numberOfLines={2}>
                {turnByTurn ? step.text : `Head ${pos && nextStop ? compass(bearing(pos, nextStop)) : ''} to ${nextStop?.name}`}
              </Text>
              {turnByTurn && toStep != null && <Text style={styles.instructionSub}>in {showDistance(toStep)}</Text>}
            </>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: online ? '#E0F2F1' : '#FFF3E0' }]}>
          <MaterialCommunityIcons name={online ? 'wifi' : 'wifi-off'} size={14} color={online ? ACCENT : '#E65100'} />
          <Text style={[styles.badgeText, { color: online ? ACCENT : '#E65100' }]}>{online ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {offRoute && (
        <View style={[styles.offRoute, { top: insets.top + 96 }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FFF" />
          <Text style={styles.offRouteText}>You are off the route. Head {compass(bearing(pos, nextStop || pos))} towards {nextStop?.name}.</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.recenter, { bottom: insets.bottom + 210 }]} onPress={recenter} accessibilityLabel="Re-centre on my location">
        <MaterialCommunityIcons name={follow ? 'crosshairs-gps' : 'crosshairs'} size={24} color={ACCENT} />
      </TouchableOpacity>

      {/* Next stop panel */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Text style={styles.progress}>{done ? 'Trip complete' : stopIndex === 0 ? 'Getting to the first stop' : `Stop ${stopIndex} of ${stops.length - 1}`}{route.straight ? ' · straight-line guide' : ''}</Text>
        {!done && (
          <View style={styles.nextRow}>
            <TouchableOpacity onPress={() => skipStop(-1)} style={styles.iconBtn} accessibilityLabel="Previous stop" disabled={stopIndex <= 0}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={stopIndex <= 0 ? '#CFD8DC' : '#1B2B28'} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextName} numberOfLines={1}>{nextStop?.name}</Text>
              <Text style={styles.nextMeta}>
                {toStop != null ? `${showDistance(toStop)} · ${compass(bearing(pos, nextStop))}` : 'Waiting for GPS…'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => skipStop(1)} style={styles.iconBtn} accessibilityLabel="Next stop" disabled={stopIndex >= stops.length - 1}>
              <MaterialCommunityIcons name="chevron-right" size={26} color={stopIndex >= stops.length - 1 ? '#CFD8DC' : '#1B2B28'} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={downloadMap} disabled={downloading !== null || routeMapSaved || !online}>
            <MaterialCommunityIcons name={routeMapSaved ? 'check-circle-outline' : 'download-outline'} size={18} color={ACCENT} />
            <Text style={styles.actionText}>
              {downloading !== null ? `Saving map ${downloading}%` : routeMapSaved ? 'Map saved offline' : online ? 'Save map offline' : 'Map needs signal'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={openGoogleMaps} disabled={!online || done}>
            <MaterialCommunityIcons name="google-maps" size={18} color={online ? ACCENT : '#B0BEC5'} />
            <Text style={[styles.actionText, !online && { color: '#B0BEC5' }]}>Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F1' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Outfit-Medium', color: '#4A5A56', textAlign: 'center' },
  topCard: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 18, padding: 12, elevation: 6 },
  iconBtn: { padding: 6 },
  instruction: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  instructionSub: { fontSize: 13, fontFamily: 'Outfit-Medium', color: ACCENT, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  offRoute: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D84315', borderRadius: 14, padding: 12 },
  offRouteText: { flex: 1, color: '#FFF', fontFamily: 'Outfit-Medium', fontSize: 13 },
  recenter: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14, elevation: 10 },
  progress: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#5F6F6B', textAlign: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  nextName: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1B2B28', textAlign: 'center' },
  nextMeta: { fontSize: 13, fontFamily: 'Outfit-Medium', color: ACCENT, textAlign: 'center', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: '#E0F2F1' },
  actionText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#004D40' },
});
