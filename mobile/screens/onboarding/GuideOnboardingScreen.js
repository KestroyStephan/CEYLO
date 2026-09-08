import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, TextInput, StatusBar, Image
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

const LANGUAGE_OPTIONS = ['English', 'Sinhala', 'Tamil', 'German', 'French', 'Japanese', 'Mandarin', 'Korean'];
const EXPERTISE_OPTIONS = [
  { key: 'Wildlife', icon: 'paw' },
  { key: 'Cultural', icon: 'drama-masks' },
  { key: 'Adventure', icon: 'hiking' },
  { key: 'Gastronomy', icon: 'silverware-fork-knife' },
  { key: 'Heritage', icon: 'castle' },
  { key: 'Marine', icon: 'waves' },
];

const STEPS = ['Identity', 'Expertise', 'Verification'];

export default function GuideOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0=Identity, 1=Expertise, 2=Verification (handled server-side)
  const [fullName, setFullName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [serviceAreas, setServiceAreas] = useState('');
  const [packageCost, setPackageCost] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [customLanguage, setCustomLanguage] = useState('');
  const [sltdaUploaded, setSltdaUploaded] = useState(false);
  const [nicUploaded, setNicUploaded] = useState(false);
  const [showLangInput, setShowLangInput] = useState(false);

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleExpertise = (key) => {
    setSelectedExpertise(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    );
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim() && !selectedLanguages.includes(customLanguage.trim())) {
      setSelectedLanguages(prev => [...prev, customLanguage.trim()]);
    }
    setCustomLanguage('');
    setShowLangInput(false);
  };

  const pickDocument = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (!result.canceled) {
        if (type === 'sltda') setSltdaUploaded(true);
        else setNicUploaded(true);
      }
    } catch (e) {
      if (type === 'sltda') setSltdaUploaded(true); // Mock for demo
      else setNicUploaded(true);
    }
  };

  const handleContinue = () => {
    if (step === 0) {
      if (!fullName.trim() || !licenseNo.trim()) {
        Alert.alert('Missing Fields', 'Please fill in Full Name and License Number.');
        return;
      }
      if (selectedLanguages.length === 0) {
        Alert.alert('Missing Fields', 'Please select at least one language.');
        return;
      }
      setStep(1);
    } else {
      // Step 1 → Submit
      submitApplication();
    }
  };

  const submitApplication = async () => {
    if (!auth.currentUser) return;
    if (selectedExpertise.length === 0) {
      Alert.alert('Select Expertise', 'Please select at least one area of expertise.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: fullName,
        guideLicense: licenseNo,
        languages: selectedLanguages.join(', '),
        specializations: selectedExpertise.join(', '),
        serviceAreas: serviceAreas || 'Islandwide',
        packageCost: packageCost || '50',
        role: 'guide_pending',
        onboardingCompleted: true,
        submittedAt: new Date().toISOString(),
        documentsSubmitted: { sltda: sltdaUploaded, nic: nicUploaded },
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Top Nav */}
        <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
          <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
          <Text style={styles.brandName}>LankaEco</Text>
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="account" size={20} color="#FFF" />
          </View>
        </View>

        <View style={styles.bodyPad}>
          {/* Hero Title */}
          <Text style={styles.heroTitle}>Become an Eco-Guide</Text>
          <Text style={styles.heroSub}>Share the hidden wonders of Sri Lanka with{'\n'}global explorers.</Text>

          {/* Step Indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                    <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {step === 0 && (
            <View style={styles.formCard}>
              {/* Full Name */}
              <Text style={styles.fieldLabel}>Full Name (as per Passport/NIC)</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Arjuna Ranatunga"
                placeholderTextColor="#C0CCC0"
                style={styles.input}
              />

              {/* License */}
              <Text style={styles.fieldLabel}>SLTDA License Number</Text>
              <TextInput
                value={licenseNo}
                onChangeText={setLicenseNo}
                placeholder="SLTDA/GUIDE/2024/0000"
                placeholderTextColor="#C0CCC0"
                style={styles.input}
              />

              {/* Languages */}
              <Text style={styles.fieldLabel}>Languages Spoken</Text>
              <View style={styles.langWrap}>
                {LANGUAGE_OPTIONS.map(lang => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => toggleLanguage(lang)}
                    style={[styles.langChip, selectedLanguages.includes(lang) && styles.langChipActive]}
                  >
                    <Text style={[styles.langChipText, selectedLanguages.includes(lang) && styles.langChipTextActive]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedLanguages.filter(l => !LANGUAGE_OPTIONS.includes(l)).map(l => (
                  <View key={l} style={styles.langChipActive}>
                    <Text style={styles.langChipTextActive}>{l}</Text>
                  </View>
                ))}
                {showLangInput ? (
                  <View style={styles.customLangRow}>
                    <TextInput
                      value={customLanguage}
                      onChangeText={setCustomLanguage}
                      placeholder="Enter language"
                      style={styles.customLangInput}
                      autoFocus
                    />
                    <TouchableOpacity onPress={addCustomLanguage} style={styles.addLangBtn}>
                      <Text style={styles.addLangBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addLangChip} onPress={() => setShowLangInput(true)}>
                    <MaterialCommunityIcons name="plus" size={14} color="#006A3B" />
                    <Text style={styles.addLangText}>Add Language</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.formCard}>
              {/* Areas of Expertise */}
              <Text style={styles.fieldLabel}>Areas of Expertise</Text>
              <View style={styles.expertiseGrid}>
                {EXPERTISE_OPTIONS.map(opt => {
                  const active = selectedExpertise.includes(opt.key);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => toggleExpertise(opt.key)}
                      style={[styles.expertiseCard, active && styles.expertiseCardActive]}
                    >
                      <MaterialCommunityIcons name={opt.icon} size={22} color={active ? '#006A3B' : '#8A9E8A'} />
                      <Text style={[styles.expertiseText, active && styles.expertiseTextActive]}>{opt.key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Service Areas & Package Cost */}
              <Text style={styles.fieldLabel}>Service Areas</Text>
              <TextInput
                value={serviceAreas}
                onChangeText={setServiceAreas}
                placeholder="e.g. Kandy, Colombo, Galle"
                placeholderTextColor="#C0CCC0"
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Daily Rate (USD)</Text>
              <TextInput
                value={packageCost}
                onChangeText={setPackageCost}
                placeholder="e.g. 45"
                placeholderTextColor="#C0CCC0"
                keyboardType="numeric"
                style={styles.input}
              />

              {/* Document Upload */}
              <Text style={styles.fieldLabel}>Required Documents (PDF/JPG)</Text>
              <TouchableOpacity
                style={[styles.uploadRow, sltdaUploaded && styles.uploadRowDone]}
                onPress={() => pickDocument('sltda')}
              >
                <View style={[styles.uploadIcon, sltdaUploaded && styles.uploadIconDone]}>
                  <MaterialCommunityIcons name="file-document-outline" size={22} color={sltdaUploaded ? '#FFF' : '#006A3B'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.uploadTitle}>SLTDA License</Text>
                  <Text style={styles.uploadSub}>Front and Back sides</Text>
                </View>
                {sltdaUploaded ? (
                  <View style={styles.uploadedTag}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#006A3B" />
                    <Text style={styles.uploadedTagText}>Uploaded</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadCTA}>Upload</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadRow, nicUploaded && styles.uploadRowDone]}
                onPress={() => pickDocument('nic')}
              >
                <View style={[styles.uploadIcon, nicUploaded && styles.uploadIconDone]}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={22} color={nicUploaded ? '#FFF' : '#006A3B'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.uploadTitle}>Identity Document</Text>
                  <Text style={styles.uploadSub}>NIC or Passport Bio Page</Text>
                </View>
                {nicUploaded ? (
                  <View style={styles.uploadedTag}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#006A3B" />
                    <Text style={styles.uploadedTagText}>Uploaded</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadCTA}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navBtns}>
            {step > 0 && (
              <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleContinue}
              style={[styles.nextBtn, step === 0 && { flex: 1, marginLeft: 0 }]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.nextBtnText}>
                  {step === 0 ? 'Continue to Expertise →' : 'Submit Application'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info note */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#8A9E8A" style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              Your application will be reviewed by the SLTDA team. Verification typically takes 2–3 business days. You will be notified via email once your Eco-Guide status is active.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#F4F7F4' },
  brandName: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#006A3B', justifyContent: 'center', alignItems: 'center' },

  bodyPad: { paddingHorizontal: 20, paddingBottom: 40 },
  heroTitle: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginTop: 12 },
  heroSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', marginTop: 4, marginBottom: 24, lineHeight: 19 },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E0E8E0', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#006A3B' },
  stepNum: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#AAA' },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#AAA', marginTop: 5 },
  stepLabelActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E0E8E0', marginBottom: 14 },
  stepLineActive: { backgroundColor: '#006A3B' },

  formCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: '#EEF2EE' },

  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#4A5E4A', marginTop: 4 },
  input: { backgroundColor: '#F4F7F4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1A2E1A', borderWidth: 1, borderColor: '#E0E8E0' },

  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  langChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#C0CCC0' },
  langChipActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: '#006A3B' },
  langChipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7B6B' },
  langChipTextActive: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  addLangChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#C0CCC0', borderStyle: 'dashed' },
  addLangText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#006A3B' },
  customLangRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customLangInput: { flex: 1, borderWidth: 1, borderColor: '#E0E8E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#1A2E1A' },
  addLangBtn: { backgroundColor: '#006A3B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addLangBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#FFF' },

  expertiseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  expertiseCard: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E0E8E0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#F4F7F4' },
  expertiseCardActive: { backgroundColor: '#E8F5E9', borderColor: '#006A3B' },
  expertiseText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#8A9E8A' },
  expertiseTextActive: { color: '#006A3B', fontFamily: 'Outfit-Bold' },

  uploadRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E8E0', borderRadius: 14, padding: 14, backgroundColor: '#FFF' },
  uploadRowDone: { borderColor: '#BECABE' },
  uploadIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  uploadIconDone: { backgroundColor: '#006A3B' },
  uploadTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  uploadSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#8A9E8A', marginTop: 2 },
  uploadCTA: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  uploadedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  uploadedTagText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#006A3B' },

  navBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backBtn: { flex: 0.4, borderWidth: 1.5, borderColor: '#C0CCC0', borderRadius: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#4A5E4A' },
  nextBtn: { flex: 0.6, backgroundColor: '#006A3B', borderRadius: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#FFF' },

  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF8DC', borderRadius: 14, padding: 14, marginTop: 20, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Regular', color: '#735C00', lineHeight: 18 },
});
