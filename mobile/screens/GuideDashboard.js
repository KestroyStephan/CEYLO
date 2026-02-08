import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function GuideDashboard({ navigation }) {
    const [tours, setTours] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch assigned tours
        const q = query(collection(db, "tours"), where("guideId", "==", auth.currentUser?.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tourList = [];
            snapshot.forEach((doc) => {
                tourList.push({ id: doc.id, ...doc.data() });
            });
            setTours(tourList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00897B" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.headerTitle}>My Tours</Text>
                <Button mode="text" onPress={handleLogout} textColor="#D32F2F">Logout</Button>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text variant="titleLarge" style={{ color: '#00897B', fontWeight: 'bold' }}>{tours.length}</Text>
                    <Text variant="bodySmall">Active Tours</Text>
                </View>
                <View style={styles.statCard}>
                    <Text variant="titleLarge" style={{ color: '#00897B', fontWeight: 'bold' }}>4.8</Text>
                    <Text variant="bodySmall">Rating</Text>
                </View>
                <View style={styles.statCard}>
                    <Text variant="titleLarge" style={{ color: '#00897B', fontWeight: 'bold' }}>12</Text>
                    <Text variant="bodySmall">Completed</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Upcoming Itineraries</Text>
                {tours.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="calendar-blank" size={64} color="#E0E0E0" />
                        <Text style={{ marginTop: 10, color: '#757575' }}>No upcoming tours assigned.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={tours}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <Card style={styles.tourCard}>
                                <Card.Cover source={{ uri: item.imageUrl || 'https://via.placeholder.com/300' }} />
                                <Card.Content style={{ paddingTop: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                                        <Text variant="bodySmall" style={{ color: '#00897B' }}>{item.date}</Text>
                                    </View>
                                    <Text variant="bodyMedium" numberOfLines={2} style={{ color: '#757575', marginTop: 5 }}>
                                        {item.description}
                                    </Text>
                                    <Divider style={{ marginVertical: 10 }} />
                                    <View style={styles.tourFooter}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <MaterialCommunityIcons name="account-group" size={16} color="#757575" />
                                            <Text style={{ marginLeft: 5, color: '#757575' }}>{item.groupSize} Guests</Text>
                                        </View>
                                        <Button mode="contained-tonal" compact>View Details</Button>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F9',
        paddingTop: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#00695c'
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        width: '30%',
        alignItems: 'center',
        elevation: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    tourCard: {
        marginBottom: 20,
        borderRadius: 15,
        backgroundColor: '#FFF',
        elevation: 3,
        overflow: 'hidden',
    },
    tourFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
