/**
 * react-native-maps web stub
 * react-native-maps does not support web. This stub prevents bundling errors
 * when Expo builds for the web platform. All map components render null on web.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapPlaceholder = ({ style, children }) => (
  <View style={[styles.placeholder, style]}>
    <Text style={styles.text}>🗺 Map view not available on web</Text>
    {children}
  </View>
);

const noop = () => null;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 200,
  },
  text: {
    fontSize: 14,
    color: '#6B7B6B',
    fontStyle: 'italic',
  },
});

// Export all commonly used components as stubs
export default MapPlaceholder;
export const Marker = noop;
export const Callout = noop;
export const Circle = noop;
export const Polygon = noop;
export const Polyline = noop;
export const Overlay = noop;
export const UrlTile = noop;
export const WMSTile = noop;
export const Heatmap = noop;
export const Geojson = noop;
export const AnimatedRegion = class { constructor() {} };
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
export const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
  NONE: 'none',
  MUTEDSTANDARD: 'mutedStandard',
};
