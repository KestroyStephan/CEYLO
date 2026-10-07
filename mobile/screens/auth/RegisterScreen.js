import React, { useState } from 'react';
import i18n from '../../i18n';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Alert, TextInput, StatusBar } from 'react-native';
import KeyboardAvoider from '../../components/KeyboardAvoider';
import { Text, ActivityIndicator } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../components/Toast';
import { transportIcon } from '../../utils/transport';

const ROLES = [
  { key: 'tourist', icon: 'map-marker-outline', label: 'Tourist', hint: 'Plan trips, book rides and guides' },
  { key: 'guide', icon: 'account-voice', label: 'Guide', hint: 'Offer tours (verified by CEYLO)' },
  { key: 'driver', icon: 'steering', label: 'Driver', hint: 'Give rides (verified by CEYLO)' },
  { key: 'vendor_onboarding', icon: 'storefront-outline', label: 'Vendor', hint: 'Sell crafts and produce (verified)' },
];
// Must match the ride request vehicle types exactly, or the driver never receives requests
const VEHICLE_TYPES = ['Tuk', 'Bike', 'Car', 'Van'];
const VEHICLE_LABEL = { Tuk: 'Tuk-tuk', Bike: 'Bike', Car: 'Car', Van: 'Van' };

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(route?.params?.presetRole || 'tourist');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const isActive = (field) => focusedField === field;

  const handleRegister = async () => {
    if (!name.trim()) { toast.warning('Name Required', 'Please enter your full name.'); return; }
    if (!email.trim()) { toast.warning('Email Required', 'Please enter your email address.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.warning('Invalid Email', 'Please enter a valid email address.'); return; }
    if (!phone.trim()) { toast.warning('Phone Required', 'Please enter your phone number.'); return; }
    if (password.length < 6) { toast.warning('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (role === 'driver') {
      if (!VEHICLE_TYPES.includes(vehicleType)) { toast.warning('Vehicle type', 'Choose your vehicle: Tuk-tuk, Bike, Car or Van.'); return; }
      if (!/^([A-Z]{2,3}[\s-]?[A-Z]{0,3}|\d{2,3})[\s-]?\d{3,4}$/i.test(licensePlate.trim())) { toast.warning('Number plate', 'Enter the plate like WP CAB-1234 or CAB-1234.'); return; }
      if (licenseNumber.trim().length < 5) { toast.warning('Driving licence', 'Enter your driving licence number.'); return; }
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
          vehicleType, licensePlate: licensePlate.trim().toUpperCase(), licenseNumber: licenseNumber.trim().toUpperCase(),
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
      else if (error.code === 'auth/network-request-failed') msg = 'No internet connection. Please try again.';
      else if (error.code === 'permission-denied') msg = 'Your account was created but your details could not be saved. Please sign in and try again.';
      toast.error('Registration failed', msg);
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
        autoCapitalize={field === 'name' ? 'words' : 'none'}
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

      <KeyboardAvoider behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
              {i18n.t('create_role_account', { role: i18n.t(`role_${role === 'vendor_onboarding' ? 'vendor' : role}`) })}
            </Text>
            <Text style={styles.brandTagline}>{i18n.t('ui_join_the_eco_luxury_community')}</Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <Text style={styles.fieldLabel}>{i18n.t('ui_full_name')}</Text>
            {renderField("name", "Arjuna Perera", name, setName)}

            {/* Email */}
            <Text style={styles.fieldLabel}>{i18n.t('ui_email_address')}</Text>
            {renderField("email", "you@example.com", email, setEmail, false, "email-address", { autoCapitalize: 'none' })}

            {/* Phone */}
            <Text style={styles.fieldLabel}>{i18n.t('ui_phone_number')}</Text>
            {renderField("phone", "+94 XX XXX XXXX", phone, setPhone, false, "phone-pad", { autoCapitalize: 'none' })}

            {/* Password */}
            <Text style={styles.fieldLabel}>{i18n.t('ui_password')}</Text>
            {renderField("password", "Min. 6 characters", password, setPassword, true)}


            {/* Driver Extra Fields */}
            {role === 'driver' && (
              <View style={styles.extraFields}>
                <Text style={styles.fieldLabel}>{i18n.t('ui_vehicle_type')}</Text>
                <View style={styles.roleGrid}>
                  {VEHICLE_TYPES.map(v => {
                    const on = vehicleType === v;
                    return (
                      <TouchableOpacity key={v} onPress={() => setVehicleType(v)} activeOpacity={0.85}
                        style={[styles.roleCard, on && styles.roleCardActive]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                        <MaterialCommunityIcons name={transportIcon(v)} size={22} color={on ? '#006A3B' : '#8A9E8A'} />
                        <Text style={[styles.roleLabel, on && styles.roleLabelActive]}>{VEHICLE_LABEL[v]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.fieldLabel}>{i18n.t('ui_license_plate')}</Text>
                {renderField("licensePlate", "e.g. WP CAB-1234", licensePlate, setLicensePlate, false, "default", { autoCapitalize: 'characters' })}
                <Text style={styles.fieldLabel}>Driving licence number</Text>
                {renderField("licenseNumber", "e.g. B1234567", licenseNumber, setLicenseNumber, false, "default", { autoCapitalize: 'characters' })}
                <Text style={styles.roleHint}>CEYLO checks your details before you can accept rides. You will be notified when your account is approved.</Text>
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
                <Text style={styles.registerBtnText}>{i18n.t('ui_create_account')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t('ui_already_have_an_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>{i18n.t('ui_login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoider>
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
  roleHint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7A6B', marginTop: -6, marginBottom: 14 },

  extraFields: { gap: 0 },

  registerBtn: { backgroundColor: '#006A3B', borderRadius: 16, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  registerBtnText: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#FFF' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },
  footerLink: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#006A3B' },
});
