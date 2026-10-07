import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

// A person's photo, or their initials when they have not added one (never a stock face)
export default function PersonAvatar({ uri, name, size = 40, style }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[dim, style]} />;
  const initials = String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <View style={[dim, styles.fallback, style]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#D7E8DF', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#004D40', fontFamily: 'Outfit-Bold' },
});
