import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const TYPE_COLORS = {
  'HERITAGE TOUR': '#6A1B9A',
  'TEA EXPERIENCE': '#1565C0',
  'WILDLIFE TREK': '#2E7D32',
  'MARINE DIVE': '#00838F',
  'GUIDED TOUR': '#006A3B',
  'ADVENTURE': '#D84315',
};

export default function GuideBookingsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(route?.params?.filter || 'pending'); // pending, upcoming, past, all
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'bookings'), where('guideId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(all);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'upcoming') return b.status === 'accepted' || b.status === 'confirmed';
    if (filter === 'past') return b.status === 'completed';
    return true;
  });

  const renderBooking = ({ item }) => {
    const type = (item.guideSpecialization || item.tourType || 'GUIDED TOUR').toUpperCase();
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setSelectedBooking(item)}>
        <Image
          source={{ uri: item.touristPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }}
          style={styles.cardImg}
        />
        <View style={styles.cardBody}>
          <Text style={[styles.type, { color: TYPE_COLORS[type] || '#006A3B' }]}>{type}</Text>
          <Text style={styles.title}>{item.tourTitle || `Tour with ${item.touristName}`}</Text>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color="#8A9E8A" />
            <Text style={styles.metaText}>{item.selectedDate || item.tourDate || item.createdAt?.toDate?.()?.toLocaleDateString() || 'Upcoming'}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account-group" size={14} color="#8A9E8A" />
            <Text style={styles.metaText}>{item.explorers || item.groupSize || item.persons || 1} Persons</Text>
          </View>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>${item.totalAmount || item.packageCost || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedBooking) return;
    try {
      await updateDoc(doc(db, 'bookings', selectedBooking.id), { status });
      const currentBooking = selectedBooking;
      setSelectedBooking(null);
      
      if (status === 'accepted') {
        const tId = currentBooking.touristId || currentBooking.userId;
        const gId = currentBooking.guideId || 'demo';
        const combinedChatId = `${tId}_${gId}`;
        console.log("GuideBookingsScreen accepted navigating to chat:", combinedChatId);
        navigation.navigate('MessageScreen', { 
          chatId: combinedChatId, 
          recipientName: currentBooking.touristName 
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update booking status.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 4, marginRight: 12 }}>
          <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'upcoming', 'past', 'all'].map(f => (
          <TouchableOpacity 
            key={f}  
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#006A3B" />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={50} color="#BECABE" />
          <Text style={styles.emptyText}>No {filter} bookings found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={item => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Booking Details Modal */}
      <Modal visible={!!selectedBooking} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <Text style={styles.modalTitle}>Booking Details</Text>
                <Text style={styles.modalText}><Text style={{fontFamily: 'Outfit-Bold'}}>Tourist:</Text> {selectedBooking.touristName}</Text>
                <Text style={styles.modalText}><Text style={{fontFamily: 'Outfit-Bold'}}>Date:</Text> {selectedBooking.selectedDate || selectedBooking.tourDate}</Text>
                <Text style={styles.modalText}><Text style={{fontFamily: 'Outfit-Bold'}}>Persons:</Text> {selectedBooking.explorers || selectedBooking.groupSize || 1}</Text>
                <Text style={styles.modalText}><Text style={{fontFamily: 'Outfit-Bold'}}>Cost:</Text> ${selectedBooking.totalAmount || selectedBooking.packageCost}</Text>
                <Text style={styles.modalText}><Text style={{fontFamily: 'Outfit-Bold'}}>Location:</Text> {selectedBooking.pickupLocation || 'Not specified'}</Text>

                {selectedBooking.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#006A3B' }]} onPress={() => handleUpdateStatus('accepted')}>
                      <Text style={styles.actionBtnText}>Accept Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D32F2F', marginTop: 10 }]} onPress={() => handleUpdateStatus('declined')}>
                      <Text style={styles.actionBtnText}>Reject Request</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(selectedBooking.status === 'accepted' || selectedBooking.status === 'confirmed') && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#006A3B', flexDirection: 'row', gap: 8 }]} 
                      onPress={() => {
                        const currentBooking = selectedBooking;
                        setSelectedBooking(null);
                        const tId = currentBooking.touristId || currentBooking.userId;
                        const gId = currentBooking.guideId || 'demo';
                        const combinedChatId = `${tId}_${gId}`;
                        console.log("GuideBookingsScreen modal navigating to chat:", combinedChatId);
                        navigation.navigate('MessageScreen', { 
                          chatId: combinedChatId, 
                          recipientName: currentBooking.touristName 
                        });
                      }}
                    >
                      <MaterialCommunityIcons name="message-text" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Message Tourist</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedBooking(null)}>
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8F5E9' },
  filterBtnActive: { backgroundColor: '#006A3B' },
  filterText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  filterTextActive: { color: '#FFF' },
  
  list: { padding: 20, paddingBottom: 100 },
  
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2EE' },
  cardImg: { width: 100, height: 110 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  type: { fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7B6B' },
  
  priceTag: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F4F7F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#8A9E8A' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 15, textAlign: 'center' },
  modalText: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#4A5E4A', marginBottom: 8 },
  modalActions: { marginTop: 20, marginBottom: 10 },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Outfit-Bold' },
  closeModalBtn: { marginTop: 10, paddingVertical: 14, alignItems: 'center' },
  closeModalText: { color: '#6B7B6B', fontSize: 15, fontFamily: 'Outfit-Medium' }
});
