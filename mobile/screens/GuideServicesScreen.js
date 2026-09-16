import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function GuideServicesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setServices(data.offeredServices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (service) => {
    setEditingId(service.id);
    setName(service.name);
    setPrice(service.price.toString());
    setDescription(service.description);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      let newServices = [...services];
      
      if (editingId) {
        newServices = newServices.map(s => 
          s.id === editingId ? { id: editingId, name, price: Number(price), description } : s
        );
      } else {
        newServices.push({
          id: Date.now().toString(),
          name,
          price: Number(price),
          description
        });
      }

      await updateDoc(doc(db, 'users', user.uid), {
        offeredServices: newServices
      });
      
      setServices(newServices);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm', 'Are you sure you want to remove this service?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const user = auth.currentUser;
          const newServices = services.filter(s => s.id !== id);
          await updateDoc(doc(db, 'users', user.uid), {
            offeredServices: newServices
          });
          setServices(newServices);
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }}
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={24} color="#006A3B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#006A3B" style={{ marginTop: 50 }} />
        ) : services.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={50} color="#BECABE" />
            <Text style={styles.emptyText}>You haven't added any services yet.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
              <Text style={styles.emptyAddBtnText}>Add a Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          services.map(service => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePrice}>${service.price}</Text>
              </View>
              <Text style={styles.serviceDesc}>{service.description}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(service)}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#006A3B" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(service.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={16} color="#D32F2F" />
                  <Text style={[styles.actionText, { color: '#D32F2F' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#8A9E8A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Service Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Half-Day Guided Tour"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Price (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="40"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what the tourist will experience..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Service</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  backBtn: { padding: 4, marginLeft: -4 },
  addBtn: { padding: 4, marginRight: -4, backgroundColor: '#E8F5E9', borderRadius: 20 },
  
  content: { padding: 20, paddingBottom: 100 },
  
  serviceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#EEF2EE' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  serviceName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#1A2E1A', flex: 1, marginRight: 10 },
  servicePrice: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  serviceDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', lineHeight: 20, marginBottom: 15 },
  
  cardActions: { flexDirection: 'row', gap: 15, borderTopWidth: 1, borderTopColor: '#EEF2EE', paddingTop: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#006A3B' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#8A9E8A', marginTop: 10, marginBottom: 20 },
  emptyAddBtn: { backgroundColor: '#006A3B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyAddBtnText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  inputLabel: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F4F7F4', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, fontFamily: 'Outfit-Regular', color: '#1A2E1A' },
  textArea: { height: 100 },
  saveBtn: { backgroundColor: '#006A3B', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 30 },
  saveBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF' },
});
