import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, Vibration, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// The one emergency button used across the tourist app: same colour, label and place everywhere
export const SOS_RED = '#C62828';

const DOUBLE_TAP_MS = 320;

/**
 * One tap: opens SOS and sends the alert after a 3-second countdown (tap there to cancel).
 * Double tap: sends the alert immediately. A large target in the thumb zone, with a pulse.
 * `onPress` is accepted for older callers but the button handles the emergency itself.
 */
export default function SosButton({ style }) {
  const navigation = useNavigation();
  const lastTap = useRef(0);
  const timer = useRef(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); clearTimeout(timer.current); };
  }, []);

  const trigger = (mode) => {
    Vibration.vibrate(mode === 'now' ? [0, 120, 60, 120] : 80);
    navigation.navigate('SOSScreen', { sosTrigger: mode, at: Date.now() });
  };

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(timer.current);
      lastTap.current = 0;
      trigger('now');
      return;
    }
    lastTap.current = now;
    timer.current = setTimeout(() => trigger('countdown'), DOUBLE_TAP_MS);
  };

  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.ring, {
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
      }]} />
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={() => trigger('now')}
        delayLongPress={600}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS"
        accessibilityHint="Tap once to send an emergency alert after a 3 second countdown. Double tap or press and hold to send it now."
        hitSlop={12}
      >
        <MaterialCommunityIcons name="alarm-light" size={24} color="#FFF" />
        <Text style={styles.text}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

export const sosPill = {
  flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SOS_RED, height: 48, paddingHorizontal: 18, borderRadius: 24,
  elevation: 6, shadowColor: SOS_RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
};

const SIZE = 68;
const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, right: 18, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: SOS_RED },
  fab: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: SOS_RED, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    elevation: 10, shadowColor: SOS_RED, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10,
  },
  text: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 13, letterSpacing: 1, marginTop: -2 },
});
