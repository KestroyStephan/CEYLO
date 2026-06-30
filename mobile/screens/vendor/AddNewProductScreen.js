// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, StatusBar,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth, db, storage } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');
const PRIMARY   = '#006A3B';
const TERTIARY  = '#735C00';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';
const ERROR     = '#BA1A1A';

const CATEGORIES = ['Tea','Handicrafts','Spices','Wellness','Gems','Textiles','Food','Other'];

const EcoScoreRing = ({ score = 78 }) => {
  const R = 36; const CIRC = 2 * Math.PI * R;
  const strokeDash = (score / 100) * CIRC;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
      <Svg width={90} height={90} viewBox="0 0 90 90">
        <Circle cx="45" cy="45" r={R} stroke={OUTLINE_V} strokeWidth={6} fill="none" />
        <Circle cx="45" cy="45" r={R} stroke={TERTIARY} strokeWidth={6} fill="none"
          strokeDasharray={`${strokeDash} ${CIRC}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: TERTIARY }}>{score}</Text>
        <Text style={{ fontSize: 9, color: ON_SURF_V, fontWeight: '600' }}>/ 100</Text>
      </View>
    </View>
  );
};

export default function AddNewProductScreen({ navigation }) {
  const [step,        setStep]        = useState(1);
  const [images,      setImages]      = useState([]);
  const [nameEn,      setNameEn]      = useState('');
  const [nameNative,  setNameNative]  = useState('');
  const [category,    setCategory]    = useState('');
  const [price,       setPrice]       = useState('');
  const [stock,       setStock]       = useState('');
  const [isEco,       setIsEco]       = useState(false);
  const [availFrom,   setAvailFrom]   = useState('');
  const [availUntil,  setAvailUntil]  = useState('');
  const [pickup,      setPickup]      = useState('');
  const [description, setDescription] = useState('');
  const [maxOrderQty, setMaxOrderQty] = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const uid = auth.currentUser?.uid;

  const pickImage = async () => {
    if (images.length >= 5) { Alert.alert('Limit reached', 'You can add up to 5 images.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [4,3] });
    if (!r.canceled && r.assets?.length > 0) setImages(prev => [...prev, r.assets[0]]);
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const autoFillGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      if (geo?.length > 0) {
        const g = geo[0];
        setPickup([g.name, g.city, g.region].filter(Boolean).join(', '));
      }
    } catch (e) {} finally { setGpsLoading(false); }
  };

  const step1Valid = nameEn.trim() && category && price.trim();

  const handleSubmit = async () => {
    if (!step1Valid) { Alert.alert('Required', 'Product name, category and price are required.'); return; }
    setUploading(true);
    try {
      // Fetch vendor details to get businessName
      const vendorDoc = await getDoc(doc(db, 'vendors', uid));
      const vendorData = vendorDoc.exists() ? vendorDoc.data() : { businessName: 'Vendor' };

      const productId = `${uid}_${Date.now()}`;
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        const res  = await fetch(images[i].uri);
        const blob = await res.blob();
        const r    = ref(storage, `vendors/${uid}/products/${productId}/image_${i}.jpg`);
        await new Promise((resolve, reject) => {
          uploadBytesResumable(r, blob).on('state_changed', null, reject, async () => {
            imageUrls.push(await getDownloadURL(r));
            resolve();
          });
        });
      }
      await addDoc(collection(db, 'vendors', uid, 'products'), {
        name_en: nameEn.trim(), name_native: nameNative.trim(),
        category, price: parseFloat(price) || 0,
        stock: parseInt(stock) || 0,
        isEcoFriendly: isEco,
        availableFrom: availFrom, availableUntil: availUntil,
        pickupLocation: pickup.trim(), description: description.trim(),
        maxOrderQty: parseInt(maxOrderQty) || 1,
        ecoScore: 78, images: imageUrls,
        status: 'active', 
        vendorId: uid, 
        vendorBusinessName: vendorData.businessName || 'Vendor',
        isAvailable: true,
        createdAt: serverTimestamp(),
      });
      Alert.alert('🎉 Product Live!', 'Your product is now live on the marketplace!', [
        { text: 'Great!', onPress: () => navigation.goBack() }
      ]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setUploading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={ON_SURF} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List New Item</Text>
        <TouchableOpacity>
          <Text style={styles.saveDraft}>SAVE DRAFT</Text>
        </TouchableOpacity>
      </View>

      {/* Step progress */}
      <View style={styles.stepBar}>
        <View style={styles.stepBarTabs}>
          <Text style={[styles.stepBarTab, step === 1 && styles.stepBarTabActive]}>Item Details</Text>
          <Text style={[styles.stepBarTab, step === 2 && styles.stepBarTabActive]}>Delivery & Availability</Text>
        </View>
        <Text style={styles.stepNum}>Step {step} of 2</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${step * 50}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            {/* Product Images */}
            <Text style={styles.sectionTitle}>Product Images</Text>
            <Text style={styles.sectionSub}>Showcase the quality and craftsmanship of your product.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {/* Add slot */}
              <TouchableOpacity style={styles.imageAddSlot} onPress={pickImage}>
                <Ionicons name="camera" size={28} color={PRIMARY} />
                <Text style={styles.imageAddText}>Add Photo</Text>
              </TouchableOpacity>
              {images.map((img, i) => (
                <View key={i} style={styles.imageThumbnailWrap}>
                  <Image source={{ uri: img.uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity style={styles.imageDeleteBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={20} color={ERROR} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Product Name (English) *</Text>
            <TextInput style={styles.input} value={nameEn} onChangeText={setNameEn}
              placeholder="e.g. Artisanal Ceylon Black Tea" placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Product Name (Native — Optional)</Text>
            <TextInput style={styles.input} value={nameNative} onChangeText={setNameNative}
              placeholder="සිංහල හෝ தமிழ்" placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)}
                  style={[styles.catChip, category === cat && styles.catChipActive]}>
                  <Text style={[styles.catChipText, category === cat && { color: '#FFF' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Price (LKR) *</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.pricePrefix}>Rs.</Text>
                  <TextInput style={styles.priceField} value={price} onChangeText={setPrice}
                    keyboardType="numeric" placeholder="1500" placeholderTextColor="#AAB8AA" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Stock Quantity</Text>
                <TextInput style={styles.input} value={stock} onChangeText={setStock}
                  keyboardType="numeric" placeholder="50" placeholderTextColor="#AAB8AA" />
              </View>
            </View>

            {/* Eco Toggle */}
            <TouchableOpacity style={styles.ecoCard} onPress={() => setIsEco(!isEco)} activeOpacity={0.85}>
              <View style={styles.ecoIconCircle}>
                <Ionicons name="leaf" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ecoTitle}>Eco-Friendly Product</Text>
                <Text style={styles.ecoSub}>Sustainable packaging and sourcing</Text>
              </View>
              <View style={[styles.toggle, isEco && styles.toggleOn]}>
                <View style={[styles.toggleDot, isEco && styles.toggleDotOn]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.publishBtn, !step1Valid && styles.publishBtnDisabled]}
              onPress={() => step1Valid && setStep(2)} activeOpacity={0.8}>
              <Text style={styles.publishBtnText}>Publish Listing →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Delivery & Availability</Text>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Available From</Text>
                <TextInput style={styles.input} value={availFrom} onChangeText={setAvailFrom}
                  placeholder="YYYY-MM-DD" placeholderTextColor="#AAB8AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Available Until</Text>
                <TextInput style={styles.input} value={availUntil} onChangeText={setAvailUntil}
                  placeholder="YYYY-MM-DD" placeholderTextColor="#AAB8AA" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Pickup Location</Text>
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={pickup} onChangeText={setPickup}
                placeholder="Enter location or use GPS" placeholderTextColor="#AAB8AA" />
              <TouchableOpacity style={styles.gpsBtn} onPress={autoFillGPS} disabled={gpsLoading}>
                {gpsLoading ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <Ionicons name="location-outline" size={20} color={PRIMARY} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Short Description</Text>
            <View>
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={description} onChangeText={t => setDescription(t.slice(0, 200))} multiline
                placeholder="Describe your product in 200 characters..." placeholderTextColor="#AAB8AA" />
              <Text style={styles.charCount}>{description.length}/200</Text>
            </View>

            <Text style={styles.fieldLabel}>Max Order Quantity per Tourist</Text>
            <TextInput style={styles.input} value={maxOrderQty} onChangeText={setMaxOrderQty}
              keyboardType="numeric" placeholder="5" placeholderTextColor="#AAB8AA" />

            {/* Eco Score Ring */}
            <View style={styles.ecoScoreCard}>
              <EcoScoreRing score={78} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.ecoScoreTitle}>Eco Score (AI-Predicted)</Text>
                <Text style={styles.ecoScoreSub}>Based on your product category, sourcing, and practices. Higher scores attract eco-conscious tourists.</Text>
              </View>
            </View>

            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.publishBtn, { flex: 1, marginTop: 0 }, uploading && styles.publishBtnDisabled]}
                onPress={handleSubmit} disabled={uploading} activeOpacity={0.8}>
                {uploading ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={styles.publishBtnText}>Submit & Go Live 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: SURFACE_C },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE_C, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 18, fontWeight: '800', color: ON_SURF },
  saveDraft:  { fontSize: 13, fontWeight: '700', color: PRIMARY },
  stepBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: SURFACE },
  stepBarTabs:{ flexDirection: 'row', gap: 16 },
  stepBarTab: { fontSize: 13, color: ON_SURF_V, paddingBottom: 4 },
  stepBarTabActive: { color: PRIMARY, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: PRIMARY },
  stepNum:    { fontSize: 12, color: ON_SURF_V, fontWeight: '600' },
  progressTrack: { height: 3, backgroundColor: SURFACE_C },
  progressFill:  { height: 3, backgroundColor: PRIMARY },
  sectionTitle:  { fontSize: 20, fontWeight: '800', color: ON_SURF, marginBottom: 4 },
  sectionSub:    { fontSize: 13, color: ON_SURF_V, marginBottom: 16 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: ON_SURF_V, marginBottom: 6, marginTop: 14 },
  input:         { borderWidth: 1.5, borderColor: OUTLINE_V, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: ON_SURF, backgroundColor: SURFACE, marginBottom: 4 },
  rowFields:     { flexDirection: 'row', gap: 12 },
  priceInput:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: OUTLINE_V, borderRadius: 12, backgroundColor: SURFACE, overflow: 'hidden' },
  pricePrefix:   { paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: ON_SURF_V },
  priceField:    { flex: 1, paddingVertical: 12, fontSize: 15, color: ON_SURF },
  categoryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: SURFACE },
  catChipActive: { backgroundColor: PRIMARY },
  catChipText:   { fontSize: 13, fontWeight: '600', color: PRIMARY },
  ecoCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE_C, borderRadius: 16, padding: 14, marginTop: 16, gap: 12 },
  ecoIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,106,59,0.12)', alignItems: 'center', justifyContent: 'center' },
  ecoTitle:      { fontSize: 15, fontWeight: '700', color: PRIMARY },
  ecoSub:        { fontSize: 12, color: ON_SURF_V, marginTop: 2 },
  toggle:        { width: 46, height: 26, borderRadius: 13, backgroundColor: OUTLINE_V, padding: 3 },
  toggleOn:      { backgroundColor: PRIMARY },
  toggleDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: 'flex-start' },
  toggleDotOn:   { alignSelf: 'flex-end' },
  publishBtn:    { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  publishBtnDisabled: { opacity: 0.45 },
  publishBtnText:{ fontSize: 17, fontWeight: '800', color: '#FFF' },
  imageAddSlot:  { width: 88, height: 88, borderRadius: 12, borderWidth: 2, borderColor: PRIMARY, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  imageAddText:  { fontSize: 11, color: PRIMARY, marginTop: 4, fontWeight: '600' },
  imageThumbnailWrap: { position: 'relative', marginRight: 10 },
  imageThumbnail:{ width: 88, height: 88, borderRadius: 12 },
  imageDeleteBtn:{ position: 'absolute', top: -6, right: -6 },
  addressRow:    { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  gpsBtn:        { width: 48, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  charCount:     { fontSize: 11, color: ON_SURF_V, textAlign: 'right', marginTop: 2 },
  ecoScoreCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE_C, borderRadius: 16, padding: 16, marginTop: 16 },
  ecoScoreTitle: { fontSize: 15, fontWeight: '700', color: TERTIARY },
  ecoScoreSub:   { fontSize: 12, color: ON_SURF_V, marginTop: 4, lineHeight: 18 },
  rowBtns:       { flexDirection: 'row', gap: 12, marginTop: 24 },
  backBtn:       { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: OUTLINE_V, alignItems: 'center', justifyContent: 'center' },
  backBtnText:   { color: ON_SURF_V, fontWeight: '600', fontSize: 15 },
});
