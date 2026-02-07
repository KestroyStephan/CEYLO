
import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, Checkbox } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isVendor, setIsVendor] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Profile Name
            await updateProfile(user, { displayName: name });

            // 3. Save User Data to Firestore
            const role = isVendor ? 'vendor' : 'tourist';
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                role: role,
                createdAt: new Date(),
                preferences: role === 'tourist' ? { eco_interest: 50, budget: 'mid' } : null,
            });

            Alert.alert('Success', 'Account created successfully!');
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>Create Account</Text>

            <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
            />

            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry
            />

            <View style={styles.checkboxContainer}>
                <Checkbox
                    status={isVendor ? 'checked' : 'unchecked'}
                    onPress={() => setIsVendor(!isVendor)}
                    color="#00695c"
                />
                <Text onPress={() => setIsVendor(!isVendor)}>Register as Vendor?</Text>
            </View>

            <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                style={styles.button}
            >
                Register
            </Button>

            <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
            >
                Already have an account? Login
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#00695c',
    },
    input: {
        marginBottom: 10,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    button: {
        marginTop: 10,
        marginBottom: 10,
        paddingVertical: 5,
    },
});
