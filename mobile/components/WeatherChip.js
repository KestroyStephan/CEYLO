import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Small weather badge. Pass either current conditions ({ icon, label, temperatureC })
 * or a forecast day ({ icon, label, maxC, minC, rainProbability }).
 */
export default function WeatherChip({ weather, compact = false, style }) {
  if (!weather) return null;
  const rainy = weather.rainy;
  const temp = weather.temperatureC != null
    ? `${Math.round(weather.temperatureC)}°C`
    : weather.maxC != null ? `${Math.round(weather.maxC)}°/${Math.round(weather.minC)}°` : '';
  const rain = weather.rainProbability != null && weather.rainProbability >= 30 ? ` · ${weather.rainProbability}% rain` : '';
  return (
    <View style={[styles.chip, rainy ? styles.rainy : styles.dry, style]}>
      <MaterialCommunityIcons name={weather.icon || 'weather-cloudy'} size={compact ? 12 : 14} color={rainy ? '#1565C0' : '#B26A00'} />
      <Text style={[styles.text, compact && styles.compactText, { color: rainy ? '#1565C0' : '#8D5300' }]}>
        {compact ? temp : `${weather.label} ${temp}${rain}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  dry: { backgroundColor: '#FFF4E0' },
  rainy: { backgroundColor: '#E3F2FD' },
  text: { fontSize: 12, fontWeight: '600' },
  compactText: { fontSize: 10 },
});
