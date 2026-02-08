import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, Image, ScrollView, Platform } from 'react-native';
import { Text, Button, Card, Avatar, Switch, ActivityIndicator, Divider } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function DriverDashboard({ navigation }) {
    const [location, setLocation] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            setLoading(false);
        })();

        // Listen for new booking requests (status: 'pending')
        // In a real app, you'd filter by location proximity too
        const q = query(collection(db, "bookings"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookings = [];
            snapshot.forEach((doc) => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            setRequests(bookings);
        });

        return () => unsubscribe();
    }, []);

    const toggleOnline = async () => {
        setIsOnline(!isOnline);
        // Update driver status in Firestore
        if (auth.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                isOnline: !isOnline
            });
        }
    };

    const handleAccept = async (id) => {
        try {
            await updateDoc(doc(db, "bookings", id), {
                status: 'accepted',
                driverId: auth.currentUser.uid
            });
            Alert.alert("Success", "Booking accepted!");
        } catch (error) {
            Alert.alert("Error", "Failed to accept booking");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00897B" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text variant="titleLarge" style={styles.headerTitle}>Driver Dashboard</Text>
                <View style={styles.onlineSwitch}>
                    <Text style={{ marginRight: 8, color: isOnline ? '#00897B' : '#757575' }}>
                        {isOnline ? 'On Duty' : 'Off Duty'}
                    </Text>
                    <Switch value={isOnline} onValueChange={toggleOnline} color="#00897B" />
                </View>
            </View>

            {/* Map Section */}
            <View style={styles.mapContainer}>
                {location ? (
                    <MapView
                        style={styles.map}
                        // provider={PROVIDER_GOOGLE} // Remove if not configured
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }}
                        showsUserLocation={true}
                    >
                        {/* Markers for requests could go here */}
                    </MapView>
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <Text>Loading Map...</Text>
                    </View>
                )}
            </View>

            {/* Requests Panel */}
            <View style={styles.requestsContainer}>
                <View style={styles.requestsHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>New Requests ({requests.length})</Text>
                    <Button mode="text" onPress={handleLogout} textColor="#D32F2F">Logout</Button>
                </View>

                {requests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="car-off" size={48} color="#BDBDBD" />
                        <Text style={{ color: '#757575', marginTop: 10 }}>No pending requests nearby.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={requests}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <Card style={styles.requestCard}>
                                <Card.Content>
                                    <View style={styles.cardHeader}>
                                        <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#E0F2F1' }} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text variant="titleMedium">{item.userName || "Passenger"}</Text>
                                            <Text variant="bodySmall" style={{ color: '#757575' }}>Typically relies on user location</Text>
                                        </View>
                                        <Text variant="titleMedium" style={{ color: '#00897B', fontWeight: 'bold' }}>
                                            LKR {item.price || "TBD"}
                                        </Text>
                                    </View>
                                    <Divider style={{ marginVertical: 10 }} />
                                    <View style={styles.routeInfo}>
                                        <View style={styles.routeRow}>
                                            <MaterialCommunityIcons name="circle-slice-8" size={16} color="#00897B" />
                                            <Text style={styles.routeText}>{item.pickupLocation || "Current Location"}</Text>
                                        </View>
                                        <View style={styles.routeLine} />
                                        <View style={styles.routeRow}>
                                            <MaterialCommunityIcons name="map-marker" size={16} color="#D32F2F" />
                                            <Text style={styles.routeText}>{item.dropLocation || "Destination"}</Text>
                                        </View>
                                    </View>
                                </Card.Content>
                                <Card.Actions>
                                    <Button mode="contained" onPress={() => handleAccept(item.id)} buttonColor="#00897B" style={{ flex: 1 }}>
                                        Accept Ride
                                    </Button>
                                </Card.Actions>
                            </Card>
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#00695c'
    },
    onlineSwitch: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mapContainer: {
        height: height * 0.4,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestsContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        marginTop: -20,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    requestsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    requestCard: {
        marginBottom: 15,
        backgroundColor: '#FFF',
        elevation: 3,
        borderRadius: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeInfo: {
        marginLeft: 10,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    routeText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#333',
    },
    routeLine: {
        width: 2,
        height: 15,
        backgroundColor: '#E0E0E0',
        marginLeft: 7,
        marginVertical: 2,
    },
});
