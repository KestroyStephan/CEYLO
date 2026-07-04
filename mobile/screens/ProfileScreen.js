import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
    const user = auth.currentUser;
    const [userData, setUserData] = useState(null);
    const [itinerariesCount, setItinerariesCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        });
        
        const q = query(collection(db, 'itineraries'), where('userId', '==', user.uid));
        const unsubItin = onSnapshot(q, (snap) => {
            setItinerariesCount(snap.docs.length);
        });

        return () => {
            unsub();
            unsubItin();
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }
    };

    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Feather name="menu" size={24} color="#004D40" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Explore Sri Lanka</Text>
            <TouchableOpacity>
                <Feather name="search" size={24} color="#004D40" />
            </TouchableOpacity>
        </View>
    );

    const StatCard = ({ value, label, valueColor }) => (
        <Surface style={styles.statCard} elevation={1}>
            <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Surface>
    );

    const PassportCard = ({ icon, title, date, borderColor }) => (
        <Surface style={[styles.passportCard, { borderColor: borderColor || '#E0F2F1' }]} elevation={0}>
            <View style={styles.passportIconWrapper}>
                <MaterialCommunityIcons name={icon} size={24} color="#004D40" />
            </View>
            <Text style={styles.passportTitle}>{title}</Text>
            <Text style={styles.passportDate}>{date}</Text>
        </Surface>
    );

    const MenuItem = ({ icon, title, subtitle, onPress }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.menuIconWrapper}>
                <Feather name={icon} size={20} color="#004D40" />
            </View>
            <View style={styles.menuTextContent}>
                <Text style={styles.menuTitle}>{title}</Text>
                <Text style={styles.menuSubtitle}>{subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
    );

    // Real Data Fallbacks
    const ecoPoints = userData?.ecoPoints || 0;
    const visitedCount = userData?.visitedPlaces?.length || 0;
    const reviewsCount = userData?.reviews?.length || 0;
    const savedPlacesCount = userData?.savedPlaces?.length || 0;
    
    // Fallback to real visited places if available
    const visitedPlaces = userData?.visitedPlaces || [];

    return (
        <View style={styles.mainContainer}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Header />
                
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: user?.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80' }} 
                            style={styles.avatar} 
                        />
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>LVL {userData?.level || 1}</Text>
                        </View>
                    </View>
                    <Text style={styles.name}>{user?.displayName || "Traveler"}</Text>
                    <View style={styles.ecoTag}>
                        <MaterialCommunityIcons name="leaf" size={16} color="#00897B" />
                        <Text style={styles.ecoTagText}>{userData?.rank || 'Eco-Traveler'}</Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <StatCard value={visitedCount} label={"Places\nVisited"} valueColor="#00897B" />
                    <StatCard value={ecoPoints} label="Eco Points" valueColor="#B8860B" />
                    <StatCard value={reviewsCount} label="Reviews" valueColor="#00695C" />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Eco Passport</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EcoPassport')}>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                {visitedPlaces.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.passportScroll}>
                        {visitedPlaces.map((place, index) => (
                            <PassportCard 
                                key={index} 
                                icon="map-marker-check" 
                                title={place.name} 
                                date={place.date || 'Recently'} 
                                borderColor="#B2DFDB" 
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyPassport}>
                        <MaterialCommunityIcons name="passport" size={32} color="#CCC" />
                        <Text style={styles.emptyPassportText}>You haven't visited any destinations yet.</Text>
                        <Text style={styles.emptyPassportSub}>Start exploring to earn stamps!</Text>
                    </View>
                )}

                <View style={styles.menuList}>
                    <MenuItem icon="bookmark" title="Saved Places" subtitle={`${savedPlacesCount} Hidden Gems saved`} onPress={() => {}} />
                    <MenuItem icon="map" title="Itineraries" subtitle={`${itinerariesCount} Upcoming journeys`} onPress={() => navigation.navigate('ItineraryDetail')} />
                    <MenuItem icon="settings" title="Settings" subtitle="Preferences & Privacy" onPress={() => {}} />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="logout" size={20} color="#D32F2F" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Floating SOS Button */}
            <TouchableOpacity 
                style={styles.fabSOS}
                activeOpacity={0.8} 
                onPress={() => navigation.navigate('SOSScreen')}
            >
                <Text style={styles.fabSOSText}>SOS</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F4F9F4' },
    container: { flex: 1, paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 20 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#004D40' },
    
    profileSection: { alignItems: 'center', marginBottom: 25 },
    avatarContainer: { position: 'relative', marginBottom: 15 },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#A7FFEB' },
    levelBadge: { position: 'absolute', bottom: 0, right: -5, backgroundColor: '#DAA520', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' },
    levelText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 10, letterSpacing: 0.5 },
    name: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 5 },
    ecoTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ecoTagText: { color: '#00897B', fontFamily: 'Outfit-Medium', fontSize: 14 },

    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
    statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 5, alignItems: 'center', marginHorizontal: 5 },
    statValue: { fontSize: 22, fontFamily: 'Outfit-Bold', marginBottom: 4 },
    statLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#444', textAlign: 'center', lineHeight: 14 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
    viewAll: { color: '#00695C', fontFamily: 'Outfit-Medium', fontSize: 14 },

    passportScroll: { gap: 15, paddingBottom: 10 },
    passportCard: { width: 120, backgroundColor: '#FFF', borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1 },
    passportIconWrapper: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F4F1', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    passportTitle: { fontFamily: 'Outfit-Bold', fontSize: 13, color: '#333', marginBottom: 4, textAlign: 'center' },
    passportDate: { fontFamily: 'Outfit-Regular', fontSize: 11, color: '#666' },

    emptyPassport: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
    emptyPassportText: { fontFamily: 'Outfit-SemiBold', color: '#444', fontSize: 14, marginTop: 10 },
    emptyPassportSub: { fontFamily: 'Outfit-Regular', color: '#888', fontSize: 12, marginTop: 4 },

    menuList: { marginTop: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12 },
    menuIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContent: { flex: 1 },
    menuTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#111', marginBottom: 2 },
    menuSubtitle: { fontFamily: 'Outfit-Regular', fontSize: 13, color: '#666' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F9F4', borderWidth: 1, borderColor: '#FFCDD2', paddingVertical: 15, borderRadius: 16, marginTop: 10, marginBottom: 20, gap: 8 },
    logoutText: { color: '#D32F2F', fontFamily: 'Outfit-Medium', fontSize: 16 },

    fabSOS: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FF7043', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#FF7043', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    fabSOSText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16 },
});
