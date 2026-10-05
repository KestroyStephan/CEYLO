import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import KeyboardAvoider from '../../components/KeyboardAvoider';
import { startPhoneSignIn, verifyPhoneSignIn } from '../../services/aiClient';

const ACCENT = '#00695C';

/** FR-001: sign in or register with a phone number and a 6-digit SMS code. */
export default function PhoneLoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('phone');   // phone | code
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await startPhoneSignIn(phone);
      setSentTo(r.phone);
      setStep('code');
      setResendIn(60);
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    setBusy(true);
    try {
      const { token } = await verifyPhoneSignIn(sentTo, code);
      const cred = await signInWithCustomToken(auth, token);
      const ref = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // First sign-in with this number: create the traveller profile
        await setDoc(ref, {
          uid: cred.user.uid,
          name: name.trim() || 'Traveller',
          displayName: name.trim() || 'Traveller',
          phone: sentTo,
          phoneVerified: true,
          role: 'tourist',
          isOnboarded: false,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
      // App.js switches to the signed-in screens when the auth state changes
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => (step === 'code' ? setStep('phone') : navigation.goBack())} style={styles.back} accessibilityLabel="Go back">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1B2B28" />
          </TouchableOpacity>

          <View style={styles.icon}>
            <MaterialCommunityIcons name={step === 'phone' ? 'cellphone-message' : 'shield-key-outline'} size={32} color={ACCENT} />
          </View>
          <Text style={styles.title}>{step === 'phone' ? 'Continue with your phone' : 'Enter the code'}</Text>
          <Text style={styles.sub}>
            {step === 'phone'
              ? 'We will text you a 6-digit code. New numbers get a traveller account.'
              : `We sent a code to ${sentTo}. It expires in 5 minutes.`}
          </Text>

          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="077 123 4567 or +44 7700 900123"
                placeholderTextColor="#8A9A96"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                accessibilityLabel="Mobile number"
              />
              <Text style={styles.label}>Your name (for new accounts)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Optional"
                placeholderTextColor="#8A9A96"
                autoComplete="name"
                accessibilityLabel="Your name"
              />
            </>
          ) : (
            <>
              <TextInput
                ref={codeRef}
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                placeholderTextColor="#B0BEC5"
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                accessibilityLabel="Six digit code"
              />
              <TouchableOpacity onPress={sendCode} disabled={resendIn > 0 || busy} style={styles.resend}>
                <Text style={[styles.resendText, resendIn > 0 && { color: '#8A9A96' }]}>
                  {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B3261E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (busy || (step === 'phone' ? phone.replace(/\D/g, '').length < 9 : code.length !== 6)) && styles.buttonOff]}
            onPress={step === 'phone' ? sendCode : verify}
            disabled={busy || (step === 'phone' ? phone.replace(/\D/g, '').length < 9 : code.length !== 6)}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{step === 'phone' ? 'Send code' : 'Verify and continue'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6FBF5' },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  back: { paddingVertical: 12, alignSelf: 'flex-start' },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  title: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#1B2B28', marginTop: 18 },
  sub: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#4A5A56', marginTop: 6, lineHeight: 21 },
  label: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 22, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D6E2DF', borderRadius: 14, paddingHorizontal: 16, height: 54, fontSize: 17, fontFamily: 'Outfit-Medium', color: '#1B2B28' },
  codeInput: { marginTop: 28, textAlign: 'center', fontSize: 28, letterSpacing: 10, height: 64 },
  resend: { alignSelf: 'center', padding: 12, marginTop: 4 },
  resendText: { color: ACCENT, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FDECEA', borderRadius: 12, padding: 12, marginTop: 18 },
  errorText: { flex: 1, color: '#B3261E', fontFamily: 'Outfit-Medium', fontSize: 14 },
  button: { backgroundColor: ACCENT, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  buttonOff: { backgroundColor: '#9DB8B3' },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit-Bold' },
});
