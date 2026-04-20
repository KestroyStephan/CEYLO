import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = React.forwardRef(({ children, style, onRegionChange, initialRegion }, ref) => {
    // Provide some dummy methods so ref calls to animateToRegion or fitToCoordinates do not crash on Web
    React.useImperativeHandle(ref, () => ({
        animateToRegion: () => {},
        fitToCoordinates: () => {},
    }));

    return (
        <View style={[style, styles.container]}>
            <Text style={styles.text}>Google Maps are not supported on Web in this build.</Text>
            {/* We render children but keep them hidden or render safe non-native mock points */}
        </View>
    );
});

const Marker = () => null;
const PROVIDER_GOOGLE = "google";
const MapViewDirections = () => null;

export default MapView;
export { Marker, PROVIDER_GOOGLE, MapViewDirections };

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
    },
    text: {
        color: '#666',
        fontWeight: 'bold',
        padding: 20,
        textAlign: 'center',
    }
});
