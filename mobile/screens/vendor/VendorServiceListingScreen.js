// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, Modal, TextInput,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const PRIMARY   = '#006A3B';
const TERTIARY  = '#735C00';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';
const ERROR     = '#BA1A1A';

const EMPTY_FORM = { name:'', description:'', price:'', duration:'', maxCapacity:'', ecoCertified:false, photoAsset:null };

export default function VendorServiceListingScreen() {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db,'vendors',uid,'services'), snap => {
      setServices(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.log("VendorServiceListingScreen services listener error:", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name:s.name||'', description:s.description||'', price:s.price?.toString()||'',
      duration:s.duration?.toString()||'', maxCapacity:s.maxCapacity?.toString()||'',
      ecoCertified:s.ecoCertified||false, photoAsset:null });
    setModal(true);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes:['images'], allowsEditing:true, aspect:[4,3], quality:0.8 });
    if (!r.canceled && r.assets?.length > 0) setForm(f => ({ ...f, photoAsset:r.assets[0] }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Required', 'Service name and price are required.'); return;
    }
    setSaving(true);
    try {
      let photoUrl = editing?.photoUrl || null;
      if (form.photoAsset) {
        const res = await fetch(form.photoAsset.uri); const blob = await res.blob();
        const r   = ref(storage, `services/${uid}/${Date.now()}.jpg`);
        await new Promise((resolve, reject) => {
          uploadBytesResumable(r, blob).on('state_changed', null, reject, async () => {
            photoUrl = await getDownloadURL(r); resolve();
          });
        });
      }
      const data = { name:form.name.trim(), description:form.description.trim(),
        price:parseFloat(form.price)||0, duration:form.duration.trim(),
        maxCapacity:parseInt(form.maxCapacity)||1, ecoCertified:form.ecoCertified,
        photoUrl, isAvailable:true };
      if (editing) {
        await updateDoc(doc(db,'vendors',uid,'services',editing.id), data);
      } else {
        await addDoc(collection(db,'vendors',uid,'services'), { ...data, createdAt:serverTimestamp() });
      }
      setModal(false);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Service','This action cannot be undone.',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive', onPress:()=>deleteDoc(doc(db,'vendors',uid,'services',id)).catch(e=>Alert.alert('Error',e.message))},
    ]);
  };

  const toggleAvailable = async (s) => {
    await updateDoc(doc(db,'vendors',uid,'services',s.id), { isAvailable:!s.isAvailable }).catch(()=>{});
  };

  return (
    <View style={{ flex:1, backgroundColor:BG }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : services.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={52} color={OUTLINE_V} />
          <Text style={styles.emptyTitle}>No Services Yet</Text>
          <Text style={styles.emptySub}>Tap + to add your first service</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
            <Text style={styles.emptyBtnText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding:16, paddingBottom:100 }}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceCardTop}>
                {item.photoUrl
                  ? <Image source={{ uri:item.photoUrl }} style={styles.serviceThumb} />
                  : <View style={[styles.serviceThumb, { backgroundColor:SURFACE_C, alignItems:'center', justifyContent:'center' }]}>
                      <Ionicons name="image-outline" size={28} color={OUTLINE_V} />
                    </View>}
                <View style={{ flex:1, marginLeft:14 }}>
                  <View style={styles.serviceNameRow}>
                    <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
                    {item.ecoCertified && (
                      <View style={styles.ecoBadge}>
                        <Ionicons name="leaf" size={10} color={PRIMARY} />
                        <Text style={styles.ecoBadgeText}>Eco</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.servicePrice}>LKR {(item.price||0).toLocaleString()}</Text>
                  <View style={styles.serviceMeta}>
                    {item.duration ? <Text style={styles.metaChip}>{item.duration}</Text> : null}
                    {item.maxCapacity ? <Text style={styles.metaChip}>Max {item.maxCapacity}</Text> : null}
                  </View>
                </View>
              </View>
              <View style={styles.serviceActions}>
                <View style={styles.availRow}>
                  <Text style={styles.availLabel}>{item.isAvailable ? 'Available' : 'Unavailable'}</Text>
                  <TouchableOpacity onPress={() => toggleAvailable(item)} style={[styles.toggle, item.isAvailable && styles.toggleOn]}>
                    <View style={[styles.toggleDot, item.isAvailable && styles.toggleDotOn]} />
                  </TouchableOpacity>
                </View>
                <View style={styles.serviceActBtns}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={16} color={ERROR} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={{ flex:1, backgroundColor:BG }} behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Ionicons name="close" size={22} color={ON_SURF} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? 'Edit Service' : 'Add New Service'}</Text>
            <View style={{ width:30 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding:20, paddingBottom:40 }}>
            {[
              { label:'Service Name *', key:'name', placeholder:'e.g. Guided Forest Walk' },
              { label:'Price (LKR) *',  key:'price', placeholder:'2500', keyboardType:'numeric' },
              { label:'Duration',       key:'duration', placeholder:'e.g. 2 hours' },
              { label:'Max Capacity',   key:'maxCapacity', placeholder:'10', keyboardType:'numeric' },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={t => setForm(fm=>({...fm,[f.key]:t}))}
                  placeholder={f.placeholder} placeholderTextColor="#AAB8AA" keyboardType={f.keyboardType||'default'} />
              </View>
            ))}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input,{height:90,textAlignVertical:'top'}]} value={form.description}
              onChangeText={t=>setForm(f=>({...f,description:t}))} multiline placeholder="Describe the service..." placeholderTextColor="#AAB8AA" />

            <Text style={styles.fieldLabel}>Service Photo</Text>
            <TouchableOpacity style={styles.photoPickBtn} onPress={pickPhoto}>
              {form.photoAsset
                ? <Image source={{uri:form.photoAsset.uri}} style={styles.photoPreview} />
                : <><Ionicons name="camera-outline" size={24} color={PRIMARY} /><Text style={styles.photoPickText}>Pick Photo</Text></>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.ecoToggleCard} onPress={()=>setForm(f=>({...f,ecoCertified:!f.ecoCertified}))} activeOpacity={0.8}>
              <View style={styles.ecoIconCircle}><Ionicons name="leaf" size={20} color={PRIMARY} /></View>
              <Text style={styles.ecoToggleText}>Eco-Certified Service</Text>
              <View style={[styles.toggle,form.ecoCertified&&styles.toggleOn]}>
                <View style={[styles.toggleDot,form.ecoCertified&&styles.toggleDotOn]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity:0.5 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Service'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:56, paddingHorizontal:20, paddingBottom:16, backgroundColor:SURFACE, borderBottomWidth:1, borderBottomColor:SURFACE_C },
  headerTitle:{ fontSize:24, fontWeight:'800', color:ON_SURF },
  addBtn:     { width:40, height:40, borderRadius:20, backgroundColor:PRIMARY, alignItems:'center', justifyContent:'center' },
  center:     { flex:1, justifyContent:'center', alignItems:'center' },
  emptyState: { flex:1, alignItems:'center', justifyContent:'center', padding:40, gap:12 },
  emptyTitle: { fontSize:18, fontWeight:'700', color:ON_SURF },
  emptySub:   { fontSize:14, color:ON_SURF_V, textAlign:'center' },
  emptyBtn:   { backgroundColor:PRIMARY, paddingHorizontal:28, paddingVertical:14, borderRadius:14 },
  emptyBtnText:{ color:'#FFF', fontWeight:'700', fontSize:15 },
  serviceCard:{ backgroundColor:SURFACE, borderRadius:20, padding:16, marginBottom:12, shadowColor:'#181D19', shadowOpacity:0.08, shadowRadius:12, elevation:3 },
  serviceCardTop:{ flexDirection:'row', alignItems:'flex-start' },
  serviceThumb:{ width:80, height:80, borderRadius:14 },
  serviceNameRow:{ flexDirection:'row', alignItems:'center', gap:8, flex:1 },
  serviceName:{ fontSize:16, fontWeight:'700', color:ON_SURF, flex:1 },
  ecoBadge:   { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,106,59,0.1)', borderRadius:9999, paddingHorizontal:6, paddingVertical:2, gap:3 },
  ecoBadgeText:{ fontSize:10, fontWeight:'700', color:PRIMARY },
  servicePrice:{ fontSize:15, fontWeight:'800', color:PRIMARY, marginTop:4 },
  serviceMeta:{ flexDirection:'row', gap:6, marginTop:6 },
  metaChip:   { fontSize:11, color:ON_SURF_V, backgroundColor:SURFACE_C, paddingHorizontal:8, paddingVertical:3, borderRadius:9999, fontWeight:'600' },
  serviceActions:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:SURFACE_C },
  availRow:   { flexDirection:'row', alignItems:'center', gap:10 },
  availLabel: { fontSize:13, color:ON_SURF_V, fontWeight:'600' },
  toggle:     { width:44, height:24, borderRadius:12, backgroundColor:OUTLINE_V, padding:2 },
  toggleOn:   { backgroundColor:PRIMARY },
  toggleDot:  { width:20, height:20, borderRadius:10, backgroundColor:'#FFF', alignSelf:'flex-start' },
  toggleDotOn:{ alignSelf:'flex-end' },
  serviceActBtns:{ flexDirection:'row', gap:8 },
  editBtn:    { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(0,106,59,0.08)', paddingHorizontal:12, paddingVertical:7, borderRadius:9 },
  editBtnText:{ fontSize:13, fontWeight:'600', color:PRIMARY },
  deleteBtn:  { width:34, height:34, borderRadius:9, borderWidth:1.5, borderColor:'#FECACA', alignItems:'center', justifyContent:'center' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:20, backgroundColor:SURFACE, borderBottomWidth:1, borderBottomColor:SURFACE_C },
  modalTitle: { fontSize:18, fontWeight:'800', color:ON_SURF },
  fieldLabel: { fontSize:13, fontWeight:'600', color:ON_SURF_V, marginBottom:6, marginTop:14 },
  input:      { borderWidth:1.5, borderColor:OUTLINE_V, borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontSize:15, color:ON_SURF, backgroundColor:SURFACE },
  photoPickBtn:{ height:80, borderRadius:14, borderWidth:2, borderColor:PRIMARY, borderStyle:'dashed', alignItems:'center', justifyContent:'center', flexDirection:'row', gap:10 },
  photoPickText:{ fontSize:14, color:PRIMARY, fontWeight:'600' },
  photoPreview:{ width:'100%', height:80, borderRadius:14 },
  ecoToggleCard:{ flexDirection:'row', alignItems:'center', backgroundColor:SURFACE_C, borderRadius:14, padding:14, marginTop:16, gap:12 },
  ecoIconCircle:{ width:38, height:38, borderRadius:19, backgroundColor:'rgba(0,106,59,0.12)', alignItems:'center', justifyContent:'center' },
  ecoToggleText:{ flex:1, fontSize:15, fontWeight:'700', color:PRIMARY },
  saveBtn:    { backgroundColor:PRIMARY, borderRadius:14, paddingVertical:16, alignItems:'center', marginTop:24 },
  saveBtnText:{ color:'#FFF', fontSize:16, fontWeight:'700' },
});
