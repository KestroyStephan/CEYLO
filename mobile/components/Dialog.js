import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Themed replacement for the grey system dialog. <DialogHost /> is mounted once in App.js and
 * takes over Alert.alert, so every existing Alert.alert(title, message, buttons) call in the app
 * shows this card instead, with the same buttons and callbacks.
 */
const queue = [];
let push = null;
const systemAlert = Alert.alert.bind(Alert);

const KINDS = {
  success: { icon: 'check-circle', color: '#1B8A4B', tint: '#E6F4EC' },
  error: { icon: 'alert-circle', color: '#C62828', tint: '#FDECEC' },
  warning: { icon: 'alert', color: '#C77700', tint: '#FFF4E0' },
  info: { icon: 'information', color: '#006A3B', tint: '#E8F3EC' },
};

// Picks the icon from the wording, so existing calls need no changes
function kindOf(title = '', message = '') {
  const t = `${title} ${message}`.toLowerCase();
  if (/✅|success|updated|saved|completed|submitted|sent|approved|welcome|done|thank/.test(t) && !/fail|error|could not|couldn't|unable/.test(t)) return 'success';
  if (/❌|error|fail|could not|couldn't|unable|denied|invalid|suspended|not allowed/.test(t)) return 'error';
  if (/⚠|warning|delete|remove|cancel|sure|confirm|log ?out|sign ?out/.test(t)) return 'warning';
  return 'info';
}

const stripEmoji = (s) => String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}\u{FE0F}]/gu, '').trim();

export function showDialog(title, message, buttons, options) {
  const item = { title: stripEmoji(title), message: message ? String(message) : '', buttons: buttons?.length ? buttons : [{ text: 'OK' }], options: options || {} };
  if (!push) return systemAlert(title, message, buttons, options);
  push(item);
}

function DialogCard({ item, onClose }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const kind = KINDS[kindOf(item.title, item.message)];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = (btn) => { onClose(); setTimeout(() => btn?.onPress?.(), 10); };
  const cancelBtn = item.buttons.find(b => b.style === 'cancel');
  const dismiss = () => { if (item.options.cancelable === false) return; press(cancelBtn); };
  const stacked = item.buttons.length > 2;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]} accessibilityRole="alert">
          <View style={[styles.iconWrap, { backgroundColor: kind.tint }]}>
            <MaterialCommunityIcons name={kind.icon} size={30} color={kind.color} />
          </View>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
          {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {item.buttons.map((b, i) => {
              const primary = b.style !== 'cancel' && (i === item.buttons.length - 1 || b.style === 'destructive');
              const destructive = b.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  onPress={() => press(b)}
                  style={({ pressed }) => [
                    styles.btn, !stacked && { flex: 1 },
                    primary ? { backgroundColor: destructive ? '#C62828' : '#006A3B' } : styles.btnGhost,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, primary ? { color: '#FFF' } : { color: destructive ? '#C62828' : '#1F3A32' }]}>{b.text || 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function DialogHost() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    push = (item) => setCurrent(prev => { if (prev) { queue.push(item); return prev; } return item; });
    Alert.alert = showDialog;
    return () => { push = null; Alert.alert = systemAlert; };
  }, []);

  if (!current) return null;
  return <DialogCard key={current.title + current.message} item={current} onClose={() => setCurrent(queue.shift() || null)} />;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,28,22,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 26, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 18,
    alignItems: 'center', shadowColor: '#0B2A22', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 18,
  },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontFamily: 'Outfit-Bold', color: '#15211E', textAlign: 'center' },
  message: { fontSize: 14.5, fontFamily: 'Outfit-Regular', color: '#4B5B57', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  actionsStacked: { flexDirection: 'column-reverse' },
  btn: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnGhost: { backgroundColor: '#EEF4F0' },
  btnText: { fontSize: 15, fontFamily: 'Outfit-SemiBold' },
});
