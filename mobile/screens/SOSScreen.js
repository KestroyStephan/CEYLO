import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';

export default function SOSScreen() {
    const [alertActive, setAlertActive] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.sosCircleOuter, alertActive && styles.activePulse]}>
                    <TouchableOpacity
                        style={styles.sosCircleInner}
                        onPress={() => setAlertActive(!alertActive)}
                    >
                        <Text variant="displayMedium" style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.instructions}>
                    Press the SOS button, help calls are needed to suit your emergency alert.
                </Text>

                <View style={styles.locationBox}>
                    <Avatar.Icon size={40} icon="map-marker" style={{ backgroundColor: '#e0e0e0' }} color="#555" />
                    <View style={styles.locationText}>
                        <Text variant="titleSmall">Location</Text>
                        <Text variant="bodySmall">Emergency Contacts</Text>
                    </View>
                    <Avatar.Icon size={40} icon="phone" style={{ backgroundColor: '#e0e0e0' }} color="#555" />
                </View>

                <Button
                    mode="contained"
                    style={styles.cancelBtn}
                    buttonColor="#bdbdbd"
                    textColor="#555"
                    onPress={() => setAlertActive(false)}
                >
                    I'm Safe / Cancel Alert
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffebee', // Light red tint
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
    },
    sosCircleOuter: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    sosCircleInner: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#f44336', // Red
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: 'red',
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    sosText: {
        color: 'white',
        fontWeight: 'bold',
    },
    instructions: {
        textAlign: 'center',
        marginBottom: 40,
        color: '#555',
        paddingHorizontal: 20,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 20,
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 30,
        elevation: 2,
    },
    locationText: {
        flex: 1,
        paddingHorizontal: 15,
    },
    cancelBtn: {
        width: '100%',
        paddingVertical: 5,
        borderRadius: 30,
    }
});
