// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Animated,
  Dimensions, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');
const PRIMARY   = '#006A3B';
const SECONDARY = '#006A6A';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';
const ERROR     = '#BA1A1A';

const BUSINESS_TYPES = ['Homestay','Tour Guide','Transport','Food & Beverage','Artisan','Equipment Rental'];
const STEPS = ['Business Info','Documents','First Service'];

const uploadFile = async (uri, storagePath, onProgress) => {
  const res  = await fetch(uri);
  const blob = await res.blob();
  const r    = ref(storage, storagePath);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(r, blob);
    task.on('state_changed',
      snap => onProgress && onProgress(snap.bytesTransferred / snap.totalBytes),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });
};

export default function VendorRegistrationScreen({ navigation }) {
  const [step, setStep]             = useState(0);
  const [businessName, setBN]       = useState('');
  const [businessType, setBT]       = useState('');
  const [phone, setPhone]           = useState('');
  const [address, setAddress]       = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [nicFront,     setNicFront]     = useState(null);
  const [nicBack,      setNicBack]      = useState(null);
  const [bizCert,      setBizCert]      = useState(null);
  const [svcPhotos,    setSvcPhotos]    = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState({});

  const [svcName,  setSvcName]  = useState('');
  const [svcDesc,  setSvcDesc]  = useState('');
  const [svcPrice, setSvcPrice] = useState('');
  const [svcDur,   setSvcDur]   = useState('');
  const [svcCap,   setSvcCap]   = useState('');
  const [ecoOn,    setEcoOn]    = useState(false);
  const [loading,  setLoading]  = useState(false);

  const uid = auth.currentUser?.uid;

  const handleClose = () => {
    Alert.alert(
      "Exit Registration",
      "Are you sure you want to cancel registration and sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Exit", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          } 
        }
      ]
    );
  };

  const autoFillGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed','Location access required'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      if (geo?.length > 0) {
        const g = geo[0];
        setAddress([g.name, g.street, g.city, g.region].filter(Boolean).join(', '));
      }
    } catch (e) { Alert.alert('GPS Error', e.message); }
    finally { setGpsLoading(false); }
  };

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!r.canceled && r.assets?.length > 0) setter(r.assets[0]);
  };

  const uploadAllDocs = async () => {
    if (!nicFront || !nicBack || !bizCert) {
      Alert.alert('Required', 'Please upload NIC Front, Back, and Business Certificate.');
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const total = 3 + svcPhotos.length;
      let done = 0;
      const prog = () => { done++; setUploadPct(Math.round((done/total)*100)); };
      const nf  = await uploadFile(nicFront.uri,  `vendors/${uid}/nic_front.jpg`,   prog);
      const nb  = await uploadFile(nicBack.uri,   `vendors/${uid}/nic_back.jpg`,    prog);
      const bc  = await uploadFile(bizCert.uri,   `vendors/${uid}/biz_cert.jpg`,    prog);
      const sp  = [];
      for (let i = 0; i < svcPhotos.length; i++) {
        const u = await uploadFile(svcPhotos[i].uri, `vendors/${uid}/svc_${i}.jpg`, prog);
        sp.push(u);
      }
      setUploadedUrls({ nicFront: nf, nicBack: nb, bizCert: bc, svcPhotos: sp });
      setStep(2);
    } catch (e) { Alert.alert('Upload Error', e.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!svcName.trim() || !svcPrice.trim()) {
      Alert.alert('Required', 'Service name and price are required.'); return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const vendorData = {
        uid: user.uid,
        businessName: businessName,
        businessType: businessType,
        email: user.email,
        phone: phone,
        address: address,
        onlineStatus: 'closed',
        status: 'pending_verification',
        nicFrontUrl: uploadedUrls.nicFront || '',
        nicBackUrl: uploadedUrls.nicBack || '',
        businessCertUrl: uploadedUrls.bizCert || '',
        servicePhotoUrls: uploadedUrls.svcPhotos || [],
        rejectionReason: '',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'vendors', user.uid), vendorData);

      await addDoc(collection(db, 'vendors', user.uid, 'services'), {
        name: svcName,
        description: svcDesc,
        price: parseFloat(svcPrice) || 0,
        duration: svcDur,
        maxCapacity: parseInt(svcCap) || 1,
        ecoCertified: ecoOn,
        isAvailable: true,
        createdAt: serverTimestamp(),
      });

      setLoading(false);

      Alert.alert(
        'Application Submitted!',
        'Our team will review your documents within 1-2 business days.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                setLoading(true);
                await updateDoc(doc(db, 'users', user.uid), {
                  role: 'vendor_pending',
                  status: 'pending_verification',
                });
              } catch (error) {
                Alert.alert('Finalization Failed', error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (e) {
      setLoading(false);
      console.error('Vendor submission error:', e);
      Alert.alert(
        'Submission Failed',
        'Error: ' + e.message + '\n\nPlease check your connection and try again.'
      );
    }
  };

  const step1Valid = businessName.trim() && businessType && phone.trim();
  const step2Valid = !!(nicFront && nicBack && bizCert);

  const DocPicker = ({ label, asset, onPick }) => (
    <TouchableOpacity style={styles.docRow} onPress={onPick} activeOpacity={0.7}>
      <View style={[styles.docIcon, asset && { backgroundColor: '#E8F5E9' }]}>
        <Ionicons name={asset ? 'checkmark-circle' : 'cloud-upload-outline'} size={22}
          color={asset ? PRIMARY : ON_SURF_V} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docLabel}>{label}</Text>
        <Text style={styles.docSub}>{asset ? 'Uploaded ✓' : 'Tap to upload'}</Text>
      </View>
      {asset && <Image source={{ uri: asset.uri }} style={styles.docThumb} />}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[PRIMARY, '#004D2C']} style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.8}>
          <Ionicons name="close-outline" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Registration</Text>
        <Text style={styles.headerSub}>Step {step + 1} of 3 — {STEPS[step]}</Text>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
      </View>

      {/* Step pills */}
      <View style={styles.stepPills}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepPillRow}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={14} color="#FFF" />
                : <Text style={[styles.stepNum, i <= step && { color: '#FFF' }]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, i === step && { color: PRIMARY, fontWeight: '700' }]}>{s}</Text>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && { backgroundColor: PRIMARY }]} />}
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* ─── STEP 1 ─── */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Details</Text>

            <Text style={styles.fieldLabel}>Business Name *</Text>
            <TextInput style={styles.input} value={businessName} onChangeText={setBN}
              placeholder="e.g. Saman's Homestay" placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Business Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {BUSINESS_TYPES.map(bt => (
                <TouchableOpacity key={bt} onPress={() => setBT(bt)}
                  style={[styles.typeChip, businessType === bt && styles.typeChipActive]}>
                  <Text style={[styles.typeChipText, businessType === bt && { color: '#FFF' }]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" placeholder="+94 71 234 5678" placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Business Address</Text>
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={address} onChangeText={setAddress}
                placeholder="Enter address or use GPS" placeholderTextColor="#AAB8AA" />
              <TouchableOpacity style={styles.gpsBtn} onPress={autoFillGPS} disabled={gpsLoading}>
                {gpsLoading
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <Ionicons name="location-outline" size={20} color={PRIMARY} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, !step1Valid && styles.nextBtnDisabled]}
              onPress={() => step1Valid && setStep(1)} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>Next — Upload Documents</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification Documents</Text>
            <Text style={styles.cardSub}>Upload clear photos of your documents</Text>

            <DocPicker label="NIC Front *" asset={nicFront} onPick={() => pickImage(setNicFront)} />
            <DocPicker label="NIC Back *"  asset={nicBack}  onPick={() => pickImage(setNicBack)} />
            <DocPicker label="Business Certificate *" asset={bizCert} onPick={() => pickImage(setBizCert)} />

            <Text style={styles.fieldLabel}>Service Photos (up to 3)</Text>
            <View style={styles.photoGrid}>
              {svcPhotos.map((p, i) => (
                <View key={i} style={styles.photoThumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.photoDeleteBtn}
                    onPress={() => setSvcPhotos(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color={ERROR} />
                  </TouchableOpacity>
                </View>
              ))}
              {svcPhotos.length < 3 && (
                <TouchableOpacity style={styles.photoAdd}
                  onPress={() => pickImage(asset => setSvcPhotos(p => [...p, asset]))}>
                  <Ionicons name="camera-outline" size={28} color={PRIMARY} />
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploading && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrackSm}>
                  <View style={[styles.progressFillSm, { width: `${uploadPct}%` }]} />
                </View>
                <Text style={styles.progressPct}>{uploadPct}% uploaded</Text>
              </View>
            )}

            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(0)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }, (!step2Valid || uploading) && styles.nextBtnDisabled]}
                onPress={uploadAllDocs} disabled={!step2Valid || uploading} activeOpacity={0.8}>
                {uploading ? <ActivityIndicator color="#FFF" /> : (
                  <><Text style={styles.nextBtnText}>Upload & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" /></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── STEP 3 ─── */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your First Service</Text>
            <Text style={styles.cardSub}>Tell tourists what you offer</Text>

            <Text style={styles.fieldLabel}>Service Name *</Text>
            <TextInput style={styles.input} value={svcName} onChangeText={setSvcName}
              placeholder="e.g. Guided Sigiriya Hike" placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              value={svcDesc} onChangeText={setSvcDesc} multiline
              placeholder="Describe what tourists will experience..." placeholderTextColor="#AAB8AA" />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Price (LKR) *</Text>
                <TextInput style={styles.input} value={svcPrice} onChangeText={setSvcPrice}
                  keyboardType="numeric" placeholder="2500" placeholderTextColor="#AAB8AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Max Capacity</Text>
                <TextInput style={styles.input} value={svcCap} onChangeText={setSvcCap}
                  keyboardType="numeric" placeholder="10" placeholderTextColor="#AAB8AA" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Duration</Text>
            <TextInput style={styles.input} value={svcDur} onChangeText={setSvcDur}
              placeholder="e.g. 3 hours" placeholderTextColor="#AAB8AA" />

            <TouchableOpacity style={styles.ecoToggleCard} onPress={() => setEcoOn(!ecoOn)} activeOpacity={0.8}>
              <View style={styles.ecoIconCircle}>
                <Ionicons name="leaf" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ecoTitle}>Eco-Certified Service</Text>
                <Text style={styles.ecoSub}>Sustainable practices and materials</Text>
              </View>
              <View style={[styles.toggle, ecoOn && styles.toggleOn]}>
                <View style={[styles.toggleDot, ecoOn && styles.toggleDotOn]} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }, loading && styles.nextBtnDisabled]}
                onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.nextBtnText}>Submit Application 🎉</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:      { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center', position: 'relative' },
  closeBtn:    { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 24, right: 20, padding: 8, zIndex: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  progressTrack: { height: 4, backgroundColor: '#BECABE', marginHorizontal: 0 },
  progressFill:  { height: 4, backgroundColor: '#006A3B', borderRadius: 2 },
  stepPills:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EBEFE8' },
  stepPillRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepCircle:  { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EBEFE8', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  stepCircleActive: { backgroundColor: '#006A3B' },
  stepNum:     { fontSize: 11, fontWeight: '700', color: '#6F7A70' },
  stepLabel:   { fontSize: 11, color: '#3F4941', flex: 1 },
  stepLine:    { flex: 1, height: 2, backgroundColor: '#BECABE', marginHorizontal: 6 },
  card:        { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#181D19', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardTitle:   { fontSize: 20, fontWeight: '800', color: '#181D19', marginBottom: 4 },
  cardSub:     { fontSize: 13, color: '#3F4941', marginBottom: 16 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: '#3F4941', marginBottom: 6, marginTop: 12 },
  input:       { borderWidth: 1.5, borderColor: '#BECABE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#181D19', backgroundColor: '#F6FBF3', marginBottom: 4 },
  addressRow:  { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  gpsBtn:      { width: 48, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#006A3B', alignItems: 'center', justifyContent: 'center' },
  typeChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: '#006A3B', marginRight: 8, backgroundColor: '#FFF' },
  typeChipActive: { backgroundColor: '#006A3B' },
  typeChipText:   { fontSize: 13, fontWeight: '600', color: '#006A3B' },
  nextBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#006A3B', borderRadius: 14, paddingVertical: 14, gap: 8, marginTop: 20 },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backBtn:     { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: '#BECABE', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 20 },
  backBtnText: { color: '#3F4941', fontWeight: '600', fontSize: 15 },
  rowBtns:     { flexDirection: 'row', alignItems: 'flex-end' },
  rowFields:   { flexDirection: 'row', gap: 12 },
  docRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#BECABE', backgroundColor: '#F6FBF3', marginTop: 10, gap: 12 },
  docIcon:     { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EBEFE8', alignItems: 'center', justifyContent: 'center' },
  docLabel:    { fontSize: 14, fontWeight: '700', color: '#181D19' },
  docSub:      { fontSize: 12, color: '#6F7A70', marginTop: 2 },
  docThumb:    { width: 48, height: 48, borderRadius: 8 },
  photoGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 8 },
  photoThumbWrap: { width: 80, height: 80, position: 'relative' },
  photoThumb:  { width: 80, height: 80, borderRadius: 12 },
  photoDeleteBtn: { position: 'absolute', top: -6, right: -6 },
  photoAdd:    { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: '#006A3B', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoAddText:{ fontSize: 11, color: '#006A3B', marginTop: 4 },
  progressWrap: { marginTop: 12 },
  progressTrackSm: { height: 6, backgroundColor: '#EBEFE8', borderRadius: 3 },
  progressFillSm:  { height: 6, backgroundColor: '#006A3B', borderRadius: 3 },
  progressPct: { fontSize: 12, color: '#3F4941', marginTop: 4, textAlign: 'right' },
  ecoToggleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBEFE8', borderRadius: 16, padding: 14, marginTop: 16, gap: 12 },
  ecoIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,106,59,0.12)', alignItems: 'center', justifyContent: 'center' },
  ecoTitle: { fontSize: 15, fontWeight: '700', color: '#006A3B' },
  ecoSub:   { fontSize: 12, color: '#3F4941', marginTop: 2 },
  toggle:    { width: 46, height: 26, borderRadius: 13, backgroundColor: '#BECABE', padding: 3, justifyContent: 'center' },
  toggleOn:  { backgroundColor: '#006A3B' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: 'flex-start' },
  toggleDotOn: { alignSelf: 'flex-end' },
});
