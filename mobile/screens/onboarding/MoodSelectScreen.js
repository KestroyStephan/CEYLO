import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, Button, IconButton } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MOODS = [
  { id: 'adventurer', title: 'Adventurer', icon: 'hiking', color: '#FF7043', desc: 'Peaks, Parks & Action' },
  { id: 'culture', title: 'Culture Seeker', icon: 'castle', color: '#5C6BC0', desc: 'Ancient Souls & History' },
  { id: 'eco', title: 'Eco Explorer', icon: 'leaf', color: '#66BB6A', desc: 'Nature, Tea & Wildlife' },
  { id: 'family', title: 'Family Trip', icon: 'account-group', color: '#26C6DA', desc: 'Comfort & Fun for All' },
  { id: 'spiritual', title: 'Spiritual', icon: 'om', color: '#AB47BC', desc: 'Peace, Temples & Zen' },
];

export default function MoodSelectScreen({ navigation }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedMood) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          mood: selectedMood,
          onboardingCompleted: true,
        });
      }
      // App.js will react to document changes if we set up a listener or user will be navigated on next load
      // For now, we can just navigate to Main since it's the next step
      navigation.replace('Main');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C']} style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Vibe</Text>
        <Text style={styles.headerSubtitle}>We'll personalize your Ceylo experience</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.id}
              activeOpacity={0.8}
              onPress={() => setSelectedMood(mood.id)}
            >
              <Surface
                style={[
                  styles.card,
                  selectedMood === mood.id && { borderColor: mood.color, borderWidth: 3 }
                ]}
                elevation={selectedMood === mood.id ? 8 : 2}
              >
                <View style={[styles.iconCircle, { backgroundColor: mood.color + '20' }]}>
                  <MaterialCommunityIcons name={mood.icon} size={32} color={mood.color} />
                </View>
                <Text style={styles.moodTitle}>{mood.title}</Text>
                <Text style={styles.moodDesc}>{mood.desc}</Text>
                {selectedMood === mood.id && (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                  </View>
                )}
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Surface style={styles.footer} elevation={4}>
        <Button
          mode="contained"
          disabled={!selectedMood || loading}
          loading={loading}
          onPress={handleConfirm}
          style={styles.confirmButton}
          contentStyle={{ height: 55 }}
          labelStyle={{ fontFamily: 'Outfit-Bold', fontSize: 18 }}
        >
          Begin Journey
        </Button>
        <TouchableOpacity onPress={() => navigation.replace('Main')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 40,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  grid: {
    gap: 15,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  moodTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#333',
  },
  moodDesc: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#00695C',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 24,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
  },
  confirmButton: {
    width: '100%',
    borderRadius: 15,
    backgroundColor: '#00695C',
    marginBottom: 15,
  },
  skipText: {
    color: '#666',
    fontFamily: 'Outfit-Medium',
    textDecorationLine: 'underline',
  },
});
