import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TextInput, StatusBar
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROLES = [
  { key: 'tourist', icon: 'map-marker-outline', label: 'Tourist' },
  { key: 'guide', icon: 'account-voice', label: 'Guide' },
  { key: 'driver', icon: 'car-outline', label: 'Driver' },
  { key: 'vendor_onboarding', icon: 'storefront-outline', label: 'Vendor' },
];

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(route?.params?.presetRole || 'tourist');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const isActive = (field) => focusedField === field;

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Name Required', 'Please enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Email Required', 'Please enter your email address.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    if (!phone.trim()) { Alert.alert('Phone Required', 'Please enter your phone number.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (role === 'driver' && (!vehicleType.trim() || !licensePlate.trim())) {
      Alert.alert('Driver Info', 'Please fill in vehicle type and license plate.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      await updateProfile(user, { displayName: name.trim() });

      if (role === 'driver') {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, name: name.trim(), email: user.email, phone,
          role: 'driver_pending', status: 'pending_verification',
          isOnboarded: true, onboardingCompleted: true,
          createdAt: new Date().toISOString(),
        });
        await setDoc(doc(db, 'drivers', user.uid), {
          uid: user.uid, name: name.trim(), email: user.email, phone,
          vehicleType, licensePlate, licenseNumber: '',
          status: 'pending_verification', isOnline: false, rejectionReason: '',
          createdAt: serverTimestamp(),
        });
      } else {
        let finalRole = role;
        if (role === 'guide') finalRole = 'guide_pending';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, name: name.trim(), email: user.email, phone,
          role: finalRole, isOnboarded: false, createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try logging in.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field, placeholder, value, onChange, secure, keyType, extra) => (
    <View key={field} style={[styles.inputWrapper, isActive(field) && styles.inputWrapperFocused]}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#B0BCB0"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField('')}
        secureTextEntry={secure && !showPassword}
        keyboardType={keyType || 'default'}
        autoCapitalize={field === 'email' ? 'none' : 'words'}
        autoCorrect={false}
        style={[styles.input, secure && { flex: 1 }]}
        {...extra}
      />
      {secure && (
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
          <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#8A9E8A" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#EBF3EA" />
      <LinearGradient
        colors={['#EBF3EA', '#F6FBF5', '#FFFFFF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1A2E1A" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircleOuter}>
              <View style={styles.logoCircleInner}>
                <MaterialCommunityIcons name="leaf" size={30} color="#006A3B" />
              </View>
            </View>
            <Text style={styles.brandName}>
              Create {role === 'vendor_onboarding' ? 'Vendor' : role.charAt(0).toUpperCase() + role.slice(1)} Account
            </Text>
            <Text style={styles.brandTagline}>JOIN THE ECO-LUXURY COMMUNITY</Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <Text style={styles.fieldLabel}>Full Name</Text>
            {renderField("name", "Arjuna Perera", name, setName)}

            {/* Email */}
            <Text style={styles.fieldLabel}>Email Address</Text>
            {renderField("email", "you@example.com", email, setEmail, false, "email-address", { autoCapitalize: 'none' })}

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {renderField("phone", "+94 XX XXX XXXX", phone, setPhone, false, "phone-pad", { autoCapitalize: 'none' })}

            {/* Password */}
            <Text style={styles.fieldLabel}>Password</Text>
            {renderField("password", "Min. 6 characters", password, setPassword, true)}


            {/* Driver Extra Fields */}
            {role === 'driver' && (
              <View style={styles.extraFields}>
                <Text style={styles.fieldLabel}>Vehicle Type</Text>
                {renderField("vehicleType", "e.g. Tuk, Car, Van", vehicleType, setVehicleType)}
                <Text style={styles.fieldLabel}>License Plate</Text>
                {renderField("licensePlate", "e.g. CAB-1234", licensePlate, setLicensePlate, false, "default", { autoCapitalize: 'characters' })}
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6FBF5' },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 60 },

  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: 12 },

  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoCircleOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#E6F2E8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoCircleInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#006A3B', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  brandName: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  brandTagline: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#8A9E8A', letterSpacing: 2.5, marginTop: 3 },

  formCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 22, elevation: 3, shadowColor: '#1A2E1A', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },

  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#4A5E4A', marginBottom: 6, marginTop: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F5F2', borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1.5, borderColor: 'transparent' },
  inputWrapperFocused: { borderColor: '#006A3B', backgroundColor: '#FAFCFA' },
  input: { flex: 1, height: 50, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1A2E1A' },
  eyeBtn: { paddingLeft: 8 },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  roleCard: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F2F5F2', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: 'transparent' },
  roleCardActive: { backgroundColor: '#E8F5E9', borderColor: '#006A3B' },
  roleLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#8A9E8A' },
  roleLabelActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },

  extraFields: { gap: 0 },

  registerBtn: { backgroundColor: '#006A3B', borderRadius: 16, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  registerBtnText: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#FFF' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },
  footerLink: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#006A3B' },
});
