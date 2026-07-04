import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, ActivityIndicator, IconButton, SegmentedButtons, HelperText } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tourist');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Role specific fields
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const handleRegister = async () => {
    let newErrors = {};
    if (!name) newErrors.name = 'Full Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = 'Invalid email address';
    if (!phone) newErrors.phone = 'Phone Number is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (role === 'driver') {
      if (!vehicleType) newErrors.vehicleType = 'Vehicle Type is required';
      if (!licensePlate) newErrors.licensePlate = 'License Plate is required';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });

      const userData = {
        uid: user.uid,
        name,
        email,
        phone,
        role: role === 'guide' ? 'guide_pending' : role,
        createdAt: new Date().toISOString(),
        isOnboarded: false,
      };

      if (role === 'driver') {
        userData.vehicleType = vehicleType;
        userData.licensePlate = licensePlate;
      }

      await setDoc(doc(db, 'users', user.uid), userData);
      // Navigation happens via App.js
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} style={styles.backButton} iconColor="#00695C" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Ceylo and start your adventure</Text>
        </View>

        <Surface style={styles.formContainer} elevation={0}>
          <TextInput label="Full Name" value={name} onChangeText={setName} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" left={<TextInput.Icon icon="account-outline" color="#00695C" />} error={!!errors.name} />
          <HelperText type="error" visible={!!errors.name} style={styles.errorText}>{errors.name}</HelperText>

          <TextInput label="Email" value={email} onChangeText={setEmail} mode="flat" keyboardType="email-address" autoCapitalize="none" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" left={<TextInput.Icon icon="email-outline" color="#00695C" />} error={!!errors.email} />
          <HelperText type="error" visible={!!errors.email} style={styles.errorText}>{errors.email}</HelperText>

          <TextInput label="Phone Number" value={phone} onChangeText={setPhone} mode="flat" keyboardType="phone-pad" placeholder="+94 XX XXX XXXX" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" left={<TextInput.Icon icon="phone-outline" color="#00695C" />} error={!!errors.phone} />
          <HelperText type="error" visible={!!errors.phone} style={styles.errorText}>{errors.phone}</HelperText>

          <TextInput label="Password" value={password} onChangeText={setPassword} mode="flat" secureTextEntry={!showPassword} style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" left={<TextInput.Icon icon="lock-outline" color="#00695C" />} right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />} error={!!errors.password} />
          <HelperText type="error" visible={!!errors.password} style={styles.errorText}>{errors.password}</HelperText>

          <Text style={styles.sectionLabel}>Select Your Role</Text>
          <SegmentedButtons
            value={role}
            onValueChange={setRole}
            buttons={[
              { value: 'tourist', label: 'Tourist', icon: 'map-marker' },
              { value: 'driver', label: 'Driver', icon: 'car' },
              { value: 'guide', label: 'Guide', icon: 'account-voice' },
              { value: 'vendor_onboarding', label: 'Vendor', icon: 'store' },
            ]}
            style={styles.rolePicker}
            theme={{ colors: { secondaryContainer: '#E0F2F1', onSecondaryContainer: '#00695C' } }}
          />

          {role === 'driver' && (
            <View style={styles.extraFields}>
              <TextInput label="Vehicle Type" value={vehicleType} onChangeText={setVehicleType} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" error={!!errors.vehicleType} />
              <HelperText type="error" visible={!!errors.vehicleType} style={styles.errorText}>{errors.vehicleType}</HelperText>

              <TextInput label="License Plate" value={licensePlate} onChangeText={setLicensePlate} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" error={!!errors.licensePlate} />
              <HelperText type="error" visible={!!errors.licensePlate} style={styles.errorText}>{errors.licensePlate}</HelperText>
            </View>
          )}

          {/* Guide License removed; collected during onboarding */}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {t('register')}
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
  header: { marginBottom: 20 },
  backButton: { marginLeft: -10, marginBottom: 5 },
  title: { fontSize: 32, fontFamily: 'Outfit-Bold', color: '#00695C' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 5 },
  formContainer: { backgroundColor: 'transparent', gap: 0 },
  input: { backgroundColor: '#FFF', borderRadius: 15, borderTopLeftRadius: 15, borderTopRightRadius: 15, height: 60 },
  errorText: { fontFamily: 'Outfit-Regular', marginTop: -2, marginBottom: 8 },
  sectionLabel: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#333', marginTop: 10, marginBottom: 10 },
  rolePicker: { marginBottom: 15 },
  extraFields: { gap: 0 },
  registerButton: { marginTop: 20, borderRadius: 15, backgroundColor: '#00695C' },
  buttonContent: { height: 55 },
  buttonLabel: { fontFamily: 'Outfit-SemiBold', fontSize: 16, letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, marginBottom: 40 },
  footerText: { fontFamily: 'Outfit-Regular', color: '#666' },
  loginLink: { fontFamily: 'Outfit-Bold', color: '#00695C' },
});
