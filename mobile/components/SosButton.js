import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// The one emergency button used across the tourist app: same colour, label and place everywhere
export const SOS_RED = '#C62828';

export default function SosButton({ onPress, style }) {
  return (
    <TouchableOpacity style={[styles.fab, style]} activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel="Emergency SOS">
      <MaterialCommunityIcons name="alarm-light-outline" size={18} color="#FFF" />
      <Text style={styles.text}>SOS</Text>
    </TouchableOpacity>
  );
}

export const sosPill = {
  flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SOS_RED, height: 48, paddingHorizontal: 18, borderRadius: 24,
  elevation: 6, shadowColor: SOS_RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
};

const styles = StyleSheet.create({
  fab: { position: 'absolute', bottom: 24, right: 20, ...sosPill },
  text: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 15, letterSpacing: 1 },
});
