import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { Text } from 'react-native-paper';
import { auth, db, storage } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#00695C',
  dark: '#004D40',
  bg: '#F4F9F4',
  white: '#FFFFFF',
  text: '#1A2E1A',
  sub: '#6B7B6B',
  border: '#E0EBE0',
  green: '#006A3B',
};

const GUIDE_SPECIALIZATIONS = [
  'Heritage Tour', 'Wildlife Trek', 'Tea Experience',
  'Marine Dive', 'Adventure', 'Cultural', 'Eco Tour',
];

const FIELD = ({ label, icon, value, onChangeText, placeholder, multiline, keyboardType }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, multiline && { height: 110, alignItems: 'flex-start' }]}>
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={styles.fieldIcon} />
      <TextInput
        style={[styles.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AAB8AA"
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  </View>
);

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [role, setRole] = useState('tourist');

  // Shared fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [photoURL, setPhotoURL] = useState(null);

  // Guide-specific fields
  const [specialization, setSpecialization] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [languages, setLanguages] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [certifications, setCertifications] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || 'tourist');
        setDisplayName(data.displayName || user.displayName || '');
        setBio(data.bio || '');
        setPhone(data.phone || '');
        setLocation(data.location || '');
        setPhotoURL(data.photoUrl || user.photoURL || null);
        // Guide fields
        setSpecialization(data.specialization || '');
        setYearsExp(data.yearsOfExperience?.toString() || '');
        setLanguages(Array.isArray(data.languages) ? data.languages.join(', ') : (typeof data.languages === 'string' ? data.languages : ''));
        setDailyRate(data.dailyRate?.toString() || '');
        setCertifications(data.certifications || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setPhotoURL(result.assets[0].uri);
    }
  };

  // Upload a local image to Firebase Storage, return the download URL
  const uploadImageToStorage = async (localUri) => {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
    const storageRef = ref(storage, `profile_photos/${user.uid}.${ext}`);
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Your name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const isLocalFile = photoURL && (photoURL.startsWith('file://') || photoURL.startsWith('/'));
      
      // If a new local photo was picked, upload it to Firebase Storage first
      let finalPhotoURL = photoURL;
      if (isLocalFile) {
        finalPhotoURL = await uploadImageToStorage(photoURL);
        // Update state so the UI immediately shows the uploaded photo
        setPhotoURL(finalPhotoURL);
      }

      const updateData = {
        displayName: displayName.trim(),
        name: displayName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        location: location.trim(),
        photoUrl: finalPhotoURL || null,
        updatedAt: new Date().toISOString(),
      };

      if (role === 'guide') {
        updateData.specialization = specialization;
        updateData.yearsOfExperience = Number(yearsExp) || 0;
        updateData.languages = languages.split(',').map(l => l.trim()).filter(Boolean);
        updateData.dailyRate = Number(dailyRate) || 0;
        updateData.certifications = certifications.trim();
      }

      // Save all fields to Firestore (using setDoc with merge: true so it creates it if missing)
      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });

      // Update Firebase Auth display name & photo so it appears in auth.currentUser
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL || null,
      });

      Alert.alert('Profile Updated ✅', 'Your profile has been saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Save Failed', e.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isGuide = role === 'guide';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { backgroundColor: '#80BCAC' }]}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {uploadProgress > 0 && uploadProgress < 100 ? `${uploadProgress}%` : 'Saving...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Section */}
          <LinearGradient
            colors={[COLORS.dark, COLORS.primary]}
            style={styles.photoBanner}
          >
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={50} color="#AAA" />
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <MaterialCommunityIcons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to change photo</Text>
            {isGuide && (
              <View style={styles.roleBadge}>
                <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.primary} />
                <Text style={styles.roleBadgeText}>Verified Guide</Text>
              </View>
            )}
          </LinearGradient>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="account-outline" size={16} color={COLORS.primary} /> Personal Info
            </Text>

            <FIELD
              label="Full Name"
              icon="account-outline"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Kasun Perera"
            />
            <FIELD
              label="Bio"
              icon="text-box-outline"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others a little about yourself..."
              multiline
            />
            <FIELD
              label="Phone Number"
              icon="phone-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="+94 77 123 4567"
              keyboardType="phone-pad"
            />
            <FIELD
              label="Location / City"
              icon="map-marker-outline"
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Kandy, Sri Lanka"
            />
          </View>

          {/* Guide-Only Section */}
          {isGuide && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="briefcase-outline" size={16} color={COLORS.primary} /> Guide Details
              </Text>

              <Text style={styles.label}>Specialization</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {GUIDE_SPECIALIZATIONS.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.chip, specialization === spec && styles.chipActive]}
                    onPress={() => setSpecialization(spec)}
                  >
                    <Text style={[styles.chipText, specialization === spec && styles.chipTextActive]}>
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FIELD
                label="Years of Experience"
                icon="calendar-clock"
                value={yearsExp}
                onChangeText={setYearsExp}
                placeholder="e.g. 5"
                keyboardType="numeric"
              />
              <FIELD
                label="Languages (comma separated)"
                icon="translate"
                value={languages}
                onChangeText={setLanguages}
                placeholder="e.g. English, Sinhala, Tamil"
              />
              <FIELD
                label="Daily Rate (LKR)"
                icon="cash-multiple"
                value={dailyRate}
                onChangeText={setDailyRate}
                placeholder="e.g. 8000"
                keyboardType="numeric"
              />
              <FIELD
                label="Certifications / Training"
                icon="certificate-outline"
                value={certifications}
                onChangeText={setCertifications}
                placeholder="e.g. SLTDA Licensed, First Aid Certified"
                multiline
              />
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 14 },

  scrollContent: { paddingBottom: 60 },

  photoBanner: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  photoHint: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  roleBadgeText: { color: COLORS.primary, fontFamily: 'Outfit-Bold', fontSize: 12 },

  section: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: COLORS.text,
    marginBottom: 20,
  },

  fieldWrapper: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: COLORS.sub, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  fieldIcon: { marginRight: 10, marginTop: 2 },
  input: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 13,
  },

  chipRow: { gap: 10, paddingBottom: 15, marginBottom: 5 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: 'Outfit-Medium', fontSize: 13, color: COLORS.sub },
  chipTextActive: { color: '#FFF' },
});
