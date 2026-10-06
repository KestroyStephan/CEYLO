import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { loadEvents } from '../utils/events';

export default function GuideDiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscoverData();
  }, []);

  const fetchDiscoverData = async () => {
    try {
      // Fetch latest broadcast announcements
      // We fetch a larger limit (e.g. 10) so we can filter out expired ones locally and still have enough
      const notifQuery = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(10));
      const notifSnap = await getDocs(notifQuery);
      
      const todayString = new Date().toISOString().split('T')[0];
      const validAnnouncements = notifSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(ann => {
          if (!ann.expiresAt) return true; // No expiration set, always show
          return ann.expiresAt >= todayString; // Show if not expired
        })
        .slice(0, 3); // Take top 3 valid announcements

      setAnnouncements(validAnnouncements);

      // Published events and holidays (the same source as the tourist app), with image field for this screen
      const allEvents = (await loadEvents()).map(e => ({ ...e, image: e.imageUrl }));

      // Show up to 100
      setEvents(allEvents.slice(0, 100));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'EditProfile' })} style={{ padding: 4, marginRight: 12 }}>
          <MaterialCommunityIcons name="menu" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>Community & Resources</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color="#006A3B" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Announcements Section */}
            {announcements.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Admin Announcements</Text>
                {announcements.map((ann) => (
                  <View key={ann.id} style={styles.announcementCard}>
                    <View style={styles.announcementIconWrap}>
                      <MaterialCommunityIcons name="bullhorn-outline" size={24} color="#006A3B" />
                    </View>
                    <View style={styles.announcementBody}>
                      <Text style={styles.announcementTitle}>{ann.title}</Text>
                      <Text style={styles.announcementDesc}>{ann.message}</Text>
                      <Text style={styles.announcementDate}>
                        {ann.sentAt?.toDate?.()?.toLocaleDateString('en-GB') || 'Recently'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionTitle, { marginTop: announcements.length > 0 ? 15 : 0 }]}>
              Upcoming Festivals & Suggestions
            </Text>
            
            {events.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming events found.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                {events.map((event) => {
                  const eventDate = new Date(event.date);
                  const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const day = eventDate.getDate();

                  return (
                    <TouchableOpacity key={event.id} style={styles.suggestionCard} activeOpacity={0.9}
                      onPress={() => navigation.navigate('EventDetail', { event: { ...event, imageUrl: event.imageUrl || event.image } })}>
                      <Image 
                        source={{ uri: event.imageUrl || event.image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500' }} 
                        style={styles.suggestionImg}
                      />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.suggestionOverlay}>
                        <View style={styles.suggestionTag}>
                          <Text style={styles.suggestionTagText}>{month} {day} • {event.category?.toUpperCase() || 'EVENT'}</Text>
                        </View>
                        <Text style={styles.suggestionTitle}>{event.title}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>{event.location}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  headerSub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#8A9E8A', marginTop: 2 },
  
  content: { padding: 20, paddingBottom: 100 },
  
  sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginBottom: 15 },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#8A9E8A', fontStyle: 'italic', marginBottom: 20 },
  
  announcementCard: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 15, marginBottom: 15, alignItems: 'flex-start' },
  announcementIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  announcementBody: { flex: 1 },
  announcementTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#006A3B', marginBottom: 4 },
  announcementDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#3F4941', marginBottom: 8, lineHeight: 18 },
  announcementDate: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#8A9E8A' },

  suggestionCard: { width: 280, height: 200, borderRadius: 20, overflow: 'hidden', marginRight: 15, marginBottom: 10 },
  suggestionImg: { width: '100%', height: '100%' },
  suggestionOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 15 },
  suggestionTag: { backgroundColor: '#FFC107', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  suggestionTagText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  suggestionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF', marginBottom: 4 },
  suggestionSub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)' },
});
