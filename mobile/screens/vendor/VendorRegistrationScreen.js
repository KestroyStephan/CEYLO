import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Animated,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');

const BUSINESS_TYPES = [
  'Homestay', 'Tour Guide', 'Transport', 'Food & Beverage',
  'Artisan', 'Equipment Rental',
];

const STEPS = ['Business Info', 'Documents', 'First Service'];
const STEP_ICONS = ['≡ƒÅó', '≡ƒôä', 'Γ¡É'];

export default function VendorRegistrationScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0, 1, 2

  // Step 1 fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Step 2 fields
  const [nicFront, setNicFront] = useState(null);
  const [nicBack, setNicBack] = useState(null);
  const [businessCert, setBusinessCert] = useState(null);
  const [servicePhotos, setServicePhotos] = useState([]); // max 3
  const [uploadProgress, setUploadProgress] = useState(0); // 0ΓÇô1
  const [uploadedUrls, setUploadedUrls] = useState({});

  // Step 3 fields
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceCapacity, setServiceCapacity] = useState('');
  const [ecoCertified, setEcoCertified] = useState(false);

  const [loading, setLoading] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ΓöÇΓöÇ GPS Auto-fill ΓöÇΓöÇ
  const autoFillGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed for GPS auto-fill.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo?.length > 0) {
        const g = geo[0];
        const formatted = [g.name, g.street, g.city, g.region].filter(Boolean).join(', ');
        setAddress(formatted);
      }
    } catch (e) {
      Alert.alert('GPS Error', e.message);
    } finally {
      setGpsLoading(false);
    }
  };

  // ΓöÇΓöÇ Image Picker ΓöÇΓöÇ
  const pickImage = async (setter, aspect = [3, 2]) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect, quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) setter(result.assets[0]);
  };

  const addServicePhoto = async () => {
    if (servicePhotos.length >= 3) { Alert.alert('Max 3 photos'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setServicePhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  // ΓöÇΓöÇ Upload single image ΓöÇΓöÇ
  const uploadImage = async (asset, path) => {
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // ΓöÇΓöÇ Animate progress bar ΓöÇΓöÇ
  const animateProgress = (value) => {
    Animated.timing(progressAnim, {
      toValue: value, duration: 300, useNativeDriver: false,
    }).start();
    setUploadProgress(value);
  };

  // ΓöÇΓöÇ Step validation ΓöÇΓöÇ
  const validateStep1 = () => {
    if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return false; }
    if (!phone.trim()) { Alert.alert('Required', 'Please enter your phone number.'); return false; }
    if (!address.trim()) { Alert.alert('Required', 'Please enter your address.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!nicFront) { Alert.alert('Required', 'Please upload NIC front photo.'); return false; }
    if (!nicBack) { Alert.alert('Required', 'Please upload NIC back photo.'); return false; }
    if (!businessCert) { Alert.alert('Required', 'Please upload your business certificate.'); return false; }
    return true;
  };

  // ΓöÇΓöÇ Step 2 ΓåÆ upload all documents ΓöÇΓöÇ
  const handleStep2Upload = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    animateProgress(0);
    const uid = auth.currentUser.uid;
    const urls = {};

    try {
      const tasks = [
        { asset: nicFront, path: `vendors/${uid}/docs/nic_front.jpg`, key: 'nicFront' },
        { asset: nicBack, path: `vendors/${uid}/docs/nic_back.jpg`, key: 'nicBack' },
        { asset: businessCert, path: `vendors/${uid}/docs/business_cert.jpg`, key: 'businessCert' },
        ...servicePhotos.map((p, i) => ({
          asset: p, path: `vendors/${uid}/docs/service_${i}.jpg`, key: `servicePhoto_${i}`,
        })),
      ];

      for (let i = 0; i < tasks.length; i++) {
        urls[tasks[i].key] = await uploadImage(tasks[i].asset, tasks[i].path);
        animateProgress((i + 1) / tasks.length);
      }

      setUploadedUrls(urls);
      setStep(2);
    } catch (e) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ΓöÇΓöÇ Final submission ΓöÇΓöÇ
  const handleFinalSubmit = async () => {
    if (!serviceName.trim() || !servicePrice.trim()) {
      Alert.alert('Required', 'Please enter service name and price.');
      return;
    }
    setLoading(true);
    const uid = auth.currentUser.uid;
    try {
      // Create vendor document
      await setDoc(doc(db, 'vendors', uid), {
        businessName: businessName.trim(),
        businessType,
        phone: phone.trim(),
        address: address.trim(),
        docUrls: uploadedUrls,
        status: 'pending_verification',
        busy: false,
        onlineStatus: 'offline',
        createdAt: serverTimestamp(),
      });

      // Create first service
      await addDoc(collection(db, 'vendors', uid, 'services'), {
        name: serviceName.trim(),
        description: serviceDesc.trim(),
        price: parseFloat(servicePrice) || 0,
        duration: parseInt(serviceDuration, 10) || 60,
        maxCapacity: parseInt(serviceCapacity, 10) || 1,
        ecoCertified,
        available: true,
        photoUrl: uploadedUrls.servicePhoto_0 || null,
        createdAt: serverTimestamp(),
      });

      // Update user role
      await updateDoc(doc(db, 'users', uid), { role: 'vendor_pending' });

      navigation.replace('VendorPending');
    } catch (e) {
      Alert.alert('Submission Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  // ΓöÇΓöÇ Step progress indicator ΓöÇΓöÇ
  const renderStepBar = () => (
    <View style={styles.stepBar}>
      {STEPS.map((label, idx) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, idx <= step && styles.stepCircleActive, idx < step && styles.stepCircleDone]}>
              {idx < step
                ? <Text style={styles.stepCheckmark}>Γ£ô</Text>
                : <Text style={[styles.stepIcon, idx === step && styles.stepIconActive]}>{STEP_ICONS[idx]}</Text>}
            </View>
            <Text style={[styles.stepLabel, idx === step && styles.stepLabelActive]}>{label}</Text>
          </View>
          {idx < STEPS.length - 1 && (
            <View style={[styles.stepConnector, idx < step && styles.stepConnectorActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // ΓöÇΓöÇ STEP 1 ΓöÇΓöÇ
  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Business Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about your business</Text>

      <Text style={styles.label}>Business Name *</Text>
      <TextInput
        style={styles.input} placeholder="e.g. Kandy Eco Homestay"
        placeholderTextColor="#9ca3af" value={businessName} onChangeText={setBusinessName}
      />

      <Text style={styles.label}>Business Type *</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={businessType} onValueChange={setBusinessType} style={styles.picker}>
          {BUSINESS_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input} placeholder="+94 77 123 4567"
        placeholderTextColor="#9ca3af" keyboardType="phone-pad"
        value={phone} onChangeText={setPhone}
      />

      <Text style={styles.label}>Business Address *</Text>
      <View style={styles.addressRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Street, City, Province"
          placeholderTextColor="#9ca3af" multiline numberOfLines={2}
          value={address} onChangeText={setAddress}
        />
        <TouchableOpacity style={styles.gpsBtn} onPress={autoFillGPS} disabled={gpsLoading}>
          {gpsLoading
            ? <ActivityIndicator size="small" color="#059669" />
            : <><Text style={styles.gpsBtnIcon}>≡ƒôì</Text><Text style={styles.gpsBtnText}>GPS</Text></>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => validateStep1() && setStep(1)}
      >
        <Text style={styles.nextBtnText}>Next: Documents ΓåÆ</Text>
      </TouchableOpacity>
    </View>
  );

  // ΓöÇΓöÇ STEP 2 ΓöÇΓöÇ
  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Document Upload</Text>
      <Text style={styles.stepSubtitle}>Upload required verification documents</Text>

      {/* Upload items */}
      {[
        { label: 'NIC ΓÇö Front *', state: nicFront, setter: setNicFront },
        { label: 'NIC ΓÇö Back *', state: nicBack, setter: setNicBack },
        { label: 'Business Certificate *', state: businessCert, setter: setBusinessCert },
      ].map(({ label, state, setter }) => (
        <View key={label}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setter)}>
            <Text style={styles.uploadBtnText}>
              {state ? 'Γ£à Uploaded ΓÇö Tap to change' : '≡ƒôÄ Tap to upload'}
            </Text>
          </TouchableOpacity>
          {state && <Image source={{ uri: state.uri }} style={styles.docPreview} />}
        </View>
      ))}

      {/* Service photos */}
      <Text style={styles.label}>Service Photos (optional, max 3)</Text>
      <View style={styles.photoRow}>
        {servicePhotos.map((p, i) => (
          <View key={i} style={styles.servicePhotoThumb}>
            <Image source={{ uri: p.uri }} style={styles.servicePhotoImg} />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setServicePhotos((prev) => prev.filter((_, j) => j !== i))}
            >
              <Text style={styles.removePhotoText}>Γ£ò</Text>
            </TouchableOpacity>
          </View>
        ))}
        {servicePhotos.length < 3 && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={addServicePhoto}>
            <Text style={styles.addPhotoBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {loading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Uploading... {Math.round(uploadProgress * 100)}%</Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
          </View>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
          <Text style={styles.backBtnText}>ΓåÉ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1, marginLeft: 10 }, loading && styles.disabled]}
          onPress={handleStep2Upload} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>Upload & Continue ΓåÆ</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ΓöÇΓöÇ STEP 3 ΓöÇΓöÇ
  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Your First Service</Text>
      <Text style={styles.stepSubtitle}>Add a service to attract your first booking</Text>

      <Text style={styles.label}>Service Name *</Text>
      <TextInput style={styles.input} placeholder="e.g. Traditional Cooking Class"
        placeholderTextColor="#9ca3af" value={serviceName} onChangeText={setServiceName} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]}
        placeholder="What makes your service special..."
        placeholderTextColor="#9ca3af" multiline numberOfLines={3}
        value={serviceDesc} onChangeText={setServiceDesc} />

      <View style={styles.rowFields}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Price (LKR) *</Text>
          <TextInput style={styles.input} placeholder="e.g. 2500"
            placeholderTextColor="#9ca3af" keyboardType="numeric"
            value={servicePrice} onChangeText={setServicePrice} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Duration (min)</Text>
          <TextInput style={styles.input} placeholder="e.g. 90"
            placeholderTextColor="#9ca3af" keyboardType="numeric"
            value={serviceDuration} onChangeText={setServiceDuration} />
        </View>
      </View>

      <Text style={styles.label}>Max Capacity (guests)</Text>
      <TextInput style={styles.input} placeholder="e.g. 4"
        placeholderTextColor="#9ca3af" keyboardType="numeric"
        value={serviceCapacity} onChangeText={setServiceCapacity} />

      {/* Eco certified toggle */}
      <TouchableOpacity
        style={[styles.ecoToggle, ecoCertified && styles.ecoToggleActive]}
        onPress={() => setEcoCertified(!ecoCertified)}
      >
        <Text style={styles.ecoToggleText}>
          {ecoCertified ? '≡ƒî┐ Eco-Certified Γ£ô' : '≡ƒî┐ Mark as Eco-Certified'}
        </Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Text style={styles.backBtnText}>ΓåÉ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleFinalSubmit} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>Submit Application ≡ƒÜÇ</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#064e3b', '#059669']} style={styles.header}>
        <Text style={styles.headerTitle}>Vendor Registration</Text>
        <Text style={styles.headerSubtitle}>Join CEYLO as a verified eco-vendor</Text>
      </LinearGradient>

      {renderStepBar()}

      {step === 0 && renderStep1()}
      {step === 1 && renderStep2()}
      {step === 2 && renderStep3()}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { paddingBottom: 40 },
  header: { padding: 32, paddingTop: 56, paddingBottom: 32 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#a7f3d0', marginTop: 4 },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 20, paddingBottom: 8,
  },
  stepItem: { alignItems: 'center', width: 70 },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: '#d1fae5', borderWidth: 2, borderColor: '#059669' },
  stepCircleDone: { backgroundColor: '#059669' },
  stepIcon: { fontSize: 18 },
  stepIconActive: {},
  stepCheckmark: { fontSize: 20, color: '#fff', fontWeight: '800' },
  stepLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: '#059669' },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginBottom: 22 },
  stepConnectorActive: { backgroundColor: '#059669' },

  card: {
    margin: 20, marginTop: 8, backgroundColor: '#fff', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#064e3b', marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9fafb',
  },
  picker: { height: 50, color: '#111827' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gpsBtn: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#059669',
    borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center',
    width: 60, minHeight: 48,
  },
  gpsBtnIcon: { fontSize: 18 },
  gpsBtnText: { fontSize: 10, color: '#059669', fontWeight: '700' },

  uploadBtn: {
    borderWidth: 2, borderColor: '#059669', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  uploadBtnText: { color: '#059669', fontWeight: '600', fontSize: 14 },
  docPreview: { width: '100%', height: 120, borderRadius: 10, marginTop: 8, resizeMode: 'cover' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  servicePhotoThumb: { width: 80, height: 80, borderRadius: 10, position: 'relative' },
  servicePhotoImg: { width: 80, height: 80, borderRadius: 10, resizeMode: 'cover' },
  removePhoto: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#dc2626', borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 2,
    borderColor: '#059669', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },

  progressContainer: { marginTop: 16 },
  progressLabel: { fontSize: 13, color: '#059669', fontWeight: '600', marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: '#059669', borderRadius: 4 },

  rowFields: { flexDirection: 'row' },
  ecoToggle: {
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12, backgroundColor: '#f9fafb',
  },
  ecoToggleActive: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  ecoToggleText: { fontWeight: '700', color: '#374151', fontSize: 14 },

  btnRow: { flexDirection: 'row', marginTop: 20 },
  backBtn: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center',
  },
  backBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  nextBtn: {
    backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.3, elevation: 4, flex: 1,
  },
  submitBtn: {
    backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.3, elevation: 4, flex: 1, marginLeft: 10,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
