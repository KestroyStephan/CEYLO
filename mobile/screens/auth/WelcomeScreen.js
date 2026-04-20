import React from 'react';
import { View, StyleSheet, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Background Image - Placeholder for Sri Lanka Eco Scene */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1000&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>CEYLO</Text>
              <Text style={styles.tagline}>{t('welcome')}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {t('login')}
              </Button>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Register')}
                style={[styles.button, styles.outlinedButton]}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: '#FFF' }]}
              >
                {t('register')}
              </Button>

              <TouchableOpacity
                onPress={() => navigation.navigate('Main')}
                style={styles.guestButton}
              >
                <Text style={styles.guestText}>{t('continue_guest')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 30,
    paddingBottom: 60,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    borderRadius: 15,
    backgroundColor: '#00695C',
  },
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  buttonContent: {
    height: 55,
  },
  buttonLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 1,
  },
  guestButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  guestText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
