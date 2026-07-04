import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar,
  Dimensions, Animated, ScrollView, Alert
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Subtle diamond pattern background
function DiamondPattern() {
  const DIAMOND_SIZE = 44;
  const cols = Math.ceil(width / (DIAMOND_SIZE * 1.4)) + 2;
  const rows = Math.ceil(height / (DIAMOND_SIZE * 1.4)) + 2;
  const diamonds = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = r % 2 === 0 ? 0 : DIAMOND_SIZE * 0.7;
      diamonds.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            width: DIAMOND_SIZE,
            height: DIAMOND_SIZE,
            left: c * DIAMOND_SIZE * 1.4 + offsetX - DIAMOND_SIZE,
            top: r * DIAMOND_SIZE * 0.95 - DIAMOND_SIZE,
            transform: [{ rotate: '45deg' }],
            borderWidth: 1.5,
            borderColor: 'rgba(0,106,59,0.08)',
            borderRadius: 4,
          }}
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFillObject} pointerEvents="none">{diamonds}</View>;
}

const ROLES = [
  {
    key: 'tourist',
    icon: 'compass-outline',
    iconColor: '#006A3B',
    iconBg: '#E8F5E9',
    title: 'Tourist',
    description: 'Discover hidden gems, eco-resorts, and cultural heritage sites.',
  },
  {
    key: 'driver',
    icon: 'bus-side',
    iconColor: '#0277BD',
    iconBg: '#E3F2FD',
    title: 'Driver',
    description: 'Provide sustainable transport and local navigation for explorers.',
  },
  {
    key: 'guide',
    icon: 'account-group-outline',
    iconColor: '#5D4037',
    iconBg: '#FFF3E0',
    title: 'Guide',
    description: 'Share cultural stories and protect the beauty of our island.',
  },
];

export default function RolePickerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState('tourist');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (selectedRole === 'driver') {
      navigation.navigate('Register', { presetRole: 'driver' });
    } else if (selectedRole === 'guide') {
      navigation.navigate('Register', { presetRole: 'guide' });
    } else {
      navigation.navigate('Register', { presetRole: 'tourist' });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDF5ED" />
      <DiamondPattern />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.menuBtn}
        >
          <MaterialCommunityIcons name="menu" size={22} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.brandName}>Ceylo</Text>
        <View style={styles.avatarPlaceholder}>
          <MaterialCommunityIcons name="account" size={20} color="#FFF" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Text */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.heroTitle}>Choose Your Journey</Text>
          <Text style={styles.heroSub}>
            Experience the teardrop of the Indian{'\n'}Ocean exactly the way you want to.
          </Text>
        </Animated.View>

        {/* Role Cards */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 14, marginTop: 8 }}>
          {ROLES.map((role, i) => {
            const isActive = selectedRole === role.key;
            const cardScale = useRef(new Animated.Value(1)).current;

            const handlePress = () => {
              Animated.sequence([
                Animated.timing(cardScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
                Animated.spring(cardScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
              ]).start();
              setSelectedRole(role.key);
            };

            return (
              <Animated.View key={role.key} style={{ transform: [{ scale: cardScale }] }}>
                <TouchableOpacity
                  onPress={handlePress}
                  style={[styles.roleCard, isActive && styles.roleCardActive]}
                  activeOpacity={0.88}
                >
                  {/* Icon */}
                  <View style={[styles.iconCircle, { backgroundColor: role.iconBg }]}>
                    <MaterialCommunityIcons name={role.icon} size={26} color={role.iconColor} />
                  </View>

                  {/* Text */}
                  <View style={styles.roleText}>
                    <Text style={[styles.roleTitle, isActive && styles.roleTitleActive]}>
                      {role.title}
                    </Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </View>

                  {/* Selection indicator */}
                  {isActive && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#006A3B" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Progress dot */}
        <View style={styles.progressRow}>
          <View style={styles.progressDot} />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.87}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>

        {/* Footer policy */}
        <Text style={styles.policyText}>BY CONTINUING, YOU AGREE TO OUR ECO-POLICY</Text>
      </ScrollView>

      {/* Floating action dot (decorative orange) */}
      <View style={[styles.fab, { bottom: insets.bottom + 100 }]}>
        <View style={styles.fabInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF5ED' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuBtn: { padding: 4 },
  brandName: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4A5568',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },

  body: {
    paddingHorizontal: 22,
    paddingTop: 12,
    flexGrow: 1,
  },

  heroTitle: {
    fontSize: 30, fontFamily: 'Outfit-Bold',
    color: '#1A2E1A', marginBottom: 8,
  },
  heroSub: {
    fontSize: 14, fontFamily: 'Outfit-Regular',
    color: '#6B7B6B', lineHeight: 22, marginBottom: 28,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    // Shadow
    elevation: 2,
    shadowColor: '#1A2E1A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    gap: 14,
  },
  roleCardActive: {
    borderColor: '#006A3B',
    backgroundColor: '#FAFCFA',
    elevation: 4,
  },

  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },

  roleText: { flex: 1 },
  roleTitle: {
    fontSize: 16, fontFamily: 'Outfit-SemiBold',
    color: '#1A2E1A', marginBottom: 4,
  },
  roleTitleActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },
  roleDesc: {
    fontSize: 13, fontFamily: 'Outfit-Regular',
    color: '#6B7B6B', lineHeight: 18,
  },

  progressRow: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },
  progressDot: {
    width: 38, height: 4,
    backgroundColor: '#006A3B',
    borderRadius: 2,
  },

  continueBtn: {
    backgroundColor: '#8A9E8A',
    borderRadius: 50,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  continueBtnText: {
    fontSize: 17, fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  policyText: {
    textAlign: 'center',
    fontSize: 10, fontFamily: 'Outfit-Medium',
    color: '#8A9E8A', letterSpacing: 0.8,
  },

  // Decorative orange FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: '#FF7043',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#FF7043', shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  fabInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
