import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, ProgressBar, IconButton, MD3Colors } from 'react-native-paper';

export default function ItineraryScreen() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => { }} />
                <Text variant="titleLarge" style={styles.headerTitle}>Tailor Your Journey</Text>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.label}>Trip Focus</Text>
                    <View style={styles.labelRow}>
                        <Text variant="bodySmall">Nature/Eco</Text>
                        <Text variant="bodySmall">Culture/History</Text>
                    </View>
                    <ProgressBar progress={0.3} color="#00695c" style={styles.slider} />

                    <View style={styles.spacer} />

                    <Text variant="titleMedium" style={styles.label}>How many days?</Text>
                    <View style={styles.counterRow}>
                        <IconButton icon="minus" mode="contained-tonal" size={20} onPress={() => { }} />
                        <Text variant="headlineMedium">5</Text>
                        <IconButton icon="plus" mode="contained-tonal" size={20} onPress={() => { }} />
                    </View>

                    <View style={styles.spacer} />

                    <Text variant="titleMedium" style={styles.label}>Your Budget</Text>
                    <View style={styles.budgetRow}>
                        <Button mode="contained" style={styles.budgetBtnSelected} buttonColor="#00695c">
                            $ Budget
                        </Button>
                        <Button mode="outlined" style={styles.budgetBtn}>
                            $$ Standard
                        </Button>
                        <Button mode="outlined" style={styles.budgetBtn}>
                            $$$ Luxury
                        </Button>
                    </View>

                    <Button mode="contained" style={styles.generateBtn} buttonColor="#00695c">
                        Generate Itinerary
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
