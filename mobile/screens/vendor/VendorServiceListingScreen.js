import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, Modal, TextInput,
  Switch, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db, storage } from '../../firebaseConfig';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function VendorServiceListingScreen() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null); // null = new, obj = edit
  const [form, setForm] = useState({
    name: '', description: '', price: '', duration: '',
    maxCapacity: '', ecoCertified: false, photoAsset: null,
  });
  const [saving, setSaving] = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, 'vendors', uid, 'services'), (snap) => {
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const openNew = () => {
    setEditingService(null);
    setForm({ name: '', description: '', price: '', duration: '', maxCapacity: '', ecoCertified: false, photoAsset: null });
    setModalVisible(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name || '',
      description: service.description || '',
      price: service.price?.toString() || '',
      duration: service.duration?.toString() || '',
      maxCapacity: service.maxCapacity?.toString() || '',
      ecoCertified: service.ecoCertified || false,
      photoAsset: null,
    });
    setModalVisible(true);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setForm((f) => ({ ...f, photoAsset: result.assets[0] }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Required', 'Service name and price are required.');
      return;
    }
    setSaving(true);
    try {
      let photoUrl = editingService?.photoUrl || null;
      if (form.photoAsset) {
        const res = await fetch(form.photoAsset.uri);
        const blob = await res.blob();
        const storageRef = ref(storage, `services/${uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        duration: parseInt(form.duration, 10) || 60,
        maxCapacity: parseInt(form.maxCapacity, 10) || 1,
        ecoCertified: form.ecoCertified,
        photoUrl,
        available: editingService?.available ?? true,
      };

      if (editingService) {
        await updateDoc(doc(db, 'vendors', uid, 'services', editingService.id), data);
      } else {
        await addDoc(collection(db, 'vendors', uid, 'services'), {
          ...data, createdAt: serverTimestamp(),
        });
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (service) => {
    try {
      await updateDoc(doc(db, 'vendors', uid, 'services', service.id), {
        available: !service.available,
      });
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (service) => {
    Alert.alert('Delete Service', `Remove "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'vendors', uid, 'services', service.id)); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Services</Text>
        <Text style={styles.serviceCount}>{services.length} listed</Text>
      </View>

      {services.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>≡ƒ¢ì∩╕Å</Text>
          <Text style={styles.emptyText}>Add your first service</Text>
          <Text style={styles.emptySubtext}>Long-press a card to delete. Tap to edit.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.88}
            >
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.servicePhoto} />
              ) : (
                <View style={[styles.servicePhoto, styles.photoPlaceholder]}>
                  <MaterialCommunityIcons name="image-outline" size={28} color="#d1d5db" />
                </View>
              )}
              <View style={styles.serviceInfo}>
                <View style={styles.serviceNameRow}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  {item.ecoCertified && <Text style={styles.ecoBadge}>≡ƒî┐</Text>}
                </View>
                {!!item.description && (
                  <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={styles.serviceMeta}>
                  <Text style={styles.servicePrice}>LKR {(item.price || 0).toLocaleString()}</Text>
                  {!!item.duration && (
                    <Text style={styles.metaPill}>ΓÅ▒ {item.duration}m</Text>
                  )}
                  {!!item.maxCapacity && (
                    <Text style={styles.metaPill}>≡ƒæÑ {item.maxCapacity}</Text>
                  )}
                </View>
              </View>
              <Switch
                value={item.available}
                onValueChange={() => toggleAvailable(item)}
                trackColor={{ false: '#e5e7eb', true: '#d1fae5' }}
                thumbColor={item.available ? '#059669' : '#9ca3af'}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'New Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Service Name *', key: 'name', placeholder: 'e.g. Traditional Cooking Class', numeric: false },
                { label: 'Price (LKR) *', key: 'price', placeholder: 'e.g. 2500', numeric: true },
                { label: 'Duration (minutes)', key: 'duration', placeholder: 'e.g. 90', numeric: true },
                { label: 'Max Capacity', key: 'maxCapacity', placeholder: 'e.g. 4', numeric: true },
              ].map(({ label, key, placeholder, numeric }) => (
                <View key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9ca3af"
                    keyboardType={numeric ? 'numeric' : 'default'}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your service..."
                placeholderTextColor="#9ca3af"
                multiline numberOfLines={3}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              />

              {/* Photo */}
              <TouchableOpacity style={styles.photoPickerBtn} onPress={pickPhoto}>
                <MaterialCommunityIcons name="camera-plus-outline" size={18} color="#059669" />
                <Text style={styles.photoPickerText}>
                  {form.photoAsset ? 'Change Photo' : editingService?.photoUrl ? 'Replace Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
              {(form.photoAsset || editingService?.photoUrl) && (
                <Image
                  source={{ uri: form.photoAsset?.uri || editingService?.photoUrl }}
                  style={styles.photoPreview}
                />
              )}

              {/* Eco certified toggle */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>≡ƒî┐ Eco-Certified</Text>
                  <Text style={styles.switchSubLabel}>Mark as environmentally responsible</Text>
                </View>
                <Switch
                  value={form.ecoCertified}
                  onValueChange={(v) => setForm((f) => ({ ...f, ecoCertified: v }))}
                  trackColor={{ false: '#e5e7eb', true: '#d1fae5' }}
                  thumbColor={form.ecoCertified ? '#059669' : '#9ca3af'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave} disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>
                      {editingService ? 'Save Changes' : 'Add Service'}
                    </Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 50, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#064e3b' },
  serviceCount: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#374151', fontWeight: '700', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  serviceCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  servicePhoto: { width: 76, height: 76, borderRadius: 12, resizeMode: 'cover' },
  photoPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 1 },
  ecoBadge: { fontSize: 14 },
  serviceDesc: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  serviceMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  servicePrice: { fontSize: 14, fontWeight: '800', color: '#059669' },
  metaPill: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#059669', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#064e3b' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  photoPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#059669', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, marginTop: 12,
  },
  photoPickerText: { color: '#059669', fontWeight: '600', fontSize: 14 },
  photoPreview: { width: '100%', height: 150, borderRadius: 10, marginTop: 10, resizeMode: 'cover' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, padding: 14, backgroundColor: '#f9fafb', borderRadius: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  switchSubLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  saveBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
