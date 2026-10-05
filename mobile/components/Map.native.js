import React, { useEffect, useState } from 'react';
import MapView, { Marker as RNMarker, PROVIDER_GOOGLE, Polyline, LocalTile } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

/**
 * Marker that stops re-drawing its custom view once it has rendered. With tracking left on,
 * Android re-snapshots every custom marker on each frame and a map with dozens of them runs
 * out of memory. A marker re-tracks briefly whenever its `trackKey` changes (e.g. a new icon).
 */
function Marker({ children, tracksViewChanges, trackKey, ...props }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    if (!children) return undefined;
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(t);
  }, [children ? trackKey : null]);
  return (
    <RNMarker {...props} tracksViewChanges={tracksViewChanges ?? (children ? tracking : false)}>
      {children}
    </RNMarker>
  );
}

export default MapView;
export { Marker, PROVIDER_GOOGLE, Polyline, MapViewDirections, LocalTile };
