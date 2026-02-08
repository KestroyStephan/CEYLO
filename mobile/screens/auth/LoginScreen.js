
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Divider } from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureText, setSecureText] = useState(true);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            await AsyncStorage.setItem('lastLoginDate', new Date().toISOString());
        } catch (error) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.title}>Welcome Back!</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>Explore the Pearl of the Indian Ocean</Text>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Email/Phone"
                        value={email}
                        onChangeText={setEmail}
                        mode="flat"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="account-outline" size={24} color="#757575" />} />}
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

                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    labelStyle={styles.loginButtonLabel}
                >
                    Login
                </Button>

                <View style={styles.dividerContainer}>
                    <Divider style={styles.divider} />
                    <Text style={styles.dividerText}>Or continue with</Text>
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
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.signUpText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F9',
    },
    content: {
        flex: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 25,
    },
    forgotPasswordText: {
        color: '#00897B',
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: '#00897B',
        borderRadius: 25,
        marginBottom: 30,
    },
    loginButtonContent: {
        height: 55,
    },
    loginButtonLabel: {
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
        marginBottom: 30,
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
    signUpText: {
        color: '#00897B',
        fontWeight: 'bold',
    },
});
