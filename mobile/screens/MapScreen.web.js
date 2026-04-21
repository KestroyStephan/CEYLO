import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, IconButton, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <Surface style={[styles.header, { pt: insets.top + 20 }]} elevation={2}>
                <IconButton icon="menu" onPress={() => navigation.openDrawer()} />
                <Text style={styles.title}>Map Explorer</Text>
                <IconButton icon="magnify" />
            </Surface>

            <View style={styles.placeholderContainer}>
                <Surface style={styles.card} elevation={4}>
                    <MaterialCommunityIcons name="map-marker-off" size={64} color="#00695C" />
                    <Text style={styles.placeholderTitle}>Interactive Maps on Native Only</Text>
                    <Text style={styles.placeholderSub}>
                        The interactive Google Maps experience with real-time routing and eco-tracking 
                        is optimized for Android and iOS devices.
                    </Text>
                    <Button 
                        mode="contained" 
                        onPress={() => navigation.goBack()}
                        style={styles.btn}
                        buttonColor="#00695C"
                    >
                        Back to Dashboard
                    </Button>
                </Surface>
            </View>

            <Surface style={styles.bottomBar} elevation={4}>
                <Text style={styles.ecoHint}>✨ Tip: Use the mobile app for live eco-navigation</Text>
            </Surface>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        backgroundColor: '#FFF',
        paddingBottom: 15,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: '#333',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        padding: 30,
        borderRadius: 30,
        backgroundColor: '#FFF',
        alignItems: 'center',
        gap: 20,
    },
    placeholderTitle: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: '#333',
        textAlign: 'center',
    },
    placeholderSub: {
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    btn: {
        marginTop: 10,
        width: '100%',
        borderRadius: 15,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingVertical: 20,
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    },
    ecoHint: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: '#00695C',
    }
});
