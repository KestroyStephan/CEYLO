import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { imgSource } from '../utils/images';

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

// Wikimedia answers "429 Too Many Requests" when a screen asks for many photos at once,
// so a failed photo is retried after a short, growing pause before giving up
const RETRY_DELAYS_MS = [1500, 4000, 9000];

/**
 * ProgressiveImage
 * Drop-in replacement for <Image source={{ uri }} style={...} />
 * Shows an animated shimmer while loading, retries failed loads, and finally a neutral
 * placeholder (or the `fallback` source) instead of a photo of some other place.
 */
const ProgressiveImage = ({ source, style, fallback, resizeMode = 'cover' }) => {
  const uri = source?.uri && source.uri !== 'null' && source.uri !== 'undefined' ? source.uri : null;
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(!uri);
  const retryRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setAttempt(0);
    setFailed(!uri);
    return () => clearTimeout(retryRef.current);
  }, [uri]);

  const handleError = () => {
    if (attempt < RETRY_DELAYS_MS.length) {
      retryRef.current = setTimeout(() => setAttempt(a => a + 1), RETRY_DELAYS_MS[attempt]);
    } else {
      setFailed(true);
    }
  };

  if (failed && fallback?.uri) {
    return (
      <View style={[style, styles.container]}>
        <Image source={imgSource(fallback.uri)} style={StyleSheet.absoluteFillObject} resizeMode={resizeMode} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[style, styles.container, styles.placeholder]}>
        <MaterialCommunityIcons name="image-filter-hdr" size={36} color="#9AA8A2" />
      </View>
    );
  }

  return (
    <View style={[style, styles.container]}>
      {!loaded && <ShimmerPlaceholder />}
      <Image
        key={`${uri}#${attempt}`}
        source={imgSource(uri)}
        style={StyleSheet.absoluteFillObject}
        resizeMode={resizeMode}
        onLoad={() => setLoaded(true)}
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
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3E9E6',
  },
  shimmer: {
    backgroundColor: '#C0C8C0',
  },
});

export default ProgressiveImage;
