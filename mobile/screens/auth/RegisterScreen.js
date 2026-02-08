
import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Checkbox, Divider } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [contact, setContact] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState('');

    const [role, setRole] = useState('tourist'); // 'tourist', 'driver', 'guide'
    // Role specific fields
    const [vehicleType, setVehicleType] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [guideLicense, setGuideLicense] = useState('');
    const [languages, setLanguages] = useState('');

    const [loading, setLoading] = useState(false);
    const [secureText, setSecureText] = useState(true);

    const handleRegister = async () => {
        if (!name || !username || !email || !password || !contact || !location) {
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
            const userData = {
                uid: user.uid,
                name: name,
                username: username,
                email: email,
                contact: contact,
                location: location,
                role: role,
                createdAt: new Date(),
                preferences: role === 'tourist' ? { eco_interest: 50, budget: 'mid' } : null,
            };

            if (role === 'driver') {
                userData.vehicleType = vehicleType;
                userData.licensePlate = licensePlate;
            } else if (role === 'guide') {
                userData.guideLicense = guideLicense;
                userData.languages = languages;
            }

            await setDoc(doc(db, 'users', user.uid), userData);

            // Save login date to implement "stay logged in for specific days"
            await AsyncStorage.setItem('lastLoginDate', new Date().toISOString());

            Alert.alert('Success', 'Account created successfully!');
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Join CEYLO and explore Sri Lanka</Text>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        mode="flat"
                        style={styles.input}
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={24} color="#757575" />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />

                    <TextInput
                        placeholder="Username"
                        value={username}
                        onChangeText={setUsername}
                        mode="flat"
                        style={styles.input}
                        autoCapitalize="none"
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="at" size={24} color="#757575" />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />

                    <TextInput
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="flat"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={24} color="#757575" />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />

                    <TextInput
                        placeholder="Contact Number"
                        value={contact}
                        onChangeText={setContact}
                        mode="flat"
                        style={styles.input}
                        keyboardType="phone-pad"
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="phone-outline" size={24} color="#757575" />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />

                    <TextInput
                        placeholder="Location"
                        value={location}
                        onChangeText={setLocation}
                        mode="flat"
                        style={styles.input}
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="map-marker-outline" size={24} color="#757575" />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />

                    <TextInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="flat"
                        style={styles.input}
                        secureTextEntry={secureText}
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={24} color="#757575" />} />}
                        right={<TextInput.Icon icon={() => <MaterialCommunityIcons name={secureText ? "eye-off-outline" : "eye-outline"} size={24} color="#757575" onPress={() => setSecureText(!secureText)} />} />}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        selectionColor="#00897B"
                        cursorColor="#00897B"
                    />
                </View>

                {/* Role Selection */}
                <Text style={styles.sectionTitle}>I am a:</Text>
                <View style={styles.roleContainer}>
                    {['tourist', 'driver', 'guide'].map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.roleButton, role === r && styles.roleButtonActive]}
                            onPress={() => setRole(r)}
                        >
                            <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Role Specific Fields */}
                {role === 'driver' && (
                    <View style={styles.specificFields}>
                        <TextInput
                            placeholder="Vehicle Type (e.g., Car, Van, Tuk)"
                            value={vehicleType}
                            onChangeText={setVehicleType}
                            mode="flat"
                            style={styles.input}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                        <TextInput
                            placeholder="License Plate Number"
                            value={licensePlate}
                            onChangeText={setLicensePlate}
                            mode="flat"
                            style={styles.input}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                    </View>
                )}

                {role === 'guide' && (
                    <View style={styles.specificFields}>
                        <TextInput
                            placeholder="Guide License Number"
                            value={guideLicense}
                            onChangeText={setGuideLicense}
                            mode="flat"
                            style={styles.input}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                        <TextInput
                            placeholder="Languages (comma separated)"
                            value={languages}
                            onChangeText={setLanguages}
                            mode="flat"
                            style={styles.input}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                    </View>
                )}

                <Button
                    mode="contained"
                    onPress={handleRegister}
                    loading={loading}
                    style={styles.registerButton}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                >
                    Register
                </Button>

                <View style={styles.dividerContainer}>
                    <Divider style={styles.divider} />
                    <Text style={styles.dividerText}>Or register with</Text>
                    <Divider style={styles.divider} />
                </View>

                <View style={styles.socialButtons}>
                    <TouchableOpacity style={styles.socialButton}>
                        <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                        <Text style={styles.socialButtonText}>Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                        <MaterialCommunityIcons name="apple" size={24} color="#000" />
                        <Text style={styles.socialButtonText}>Apple</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F9',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 30,
        paddingVertical: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        color: '#757575',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#E8EBEF',
        marginBottom: 15,
        borderRadius: 25,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: 55,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#00897B',
        alignItems: 'center',
    },
    roleButtonActive: {
        backgroundColor: '#00897B',
    },
    roleButtonText: {
        color: '#00897B',
        fontWeight: '600',
    },
    roleButtonTextActive: {
        color: '#FFF',
    },
    specificFields: {
        marginBottom: 10,
    },
    registerButton: {
        backgroundColor: '#00897B',
        borderRadius: 25,
        marginBottom: 25,
    },
    buttonContent: {
        height: 55,
    },
    buttonLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#757575',
        fontSize: 12,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 25,
        height: 55,
        width: '48%',
    },
    socialButtonText: {
        marginLeft: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: '#000',
    },
    loginText: {
        color: '#00897B',
        fontWeight: 'bold',
    },
});
