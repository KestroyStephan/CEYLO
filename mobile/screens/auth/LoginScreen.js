import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TextInput, StatusBar, Dimensions
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Google "G" logo as colored icon
function GoogleIcon({ size = 20 }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.9, fontFamily: 'Outfit-Bold', color: '#4285F4', letterSpacing: -1 }}>
        G
      </Text>
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert('Email Required', 'Please enter your email address.'); return; }
    if (!password) { Alert.alert('Password Required', 'Please enter your password.'); return; }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      let message = 'Invalid email or password. Please try again.';
      if (error.code === 'auth/invalid-email') message = 'The email address is not valid.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please try again later.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset Password', 'Please enter your email address first, then tap Forgot Password again.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email Sent', 'A password reset link has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#EBF3EA" />

      {/* Soft gradient background */}
      <LinearGradient
        colors={['#EBF3EA', '#F6FBF5', '#FFFFFF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircleOuter}>
              <View style={styles.logoCircleInner}>
                <MaterialCommunityIcons name="leaf" size={34} color="#006A3B" />
              </View>
            </View>
            <Text style={styles.brandName}>Ceylo</Text>
            <Text style={styles.brandTagline}>ECO-LUXURY DISCOVERY</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.formCard}>
            {/* Email */}
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#B0BCB0"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#B0BCB0"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#8A9E8A"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              onPress={() => Alert.alert('Google Sign-In', 'Google sign-in requires additional setup with expo-auth-session.')}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Create Account ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Ceylo? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6FBF5' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: 'center',
  },

  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircleOuter: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#E6F2E8',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  logoCircleInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    elevation: 3,
    shadowColor: '#006A3B', shadowOpacity: 0.12,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  brandName: {
    fontSize: 32, fontFamily: 'Outfit-Bold',
    color: '#006A3B', letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 11, fontFamily: 'Outfit-Medium',
    color: '#8A9E8A', letterSpacing: 3, marginTop: 2,
  },

  formCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    elevation: 3,
    shadowColor: '#1A2E1A', shadowOpacity: 0.07,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F5F2',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: '#006A3B',
    backgroundColor: '#FAFCFA',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: '#1A2E1A',
  },
  eyeBtn: { paddingLeft: 8 },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  loginBtn: {
    backgroundColor: '#006A3B',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBtnText: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#FFF' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8EEE8' },
  dividerLabel: {
    marginHorizontal: 16,
    fontSize: 13, fontFamily: 'Outfit-Medium',
    color: '#B0BCB0',
  },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E0E8E0',
    borderRadius: 16, height: 54,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  googleG: {
    fontSize: 20, fontFamily: 'Outfit-Bold',
    color: '#4285F4',
  },
  googleBtnText: { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#1A2E1A' },

  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 28,
  },
  footerText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },
  footerLink: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#006A3B' },
});
