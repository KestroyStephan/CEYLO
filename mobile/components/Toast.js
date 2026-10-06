import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, PanResponder, AccessibilityInfo } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * App-wide toast messages. Mount <ToastHost /> once (App.js), then from anywhere:
 *   toast.success('Order sent', 'The vendor will confirm it shortly.');
 *   toast.error('Login failed', 'Check your email and password.');
 * Confirmations that need a choice still use Alert.alert.
 */
const listeners = new Set();
let nextId = 1;

function show(type, title, message, { duration } = {}) {
  const item = { id: nextId++, type, title: String(title || ''), message: message ? String(message) : '', duration: duration ?? (type === 'error' ? 5000 : 3500) };
  listeners.forEach(fn => fn(item));
  AccessibilityInfo.announceForAccessibility?.(`${item.title}. ${item.message}`);
  return item.id;
}

export const toast = {
  success: (title, message, opts) => show('success', title, message, opts),
  error: (title, message, opts) => show('error', title, message, opts),
  info: (title, message, opts) => show('info', title, message, opts),
  warning: (title, message, opts) => show('warning', title, message, opts),
};

const THEME = {
  success: { icon: 'check-circle', accent: '#1B8A4B', tint: '#E9F7EF' },
  error: { icon: 'alert-circle', accent: '#C62828', tint: '#FDECEC' },
  warning: { icon: 'alert', accent: '#C77700', tint: '#FFF5E1' },
  info: { icon: 'information', accent: '#1565C0', tint: '#E8F1FC' },
};

function ToastCard({ item, onDone }) {
  const y = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const theme = THEME[item.type] || THEME.info;

  const hide = () => {
    Animated.parallel([
      Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone(item.id));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    Animated.timing(progress, { toValue: 0, duration: item.duration, useNativeDriver: false }).start();
    const t = setTimeout(hide, item.duration);
    return () => clearTimeout(t);
  }, []);

  // Swipe up or sideways to dismiss
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || g.dy < -8,
    onPanResponderMove: (_, g) => dragX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 80 || g.dy < -30) hide();
      else Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[styles.card, { opacity, transform: [{ translateY: y }, { translateX: dragX }] }]}
      accessibilityRole="alert"
    >
      <View style={[styles.stripe, { backgroundColor: theme.accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: theme.tint }]}>
        <MaterialCommunityIcons name={theme.icon} size={22} color={theme.accent} />
      </View>
      <View style={styles.body}>
        {item.title ? <Text style={styles.title} numberOfLines={2}>{item.title}</Text> : null}
        {item.message ? <Text style={styles.message} numberOfLines={4}>{item.message}</Text> : null}
      </View>
      <TouchableOpacity onPress={hide} hitSlop={10} accessibilityLabel="Dismiss">
        <MaterialCommunityIcons name="close" size={18} color="#7A8783" />
      </TouchableOpacity>
      <Animated.View style={[styles.progress, {
        backgroundColor: theme.accent,
        width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const add = (item) => setItems(prev => [...prev.slice(-2), item]); // at most three on screen
    listeners.add(add);
    return () => listeners.delete(add);
  }, []);

  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {items.map(item => (
        <ToastCard key={item.id} item={item} onDone={(id) => setItems(prev => prev.filter(i => i.id !== id))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, zIndex: 9999, elevation: 30, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingVertical: 14, paddingLeft: 16, paddingRight: 14, overflow: 'hidden',
    shadowColor: '#0B2A22', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    borderWidth: 1, borderColor: 'rgba(11,42,34,0.06)',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#15211E' },
  message: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4B5B57', marginTop: 2, lineHeight: 18 },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 3, opacity: 0.35 },
});
