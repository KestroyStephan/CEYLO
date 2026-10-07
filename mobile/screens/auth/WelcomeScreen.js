import React, { useEffect, useRef } from 'react';
import i18n from '../../i18n';
import {
  View, StyleSheet, ImageBackground, TouchableOpacity,
  Animated, StatusBar
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const FEATURE_BADGES = [
  { icon: 'leaf', labelKey: 'welcome_feat_guides' },
  { icon: 'map-marker-path', labelKey: 'welcome_feat_routes' },
  { icon: 'star-circle', labelKey: 'welcome_feat_heritage' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Beauty_of_Sigiriya_by_Binuka.jpg/960px-Beauty_of_Sigiriya_by_Binuka.jpg' }}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.08)', 'rgba(0,40,20,0.6)', 'rgba(0,30,15,0.92)']}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Top logo */}
          <View style={styles.topBrand}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="leaf" size={24} color="#006A3B" />
            </View>
          </View>

          {/* Feature badges */}
          <View style={styles.badgeRow}>
            {FEATURE_BADGES.map((b, i) => (
              <View key={i} style={styles.badge}>
                <MaterialCommunityIcons name={b.icon} size={18} color="#A8DFC0" />
                <Text style={styles.badgeText}>{i18n.t(b.labelKey)}</Text>
              </View>
            ))}
          </View>

          {/* Main hero text */}
          <View style={styles.heroSection}>
            <Text style={styles.eyebrowText}>{i18n.t('ui_sri_lanka_s_premier')}</Text>
            <Text style={styles.heroTitle}>Ceylo</Text>
            <Text style={styles.heroTagline}>{i18n.t('ui_eco_luxury_discovery_')}</Text>
            <Text style={styles.heroBody}>
              {i18n.t('welcome_body')}
            </Text>
          </View>

          {/* CTA Buttons */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.87}
            >
              <Text style={styles.loginBtnText}>{i18n.t('ui_login')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('RolePicker')}
              activeOpacity={0.87}
            >
              <Text style={styles.registerBtnText}>{i18n.t('ui_create_account')}</Text>
            </TouchableOpacity>

          </View>


        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },

  topBrand: { alignItems: 'flex-start' },
  logoCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },

  badgeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  badge: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingVertical: 10,
  },
  badgeText: {
    fontSize: 10, fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 14,
  },

  heroSection: { alignItems: 'flex-start' },
  eyebrowText: {
    fontSize: 11, fontFamily: 'Outfit-Medium',
    color: '#A8DFC0', letterSpacing: 2.5, marginBottom: 8,
  },
  heroTitle: {
    fontSize: 60, fontFamily: 'Outfit-Bold',
    color: '#FFF', letterSpacing: -1, lineHeight: 64,
  },
  heroTagline: {
    fontSize: 18, fontFamily: 'Outfit-Medium',
    color: 'rgba(255,255,255,0.85)', marginBottom: 14,
  },
  heroBody: {
    fontSize: 14, fontFamily: 'Outfit-Regular',
    color: 'rgba(255,255,255,0.7)', lineHeight: 22,
  },

  btnGroup: { gap: 12 },
  loginBtn: {
    backgroundColor: '#006A3B',
    borderRadius: 18, height: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  loginBtnText: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#FFF' },
  registerBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 18, height: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  registerBtnText: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#FFF' },


});
