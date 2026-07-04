import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, HelperText } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export default function GuideOnboardingScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nic: '',
    guideLicense: '',
    experience: '',
    languages: '',
    specializations: '',
    serviceAreas: '',
    packageCost: '',
    bankDetails: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const submitOnboarding = async () => {
    let newErrors = {};
    if (!formData.nic) newErrors.nic = 'Required';
    if (!formData.guideLicense) newErrors.guideLicense = 'Required';
    if (!formData.experience) newErrors.experience = 'Required';
    if (!formData.languages) newErrors.languages = 'Required';
    if (!formData.packageCost) newErrors.packageCost = 'Required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        role: 'guide_pending', // Ensures it stays pending until admin approval
        onboardingCompleted: true,
        submittedAt: new Date().toISOString()
      });

      Alert.alert("Success", "Your application has been submitted for admin review.");
      // The role is still guide_pending, so App.js will route them to VendorPendingScreen
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Guide Profile Setup</Text>
          <Text style={styles.subtitle}>Complete your profile to join the CEYLO network.</Text>
        </View>

        <Surface style={styles.formCard} elevation={0}>
          <TextInput label="NIC / Passport Number *" value={formData.nic} onChangeText={(t) => handleChange('nic', t)} mode="flat" style={styles.input} error={!!errors.nic} underlineColor="transparent" activeUnderlineColor="transparent" />
          
          <TextInput label="Official Guide License No. *" value={formData.guideLicense} onChangeText={(t) => handleChange('guideLicense', t)} mode="flat" style={styles.input} error={!!errors.guideLicense} underlineColor="transparent" activeUnderlineColor="transparent" />

          <TextInput label="Years of Experience *" value={formData.experience} keyboardType="numeric" onChangeText={(t) => handleChange('experience', t)} mode="flat" style={styles.input} error={!!errors.experience} underlineColor="transparent" activeUnderlineColor="transparent" />

          <TextInput label="Languages Spoken (e.g. English, German) *" value={formData.languages} onChangeText={(t) => handleChange('languages', t)} mode="flat" style={styles.input} error={!!errors.languages} underlineColor="transparent" activeUnderlineColor="transparent" />

          <TextInput label="Specializations (Wildlife, History, etc)" value={formData.specializations} onChangeText={(t) => handleChange('specializations', t)} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" />

          <TextInput label="Service Areas (e.g. Colombo, Galle)" value={formData.serviceAreas} onChangeText={(t) => handleChange('serviceAreas', t)} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" />

          <TextInput label="Standard Daily Package Cost (LKR) *" value={formData.packageCost} keyboardType="numeric" onChangeText={(t) => handleChange('packageCost', t)} mode="flat" style={styles.input} error={!!errors.packageCost} underlineColor="transparent" activeUnderlineColor="transparent" left={<TextInput.Icon icon="cash" />} />

          <TextInput label="Bank Details (Account No, Branch)" value={formData.bankDetails} onChangeText={(t) => handleChange('bankDetails', t)} mode="flat" style={styles.input} underlineColor="transparent" activeUnderlineColor="transparent" />

          <Button icon="cloud-upload" mode="outlined" style={styles.uploadBtn} textColor="#00695C">
            Upload Supporting Documents
          </Button>

          <Button mode="contained" onPress={submitOnboarding} loading={loading} style={styles.submitBtn} contentStyle={{ height: 55 }} labelStyle={{ fontFamily: 'Outfit-Bold', fontSize: 16 }}>
            Submit Application
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 25 },
  title: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#00695C' },
  subtitle: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 5 },
  formCard: { gap: 15, backgroundColor: 'transparent' },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12, height: 60 },
  uploadBtn: { marginTop: 10, borderRadius: 12, borderColor: '#00695C', paddingVertical: 5 },
  submitBtn: { marginTop: 20, borderRadius: 12, backgroundColor: '#00695C' }
});
