import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Searchbar, Avatar, IconButton } from 'react-native-paper';
import { auth } from '../firebaseConfig';

export default function HomeScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const user = auth.currentUser;
    const userName = user?.displayName || "Traveler";

    const features = [
        { id: 1, title: 'Plan a Trip', icon: 'robot', color: '#e0f2f1', iconColor: '#00695c', route: 'Chatbot' },
        { id: 2, title: 'Explore Eco Spots', icon: 'leaf', color: '#f1f8e9', iconColor: '#558b2f', route: 'MapTab' },
        { id: 3, title: 'Cultural Events', icon: 'drama-masks', color: '#fff3e0', iconColor: '#ef6c00', route: 'MapTab' }, // Replace with distinct route if available
        { id: 4, title: 'Saved Itineraries', icon: 'heart', color: '#ffebee', iconColor: '#c62828', route: 'ItineraryTab' },
    ];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text variant="titleMedium" style={{ color: '#555' }}>Ayubowan,</Text>
                    <Text variant="headlineSmall" style={styles.username}>{userName}!</Text>
                </View>
                <View style={styles.headerIcons}>
                    <IconButton icon="bell-outline" size={24} onPress={() => { }} />
                    <Avatar.Text
                        size={35}
                        label={userName[0].toUpperCase()}
                        style={{ backgroundColor: '#00695c' }}
                    />
                </View>
            </View>

            {/* Search */}
            <Searchbar
                placeholder="Where to go?"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#00695c"
            />

            {/* Grid Features */}
            <View style={styles.gridContainer}>
                {features.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, { backgroundColor: item.color }]}
                        onPress={() => navigation.navigate(item.route)}
                    >
                        <Avatar.Icon
                            size={50}
                            icon={item.icon}
                            color={item.iconColor}
                            style={{ backgroundColor: 'transparent' }}
                        />
                        <Text style={styles.cardTitle}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Featured Section (Optional/Extra based on "Explore the Pearl..." vibe) */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Popular Destinations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                <View style={styles.destinationCard}>
                    <View style={styles.placeholderImage} />
                    <Text style={styles.destName}>Sigiriya</Text>
                </View>
                <View style={styles.destinationCard}>
                    <View style={styles.placeholderImage} />
                    <Text style={styles.destName}>Ella</Text>
                </View>
                <View style={styles.destinationCard}>
                    <View style={styles.placeholderImage} />
                    <Text style={styles.destName}>Mirissa</Text>
                </View>
            </ScrollView>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // White background
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20, // Safe Area top
        marginBottom: 20,
    },
    username: {
        fontWeight: 'bold',
        color: '#000',
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBar: {
        marginBottom: 30,
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
        elevation: 0,
    },
    searchInput: {
        fontSize: 14,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 30,
    },
    card: {
        width: '47%', // roughly half
        aspectRatio: 1,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    cardTitle: {
        marginTop: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
        color: '#333',
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 15,
    },
    horizontalScroll: {
        marginBottom: 40,
    },
    destinationCard: {
        marginRight: 15,
        width: 140,
    },
    placeholderImage: {
        width: 140,
        height: 100,
        backgroundColor: '#eee',
        borderRadius: 15,
        marginBottom: 5,
    },
    destName: {
        fontWeight: '600',
        marginLeft: 5,
    }
});
