import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Alert } from 'react-native';
import { Text, Searchbar, Chip, Card, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import * as Location from 'expo-location';
import ProgressiveImage from '../components/ProgressiveImage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadEvents, eventsNear, eventCategories } from '../utils/events';
import { GeofenceService } from '../services/GeofenceService';

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

export default function CulturalEventsScreen({ navigation }) {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [position, setPosition] = useState(null);

    useEffect(() => {
        loadEvents().then(list => {
            setEvents(list);
            setLoading(false);
        });
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getLastKnownPositionAsync({})
                || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (loc) setPosition(loc.coords);
        })().catch(e => console.log('Events location error:', e.message));
    }, []);

    useEffect(() => {
        const q = searchQuery.toLowerCase();
        let filtered = selectedType === 'Near Me' ? eventsNear(events, position) : events;
        filtered = filtered.filter(event =>
            event.title.toLowerCase().includes(q) ||
            event.location.toLowerCase().includes(q)
        );
        if (selectedType !== 'All' && selectedType !== 'Near Me') {
            filtered = filtered.filter(event => String(event.category).includes(selectedType));
        }
        setFilteredEvents(filtered);
    }, [searchQuery, selectedType, events, position]);

    const enableNearbyAlerts = async () => {
        const regions = events
            .filter(e => e.coords)
            .slice(0, 20) // Android allows at most 100 geofences; keep the nearest-in-time ones
            .map(e => ({ title: e.title, coords: e.coords, radius: e.radiusKm * 1000 }));
        const started = await GeofenceService.startGeofencing(regions);
        Alert.alert(
            started ? 'Nearby Alerts On' : 'Alerts Unavailable',
            started
                ? 'You will be notified when you are near an upcoming cultural event.'
                : 'Allow "Always" location access in Settings to receive alerts in the background. You can still use the "Near Me" filter.'
        );
    };

    const openEvent = (event) => navigation.navigate('EventDetail', { event });

    const renderEventCard = ({ item }) => (
        <Card style={styles.eventCard} elevation={2} onPress={() => openEvent(item)}>
        <View style={styles.cardImageWrapper}>
            <ProgressiveImage source={{ uri: item.imageUrl }} style={styles.cardImage} />
            <Surface style={styles.dateBadge} elevation={4}>
                <Text style={styles.dateDay}>{item.date ? (item.dateApprox ? '~' : formatDate(item.date, 'dd')) : '??'}</Text>
                <Text style={styles.dateMonth}>{item.date ? formatDate(item.date, 'MMM') : '???'}</Text>
            </Surface>
        </View>
            <Card.Content style={styles.cardContent}>
                <View style={styles.typeRow}>
                    <Chip size={10} style={styles.typeChip} textStyle={styles.typeChipText}>{item.type || 'Event'}</Chip>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                        <Text style={styles.locationText}>
                            {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km • ` : ''}{item.location}
                        </Text>
                    </View>
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </Card.Content>
        </Card>
    );

    const CalendarView = () => {
        const months = [...new Set(filteredEvents.filter(e => e.date).map(e => formatDate(e.date, 'MMMM yyyy')))];

        return (
            <ScrollView style={styles.calendarContainer}>
                {months.map(month => (
                    <View key={month} style={styles.monthSection}>
                        <Text style={styles.monthHeader}>{month}</Text>
                        {filteredEvents.filter(e => e.date && formatDate(e.date, 'MMMM yyyy') === month).map(event => (
                            <TouchableOpacity key={event.id} style={styles.calendarListItem} onPress={() => openEvent(event)}>
                                <View style={styles.calendarDateBox}>
                                    <Text style={styles.calendarDay}>{event.dateApprox ? '~' : formatDate(event.date, 'dd')}</Text>
                                    <Text style={styles.calendarWeekday}>{event.dateApprox ? 'TBC' : formatDate(event.date, 'EEE')}</Text>
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
                    <IconButton accessibilityLabel="Go back" icon="arrow-left" onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>Sri Lanka Festivals</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <IconButton accessibilityLabel="Remind me" icon="bell-ring-outline" onPress={enableNearbyAlerts} />
                        <IconButton
                            icon={viewMode === 'list' ? 'calendar-month' : 'view-list'}
                            accessibilityLabel={viewMode === 'list' ? 'Show calendar view' : 'Show list view'}
                            onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                        />
                    </View>
                </View>
                <Searchbar
                    placeholder="Search festivals, locations..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {eventCategories(events).map(type => (
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
                            <Text style={styles.emptyText}>
                                {selectedType === 'Near Me'
                                    ? (position ? 'No events in your area.' : 'Location access is needed to find events near you.')
                                    : 'No events found matching your criteria.'}
                            </Text>
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
    cardImageWrapper: { position: 'relative' },
    cardImage: { height: 180, width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
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
    calendarWeekday: { fontSize: 10, fontFamily: 'Outfit-Medium', color: '#6B7280', textTransform: 'uppercase' },
    calendarEventInfo: { flex: 1 },
    calendarEventTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#333' },
    calendarEventLoc: { fontSize: 12, color: '#666', fontFamily: 'Outfit-Regular' }
});
