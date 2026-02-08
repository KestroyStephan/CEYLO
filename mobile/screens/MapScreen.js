import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Searchbar, FAB } from 'react-native-paper';

export default function MapScreen() {
    const [searchQuery, setSearchQuery] = React.useState('');

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>

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
