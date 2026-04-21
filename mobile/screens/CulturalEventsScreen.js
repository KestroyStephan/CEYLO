
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, Dimensions } from 'react-native';
import { Text, Searchbar, Chip, Card, IconButton, Surface, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
// Native date formatting helpers instead of date-fns
const formatDate = (dateString, formatType) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "??";
    
    if (formatType === 'dd') return d.getDate().toString().padStart(2, '0');
    if (formatType === 'MMM') return d.toLocaleString('en-US', { month: 'short' });
    if (formatType === 'EEE') return d.toLocaleString('en-US', { weekday: 'short' });
    if (formatType === 'MMMM yyyy') return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    return d.toLocaleDateString();
};

const { width } = Dimensions.get('window');

const EVENT_TYPES = ['All', 'Festival', 'Religious', 'Cultural', 'Heritage', 'Seasonal'];

export default function CulturalEventsScreen({ navigation }) {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

    useEffect(() => {
        const q = query(collection(db, "cultural_events"), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventsData);
            setFilteredEvents(eventsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = events.filter(event => 
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (selectedType !== 'All') {
            filtered = filtered.filter(event => event.category === selectedType || event.type === selectedType);
        }
        setFilteredEvents(filtered);
    }, [searchQuery, selectedType, events]);

    const renderEventCard = ({ item }) => (
        <Card style={styles.eventCard} elevation={2} onPress={() => {/* Show details */}}>
            <Card.Cover source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2' }} style={styles.cardImage} />
            <Surface style={styles.dateBadge} elevation={4}>
                <Text style={styles.dateDay}>{item.date ? formatDate(item.date, 'dd') : '??'}</Text>
                <Text style={styles.dateMonth}>{item.date ? formatDate(item.date, 'MMM') : '???'}</Text>
            </Surface>
            <Card.Content style={styles.cardContent}>
                <View style={styles.typeRow}>
                    <Chip size={10} style={styles.typeChip} textStyle={styles.typeChipText}>{item.type || 'Event'}</Chip>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                        <Text style={styles.locationText}>{item.location}</Text>
                    </View>
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </Card.Content>
        </Card>
    );

    const CalendarView = () => {
        // Simple calendar implementation or just a grouped list by month
        const months = [...new Set(events.map(e => formatDate(e.date, 'MMMM yyyy')))];
        
        return (
            <ScrollView style={styles.calendarContainer}>
                {months.map(month => (
                    <View key={month} style={styles.monthSection}>
                        <Text style={styles.monthHeader}>{month}</Text>
                        {events.filter(e => formatDate(e.date, 'MMMM yyyy') === month).map(event => (
                            <TouchableOpacity key={event.id} style={styles.calendarListItem}>
                                <View style={styles.calendarDateBox}>
                                    <Text style={styles.calendarDay}>{formatDate(event.date, 'dd')}</Text>
                                    <Text style={styles.calendarWeekday}>{formatDate(event.date, 'EEE')}</Text>
                                </View>
                                <View style={styles.calendarEventInfo}>
                                    <Text style={styles.calendarEventTitle}>{event.title}</Text>
                                    <Text style={styles.calendarEventLoc}>{event.location}</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={4}>
                <View style={styles.headerTop}>
                    <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>Sri Lanka Festivals</Text>
                    <IconButton 
                        icon={viewMode === 'list' ? 'calendar-month' : 'view-list'} 
                        onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} 
                    />
                </View>
                <Searchbar
                    placeholder="Search festivals or locations..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {EVENT_TYPES.map(type => (
                        <Chip 
                            key={type} 
                            selected={selectedType === type} 
                            onPress={() => setSelectedType(type)}
                            style={[styles.filterChip, selectedType === type && styles.selectedChip]}
                            textStyle={[styles.filterChipText, selectedType === type && styles.selectedChipText]}
                        >
                            {type}
                        </Chip>
                    ))}
                </ScrollView>
            </Surface>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00695C" />
                    <Text style={styles.loadingText}>Loading cultural calendar...</Text>
                </View>
            ) : viewMode === 'list' ? (
                <FlatList
                    data={filteredEvents}
                    renderItem={renderEventCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="calendar-blank" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>No events found matching your criteria.</Text>
                        </View>
                    }
                />
            ) : (
                <CalendarView />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { paddingBottom: 15, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, paddingHorizontal: 10 },
    headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#004D40' },
    searchBar: { marginHorizontal: 20, marginBottom: 15, borderRadius: 15, backgroundColor: '#F1F3F4', height: 45, elevation: 0 },
    searchInput: { fontSize: 14, fontFamily: 'Outfit-Regular' },
    filterScroll: { paddingHorizontal: 20 },
    filterChip: { marginRight: 8, backgroundColor: '#FFF', borderColor: '#EEE', borderWidth: 1 },
    selectedChip: { backgroundColor: '#00695C' },
    filterChipText: { fontFamily: 'Outfit-Medium', color: '#666' },
    selectedChipText: { color: '#FFF' },
    listContent: { padding: 20, gap: 20 },
    eventCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF' },
    cardImage: { height: 180 },
    dateBadge: { 
        position: 'absolute', 
        top: 20, 
        right: 20, 
        backgroundColor: '#FFF', 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 15, 
        alignItems: 'center' 
    },
    dateDay: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#00695C' },
    dateMonth: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#666', textTransform: 'uppercase' },
    cardContent: { padding: 15 },
    typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    typeChip: { height: 24, backgroundColor: '#E0F2F1' },
    typeChipText: { fontSize: 10, color: '#00695C', fontFamily: 'Outfit-Bold' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 12, color: '#666', fontFamily: 'Outfit-Medium' },
    eventTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 5 },
    description: { fontSize: 14, color: '#666', fontFamily: 'Outfit-Regular', lineHeight: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#666', fontFamily: 'Outfit-Medium' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, color: '#999', fontFamily: 'Outfit-Medium', textAlign: 'center' },
    calendarContainer: { padding: 20 },
    monthSection: { marginBottom: 25 },
    monthHeader: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#004D40', marginBottom: 15, marginLeft: 5 },
    calendarListItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFF', 
        padding: 15, 
        borderRadius: 15, 
        marginBottom: 10,
        elevation: 1
    },
    calendarDateBox: { alignItems: 'center', width: 45, borderRightWidth: 1, borderRightColor: '#EEE', paddingRight: 10, marginRight: 15 },
    calendarDay: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
    calendarWeekday: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#999', textTransform: 'uppercase' },
    calendarEventInfo: { flex: 1 },
    calendarEventTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#333' },
    calendarEventLoc: { fontSize: 12, color: '#666', fontFamily: 'Outfit-Regular' }
});
