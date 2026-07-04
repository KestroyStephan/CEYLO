import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

// Shimmer animation that pulses between two grays to indicate loading
const ShimmerPlaceholder = () => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animVal, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(animVal, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animVal]);

  const opacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.shimmer, { opacity }]} />
  );
};

const DEFAULT_FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sigiriya_rock_from_the_south_side.jpg/800px-Sigiriya_rock_from_the_south_side.jpg';
const TIMEOUT_MS = 8000; // 8 seconds before giving up and showing fallback

/**
 * ProgressiveImage
 * Drop-in replacement for <Image source={{ uri }} style={...} />
 * Shows an animated shimmer skeleton while loading, and a fallback image on error or timeout.
 *
 * Props:
 *   - source: { uri: string }
 *   - style: ViewStyle / ImageStyle
 *   - fallback: (optional) { uri: string }
 *   - resizeMode: (optional) defaults to 'cover'
 */
const ProgressiveImage = ({ source, style, fallback, resizeMode = 'cover' }) => {
  const [loaded, setLoaded] = useState(false);
  const [imgSource, setImgSource] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    const uri = source?.uri;

    if (!uri || uri === 'null' || uri === 'undefined') {
      // No valid URI — skip fetch, jump straight to fallback
      setImgSource(fallback || { uri: DEFAULT_FALLBACK });
      setLoaded(true);
      return;
    }

    setImgSource({ uri });

    // Start a timeout: if onLoad/onError hasn't fired within 8s, use fallback
    timeoutRef.current = setTimeout(() => {
      setImgSource(fallback || { uri: DEFAULT_FALLBACK });
      setLoaded(true);
    }, TIMEOUT_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [source?.uri]);

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    setLoaded(true);
  };

  const handleError = () => {
    clearTimeout(timeoutRef.current);
    setImgSource(fallback || { uri: DEFAULT_FALLBACK });
    setLoaded(true);
  };

  if (!imgSource) {
    return (
      <View style={[style, styles.container]}>
        <ShimmerPlaceholder />
      </View>
    );
  }

  return (
    <View style={[style, styles.container]}>
      {!loaded && <ShimmerPlaceholder />}
      <Image
        source={imgSource}
        style={StyleSheet.absoluteFillObject}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D8DDD8',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#C0C8C0',
  },
});

export default ProgressiveImage;
