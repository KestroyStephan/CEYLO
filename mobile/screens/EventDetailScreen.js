import React, { useEffect, useState } from 'react';
import { imgSource } from '../utils/images';
import { View, Text, StyleSheet, Image, ScrollView, Alert, Linking } from 'react-native';
import { Surface, IconButton, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { distanceKm } from '../services/ItineraryService';
import { logEvent } from '../services/Analytics';

export default function EventDetailScreen({ route, navigation }) {
  // If navigated from push notification or map, it passes 'event' param
  const { event = {} } = route.params || {};
  const displayEvent = event || {};
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (event.title) logEvent('event_viewed', { title: event.title, location: event.location || null });
  }, [event.title]);

  useEffect(() => {
    if (!displayEvent.coords) return;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getLastKnownPositionAsync({});
      if (loc) setDistance(distanceKm(loc.coords.latitude, loc.coords.longitude, displayEvent.coords.latitude, displayEvent.coords.longitude));
    })().catch(() => {});
  }, []);

  if (!displayEvent.title) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>No event data provided.</Text>
      </View>
    );
  }

  const eventDate = displayEvent.date ? new Date(displayEvent.date) : null;
  const dateLabel = eventDate
    ? (displayEvent.dateApprox
        ? eventDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
        : eventDate.toDateString())
    : 'Date TBC';
  const isNearby = distance != null && distance <= (displayEvent.radiusKm || 25);

  const remindMe = async () => {
    if (!eventDate) {
      Alert.alert('No date yet', 'This event does not have a confirmed date.');
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Notifications Off', 'Allow notifications to get event reminders.');
      return;
    }
    // Remind at 9 AM the day before (or the first of the month for approximate dates)
    const remindAt = displayEvent.dateApprox
      ? new Date(eventDate.getFullYear(), eventDate.getMonth(), 1, 9)
      : new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() - 1, 9);
    if (remindAt.getTime() <= Date.now()) {
      Alert.alert('Happening Soon', `${displayEvent.title} is coming up very soon!`);
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: `${displayEvent.title} 🎊`, body: `Coming up in ${displayEvent.location}.`, data: { type: 'event_reminder' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindAt },
    });
    Alert.alert('Reminder Set', `We'll remind you on ${remindAt.toDateString()}.`);
  };

  const openDirections = () => {
    const dest = displayEvent.coords
      ? `${displayEvent.coords.latitude},${displayEvent.coords.longitude}`
      : encodeURIComponent(`${displayEvent.location}, Sri Lanka`);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.imageContainer}>
        <Image source={imgSource(displayEvent.imageUrl)} style={styles.image} />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        <IconButton accessibilityLabel="Go back"
          icon="arrow-left"
          iconColor="#FFF"
          size={28}
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.imageOverlay}>
          <Chip icon="calendar" style={styles.dateChip} textStyle={styles.dateChipText}>
            {dateLabel}
          </Chip>
          <Text style={styles.title}>{displayEvent.title}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#00695C" />
            <Text style={styles.metaText}>
              {displayEvent.location}{distance != null ? ` • ${distance.toFixed(1)} km` : ''}
            </Text>
          </View>
          {displayEvent.ecoScore != null && (
            <Surface style={styles.ecoBadge} elevation={2}>
              <Text style={styles.ecoScore}>{displayEvent.ecoScore}</Text>
              <Text style={styles.ecoLabel}>ECO SCORE</Text>
            </Surface>
          )}
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{displayEvent.description}</Text>

        {isNearby && (
          <Surface style={styles.alertBox} elevation={1}>
            <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#D84315" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alertTitle}>You are nearby!</Text>
              <Text style={styles.alertText}>
                This event is {distance.toFixed(1)} km from your location.
              </Text>
            </View>
          </Surface>
        )}

        <Button
          mode="contained"
          onPress={remindMe}
          style={styles.arBtn}
          buttonColor="#00695C"
          icon="bell-plus-outline"
        >
          Remind Me
        </Button>
        <Button
          mode="outlined"
          onPress={openDirections}
          style={[styles.arBtn, { marginTop: 0 }]}
          textColor="#00695C"
          icon="directions"
        >
          Get Directions
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: '100%', height: 350 },
  image: { width: '100%', height: '100%' },
  gradient: { ...StyleSheet.absoluteFillObject },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  imageOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  dateChip: { alignSelf: 'flex-start', backgroundColor: '#00695C', marginBottom: 10 },
  dateChipText: { color: '#FFF', fontWeight: 'bold' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', textShadow: '1px 1px 3px rgba(0,0,0,0.5)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  content: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  metaText: { fontSize: 16, color: '#333', marginLeft: 8, fontWeight: '500' },
  ecoBadge: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 15, alignItems: 'center' },
  ecoScore: { fontSize: 20, fontWeight: 'bold', color: '#6B7280' },
  ecoLabel: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  description: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20 },
  alertBox: { flexDirection: 'row', backgroundColor: '#FBE9E7', padding: 15, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#D84315' },
  alertText: { fontSize: 14, color: '#BF360C', marginTop: 5 },
  arBtn: { paddingVertical: 8, borderRadius: 15, marginTop: 10, marginBottom: 16 },
});
