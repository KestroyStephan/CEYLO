import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, Linking, Platform, Keyboard } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { FAB, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapScreen() {
    const insets = useSafeAreaInsets();
    const mapRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [routeDetails, setRouteDetails] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Permission to access location was denied');
                return;
            }

            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation.coords);
            setOrigin({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });

            // Animate to user location
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }
        })();
    }, []);

    const handleStartNavigation = () => {
        if (!origin || !destination) {
            Alert.alert('No Route', 'Please select a destination first.');
            return;
        }

        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${destination.latitude},${destination.longitude}`;
        const label = 'Destination';

        // Alternatively use Google Maps URL for guaranteed turn-by-turn
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;

        Linking.openURL(googleMapsUrl);
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: 7.8731, // Sri Lanka Center
                    longitude: 80.7718,
                    latitudeDelta: 2.0,
                    longitudeDelta: 2.0,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {origin && <Marker coordinate={origin} title="You are here" pinColor="#00695c" />}
                {destination && <Marker coordinate={destination} title="Destination" />}

                {origin && destination && (
                    <MapViewDirections
                        origin={origin}
                        destination={destination}
                        apikey={GOOGLE_API_KEY}
                        strokeWidth={4}
                        strokeColor="#00695c"
                        onReady={result => {
                            setRouteDetails(result);
                            mapRef.current.fitToCoordinates(result.coordinates, {
                                edgePadding: {
                                    right: 50,
                                    bottom: 50,
                                    left: 50,
                                    top: 150, // Space for search bar
                                },
                            });
                        }}
                        onError={(errorMessage) => {
                            console.log('Directions Error:', errorMessage);
                        }}
                    />
                )}
            </MapView>

            <View style={[styles.searchContainer, { top: insets.top + 10 }]}>
                <GooglePlacesAutocomplete
                    placeholder='Search destination...'
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        const point = details?.geometry?.location;
                        if (point) {
                            setDestination({
                                latitude: point.lat,
                                longitude: point.lng,
                            });
                            Keyboard.dismiss();
                        }
                    }}
                    query={{
                        key: GOOGLE_API_KEY,
                        language: 'en',
                        components: 'country:lk', // Limit to Sri Lanka
                    }}
                    styles={{
                        textInputContainer: {
                            backgroundColor: 'transparent',
                        },
                        textInput: {
                            height: 48,
                            color: '#5d5d5d',
                            fontSize: 16,
                            borderRadius: 25,
                            paddingHorizontal: 20,
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            backgroundColor: '#fff',
                        },
                        listView: {
                            backgroundColor: '#fff',
                            borderRadius: 10,
                            marginTop: 5,
                            elevation: 5,
                        },
                    }}
                    enablePoweredByContainer={false}
                />
            </View>

            {destination && (
                <FAB
                    icon="navigation"
                    label="Start Navigation"
                    style={styles.fab}
                    onPress={handleStartNavigation}
                    color="white"
                    theme={{ colors: { accent: '#00695c' } }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    searchContainer: {
        position: 'absolute',
        width: '90%',
        alignSelf: 'center',
        zIndex: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 20,
        bottom: 30,
        backgroundColor: '#00695c',
        borderRadius: 30,
    },
});
