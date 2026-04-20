import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', label: 'English' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰', label: 'Sinhala' },
  { code: 'ta', name: 'தமிழ்', flag: '🇱🇰', label: 'Tamil' },
];

export default function LanguageSelectScreen({ navigation }) {
  const { i18n, t } = useTranslation();

  const handleLanguageSelect = async (code) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('onboarding-completed', 'true');
    navigation.navigate('Welcome');
  };

  return (
    <LinearGradient colors={['#004D40', '#00695C']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CEYLO</Text>
        <Text style={styles.subtitle}>Select Your Language</Text>
      </View>

      <View style={styles.grid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => handleLanguageSelect(lang.code)}
            activeOpacity={0.8}
            style={styles.cardWrapper}
          >
            <Surface style={styles.card} elevation={4}>
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={styles.langName}>{lang.name}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
            </Surface>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.footer}>Explore the Pearl of the Indian Ocean</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },
  grid: {
    width: '100%',
    gap: 20,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 32,
    marginRight: 20,
  },
  langName: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#00695C',
    flex: 1,
  },
  langLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Outfit-Regular',
  }
});
