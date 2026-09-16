import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function GuideAvailabilityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUnavailableDates(data.unavailableDates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selected) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) {
      setSelectedDate(selected);
      const dateStr = selected.toISOString().split('T')[0];
      if (!unavailableDates.includes(dateStr)) {
        setUnavailableDates([...unavailableDates, dateStr].sort());
      } else {
        Alert.alert('Already added', 'This date is already marked as unavailable.');
      }
    }
  };

  const removeDate = (dateStr) => {
    setUnavailableDates(unavailableDates.filter(d => d !== dateStr));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'users', user.uid), {
        unavailableDates: unavailableDates
      });
      Alert.alert('Success', 'Availability updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="calendar-month" size={50} color="#006A3B" style={{ alignSelf: 'center', marginBottom: 15 }} />
          <Text style={styles.title}>Manage Calendar</Text>
          <Text style={styles.sub}>
            Select the dates you are NOT available. Tourists will not be able to book you on these days.
          </Text>

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Unavailable Date</Text>
          </TouchableOpacity>
          
          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          <View style={styles.datesList}>
            {loading ? (
              <ActivityIndicator size="small" color="#006A3B" />
            ) : unavailableDates.length === 0 ? (
              <Text style={styles.emptyText}>No unavailable dates added yet.</Text>
            ) : (
              unavailableDates.map((d, index) => (
                <View key={index} style={styles.dateRow}>
                  <Text style={styles.dateText}>{new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  <TouchableOpacity onPress={() => removeDate(d)}>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={saveAvailability}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Availability</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  backBtn: { padding: 4, marginLeft: -4 },
  
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#EEF2EE' },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A', textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7B6B', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#006A3B', paddingVertical: 12, borderRadius: 12, gap: 8, marginBottom: 20 },
  addBtnText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#FFF' },

  datesList: { marginTop: 10, minHeight: 100 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#8A9E8A', textAlign: 'center', marginTop: 20 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4F7F4', padding: 12, borderRadius: 10, marginBottom: 8 },
  dateText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#1A2E1A' },

  saveBtn: { backgroundColor: '#006A3B', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 30 },
  saveBtnText: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF' },
});
