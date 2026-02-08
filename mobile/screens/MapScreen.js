import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Searchbar, FAB } from 'react-native-paper';

export default function MapScreen() {
    const [searchQuery, setSearchQuery] = React.useState('');

    return (
        <View style={styles.container}>
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
                style={styles.map}
                initialRegion={{
                    latitude: 7.8731, // Sri Lanka Center
                    longitude: 80.7718,
                    latitudeDelta: 2.0,
                    longitudeDelta: 2.0,
                }}
            >
                {/* Example Markers */}
                <Marker
                    coordinate={{ latitude: 6.9271, longitude: 79.8612 }}
                    title={"Colombo"}
                    description={"Commercial Capital"}
                />
                <Marker
                    coordinate={{ latitude: 7.2906, longitude: 80.6337 }}
                    title={"Kandy"}
                    description={"Cultural Capital"}
                />
            </MapView>

            {/* Start Navigation FAB or Card */}
            <FAB
                icon="navigation"
                label="Start Navigation"
                style={styles.fab}
                onPress={() => console.log('Start Nav')}
                color="white"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        zIndex: 1,
    },
    routeCard: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 5,
        elevation: 5,
        backgroundColor: '#fff',
        elevation: 5,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 20,
        left: 0, // Center horizontally
        alignSelf: 'center',
        backgroundColor: '#00695c',
        borderRadius: 30,
    },
});
