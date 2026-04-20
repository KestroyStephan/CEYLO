import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Surface, IconButton, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EventDetailScreen({ route, navigation }) {
  // If navigated from push notification or map, it passes 'event' param
  const { event = {} } = route.params || {};

  const dummyEvent = {
    title: 'Kandy Esala Perahera',
    date: 'Aug 10 - Aug 20',
    location: 'Temple of the Tooth, Kandy',
    description: 'A grand festival with elegant costumes, fire breathing, and beautifully decorated elephants. This is one of the oldest and grandest of all Buddhist festivals in Sri Lanka.',
    type: 'Cultural',
    ecoScore: 90,
    imageUrl: 'https://images.unsplash.com/photo-1549474148-356c12fb7e93?auto=format&fit=crop&w=800&q=80',
    ...event
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: dummyEvent.imageUrl }} style={styles.image} />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        <IconButton
          icon="arrow-left"
          iconColor="#FFF"
          size={28}
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.imageOverlay}>
          <Chip icon="calendar" style={styles.dateChip} textStyle={styles.dateChipText}>
            {dummyEvent.date}
          </Chip>
          <Text style={styles.title}>{dummyEvent.title}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#00695C" />
            <Text style={styles.metaText}>{dummyEvent.location}</Text>
          </View>
          <Surface style={styles.ecoBadge} elevation={2}>
            <Text style={styles.ecoScore}>{dummyEvent.ecoScore}</Text>
            <Text style={styles.ecoLabel}>ECO SCORE</Text>
          </Surface>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{dummyEvent.description}</Text>

        <Surface style={styles.alertBox} elevation={1}>
          <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#D84315" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.alertTitle}>You are nearby!</Text>
            <Text style={styles.alertText}>
              Turn on AR Guide to explore the historical significance of this event.
            </Text>
          </View>
        </Surface>

        <Button
          mode="contained"
          onPress={() => {}}
          style={styles.arBtn}
          buttonColor="#00695C"
          icon="augmented-reality"
        >
          Launch AR Guide
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
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  content: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF', marginTop: -30 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  metaText: { fontSize: 16, color: '#333', marginLeft: 8, fontWeight: '500' },
  ecoBadge: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 15, alignItems: 'center' },
  ecoScore: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  ecoLabel: { fontSize: 10, fontWeight: 'bold', color: '#4CAF50' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  description: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20 },
  alertBox: { flexDirection: 'row', backgroundColor: '#FBE9E7', padding: 15, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#D84315' },
  alertText: { fontSize: 14, color: '#BF360C', marginTop: 5 },
  arBtn: { paddingVertical: 8, borderRadius: 15, marginTop: 10, marginBottom: 40 },
});
