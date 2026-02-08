import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { FAB, Snackbar, Card, Title, Paragraph } from 'react-native-paper';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapViewDirections from 'react-native-maps-directions';

// Access API key directly from environment variable
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBP2yJgqV6r8X3UowvOiz8gOgkye5Y93i8';

// Debug: Log the API key (first 10 characters only for security)
console.log('Google Maps API Key loaded:', GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');

export default function MapScreen() {
    const [userLocation, setUserLocation] = useState(null);
    const [destination, setDestination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [routeInfo, setRouteInfo] = useState(null);
    const [showNavigation, setShowNavigation] = useState(false);
    const mapRef = useRef(null);
    const placesRef = useRef(null);

    // Request location permissions and get user location
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required to show your position on the map.');
                    setLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                setLoading(false);
            } catch (error) {
                console.error('Error getting location:', error);
                setLoading(false);
                showSnackbar('Could not get your location');
            }
        })();
    }, []);

    // Show snackbar message
    const showSnackbar = (message) => {
        setSnackbarMessage(message);
        setSnackbarVisible(true);
    };

    // Handle place selection from autocomplete
    const handlePlaceSelect = (data, details) => {
        console.log('Place selected:', data.description);
        console.log('Place details:', details);

        if (details && details.geometry) {
            const location = details.geometry.location;
            const newDestination = {
                latitude: location.lat,
                longitude: location.lng,
                name: details.name || data.description,
                address: details.formatted_address,
            };

            console.log('Setting destination:', newDestination);
            setDestination(newDestination);
            setShowNavigation(false); // Reset navigation when new place is selected
            setRouteInfo(null);

            // Animate map to show the destination
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.lat,
                    longitude: location.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000);
            }

            showSnackbar(`Found: ${newDestination.name}`);
        } else {
            console.error('No geometry details in place selection');
            showSnackbar('Could not get location details');
        }
    };

    // Handle start navigation
    const handleStartNavigation = () => {
        console.log('Start navigation clicked');
        console.log('User location:', userLocation);
        console.log('Destination:', destination);
        console.log('API Key available:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

        if (!userLocation) {
            showSnackbar('Waiting for your location...');
            return;
        }

        if (!destination) {
            showSnackbar('Please search for a destination first');
            return;
        }

        setShowNavigation(true);
        showSnackbar('Calculating route...');
    };

    // Handle route ready
    const onRouteReady = (result) => {
        console.log('Route ready:', result);
        setRouteInfo({
            distance: result.distance,
            duration: result.duration,
        });

        // Fit map to show entire route
        if (mapRef.current) {
            mapRef.current.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
        }

        showSnackbar(`Route found: ${result.distance.toFixed(1)} km, ${Math.round(result.duration)} min`);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00695c" />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Google Places Autocomplete Search */}
            <View style={styles.searchContainer}>
                <GooglePlacesAutocomplete
                    ref={placesRef}
                    placeholder='Search for hotels, schools, restaurants...'
                    onPress={handlePlaceSelect}
                    query={{
                        key: GOOGLE_MAPS_API_KEY,
                        language: 'en',
                        components: 'country:lk', // Restrict to Sri Lanka, remove this line for worldwide search
                    }}
                    fetchDetails={true}
                    enablePoweredByContainer={false}
                    styles={{
                        container: {
                            flex: 0,
                        },
                        textInputContainer: {
                            backgroundColor: 'transparent',
                        },
                        textInput: {
                            height: 48,
                            color: '#000',
                            fontSize: 16,
                            backgroundColor: '#fff',
                            borderRadius: 24,
                            paddingHorizontal: 20,
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                        },
                        listView: {
                            backgroundColor: '#fff',
                            borderRadius: 10,
                            marginTop: 5,
                            elevation: 3,
                        },
                        row: {
                            backgroundColor: '#fff',
                            padding: 13,
                            height: 60,
                            flexDirection: 'row',
                        },
                        separator: {
                            height: 0.5,
                            backgroundColor: '#c8c7cc',
                        },
                        description: {
                            fontSize: 14,
                        },
                        poweredContainer: {
                            display: 'none',
                        },
                    }}
                />
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: userLocation?.latitude || 7.8731,
                    longitude: userLocation?.longitude || 80.7718,
                    latitudeDelta: 2.0,
                    longitudeDelta: 2.0,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {/* User Location Marker */}
                {userLocation && (
                    <Marker
                        coordinate={userLocation}
                        title="Your Location"
                        description="You are here"
                        pinColor="blue"
                    />
                )}

                {/* Destination Marker */}
                {destination && (
                    <Marker
                        coordinate={destination}
                        title={destination.name}
                        description={destination.address}
                        pinColor="red"
                    />
                )}

                {/* Google Directions Route */}
                {showNavigation && userLocation && destination && (
                    <MapViewDirections
                        origin={userLocation}
                        destination={destination}
                        apikey={GOOGLE_MAPS_API_KEY}
                        strokeWidth={4}
                        strokeColor="#00695c"
                        onReady={onRouteReady}
                        onError={(errorMessage) => {
                            console.error('Directions API error:', errorMessage);
                            console.error('Origin:', userLocation);
                            console.error('Destination:', destination);
                            console.error('API Key (first 10 chars):', GOOGLE_MAPS_API_KEY.substring(0, 10));
                            showSnackbar('Could not calculate route. Check console for details.');
                            setShowNavigation(false);
                        }}
                    />
                )}
            </MapView>

            {/* Route Information Card */}
            {routeInfo && (
                <Card style={styles.routeCard}>
                    <Card.Content>
                        <Title style={styles.routeTitle}>Route to {destination?.name}</Title>
                        <View style={styles.routeDetails}>
                            <View style={styles.routeDetailItem}>
                                <Text style={styles.routeLabel}>Distance</Text>
                                <Paragraph style={styles.routeValue}>{routeInfo.distance.toFixed(1)} km</Paragraph>
                            </View>
                            <View style={styles.routeDetailItem}>
                                <Text style={styles.routeLabel}>Duration</Text>
                                <Paragraph style={styles.routeValue}>{Math.round(routeInfo.duration)} min</Paragraph>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            )}

            {/* Start Navigation FAB */}
            <FAB
                icon="navigation"
                label={showNavigation ? "Navigating" : "Start Navigation"}
                style={[
                    styles.fab,
                    (!destination || !userLocation) && styles.fabDisabled,
                    showNavigation && styles.fabActive
                ]}
                onPress={handleStartNavigation}
                color="white"
                disabled={!destination || !userLocation || showNavigation}
            />

            {/* Snackbar for messages */}
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                style={styles.snackbar}
            >
                {snackbarMessage}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#00695c',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    searchContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    routeCard: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 5,
        elevation: 5,
        backgroundColor: '#fff',
        borderRadius: 15,
    },
    routeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00695c',
        marginBottom: 10,
    },
    routeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    routeDetailItem: {
        alignItems: 'center',
    },
    routeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    routeValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00695c',
        margin: 0,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 20,
        left: 0,
        alignSelf: 'center',
        backgroundColor: '#00695c',
        borderRadius: 30,
        zIndex: 5,
    },
    fabDisabled: {
        backgroundColor: '#cccccc',
    },
    fabActive: {
        backgroundColor: '#004d40',
    },
    snackbar: {
        backgroundColor: '#00695c',
    },
    warningContainer: {
        position: 'absolute',
        top: 120,
        left: 20,
        right: 20,
        backgroundColor: '#fff3cd',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
        zIndex: 5,
    },
    warningText: {
        color: '#856404',
        fontSize: 14,
        fontWeight: '500',
    },
});