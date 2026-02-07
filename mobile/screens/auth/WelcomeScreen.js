
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export default function WelcomeScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to CEYLO</Text>
            <Text style={styles.subtitle}>Discover Sri Lanka like never before.</Text>

            <View style={styles.buttonContainer}>
                <Button
                    mode="contained"
                    onPress={() => navigation.navigate('Login')}
                    style={styles.button}
                >
                    Login
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('Register')}
                    style={styles.button}
                >
                    Register
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#00695c', // Teal
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 40,
        textAlign: 'center',
        color: '#555',
    },
    buttonContainer: {
        width: '100%',
        gap: 10,
    },
    button: {
        marginVertical: 5,
    },
});
