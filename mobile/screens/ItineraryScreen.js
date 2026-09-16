import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ItineraryScreen({ navigation }) {
    const [focus, setFocus] = useState('Nature/Eco');
    const [days, setDays] = useState(5);
    const [budget, setBudget] = useState('$$ Standard');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!auth.currentUser) {
            Alert.alert("Error", "Please login to generate an itinerary.");
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, `users/${auth.currentUser.uid}/itineraries`), {
                focus,
                days,
                budget,
                status: 'generated',
                createdAt: serverTimestamp(),
            });
            Alert.alert("Success", "Itinerary generated and saved successfully!");
            // Navigate to Concierge passing the extracted state
            navigation.navigate('Concierge', { 
                initialState: { focus, days, budget }
            });
        } catch (error) {
            console.error("Error saving itinerary:", error);
            Alert.alert("Error", "Failed to save itinerary.");
        }
        setLoading(false);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
                <Text variant="titleLarge" style={styles.headerTitle}>Tailor Your Journey</Text>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.label}>Trip Focus</Text>
                    <View style={styles.budgetRow}>
                        <Button mode={focus === 'Nature/Eco' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={focus === 'Nature/Eco' ? '#00695c' : undefined} onPress={() => setFocus('Nature/Eco')}>
                            Nature/Eco
                        </Button>
                        <Button mode={focus === 'Balanced' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={focus === 'Balanced' ? '#00695c' : undefined} onPress={() => setFocus('Balanced')}>
                            Balanced
                        </Button>
                        <Button mode={focus === 'Culture/History' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={focus === 'Culture/History' ? '#00695c' : undefined} onPress={() => setFocus('Culture/History')}>
                            Culture/History
                        </Button>
                    </View>

                    <View style={styles.spacer} />

                    <Text variant="titleMedium" style={styles.label}>How many days?</Text>
                    <View style={styles.counterRow}>
                        <IconButton icon="minus" mode="contained-tonal" size={20} onPress={() => setDays(Math.max(1, days - 1))} />
                        <Text variant="headlineMedium">{days}</Text>
                        <IconButton icon="plus" mode="contained-tonal" size={20} onPress={() => setDays(days + 1)} />
                    </View>

                    <View style={styles.spacer} />

                    <Text variant="titleMedium" style={styles.label}>Your Budget</Text>
                    <View style={styles.budgetRow}>
                        <Button mode={budget === '$ Budget' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={budget === '$ Budget' ? '#00695c' : undefined} onPress={() => setBudget('$ Budget')}>
                            $ Budget
                        </Button>
                        <Button mode={budget === '$$ Standard' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={budget === '$$ Standard' ? '#00695c' : undefined} onPress={() => setBudget('$$ Standard')}>
                            $$ Standard
                        </Button>
                        <Button mode={budget === '$$$ Luxury' ? 'contained' : 'outlined'} style={styles.budgetBtn} buttonColor={budget === '$$$ Luxury' ? '#00695c' : undefined} onPress={() => setBudget('$$$ Luxury')}>
                            $$$ Luxury
                        </Button>
                    </View>

                    <Button mode="contained" style={styles.generateBtn} buttonColor="#00695c" onPress={handleGenerate} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : "Generate Itinerary"}
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 30, // Safe area
        marginBottom: 20,
    },
    headerTitle: {
        fontWeight: 'bold',
        marginLeft: 10,
    },
    card: {
        borderRadius: 20,
        backgroundColor: 'white',
        elevation: 2,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    slider: {
        height: 8,
        borderRadius: 4,
        marginBottom: 20,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // centers contents
        width: 150, // limit width
        marginTop: 10,
    },
    spacer: {
        height: 20,
    },
    budgetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
        marginBottom: 30,
    },
    budgetBtn: {
        borderRadius: 20,
    },
    budgetBtnSelected: {
        borderRadius: 20,
    },
    generateBtn: {
        paddingVertical: 6,
        borderRadius: 30,
    },
});
