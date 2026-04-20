import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Avatar, List, Surface, IconButton, Button, Divider } from 'react-native-paper';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
    const user = auth.currentUser;

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }
    };

    const StatItem = ({ label, value, icon }) => (
        <View style={styles.statItem}>
            <MaterialCommunityIcons name={icon} size={24} color="#00695C" />
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLab}>{label}</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#004D40', '#00695C']} style={styles.header}>
                <View style={styles.headerTop}>
                    <IconButton icon="cog-outline" iconColor="#FFF" size={24} />
                    <IconButton icon="bell-outline" iconColor="#FFF" size={24} />
                </View>
                
                <View style={styles.profileInfo}>
                    <Surface style={styles.avatarSurface} elevation={4}>
                        <Avatar.Text
                            size={90}
                            label={user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                            style={styles.avatar}
                            labelStyle={{ fontFamily: 'Outfit-Bold' }}
                        />
                    </Surface>
                    <Text style={styles.name}>{user?.displayName || "Traveler"}</Text>
                    <View style={styles.rankBadge}>
                        <MaterialCommunityIcons name="leaf" size={14} color="#FFF" />
                        <Text style={styles.rankText}>Eco Expert</Text>
                    </View>
                </View>
            </LinearGradient>

            <Surface style={styles.statsSurface} elevation={2}>
                <StatItem label="Trips" value="12" icon="map-marker-distance" />
                <View style={styles.vDivider} />
                <StatItem label="Eco Score" value="94" icon="leaf" />
                <View style={styles.vDivider} />
                <StatItem label="Badges" value="8" icon="medal" />
            </Surface>

            <View style={styles.menuContainer}>
                <List.Section>
                    <List.Subheader style={styles.subheader}>Travel Dashboard</List.Subheader>
                    <List.Item
                        title="Saved Itineraries"
                        left={props => <List.Icon {...props} icon="format-list-bulleted" color="#00695C" />}
                        onPress={() => navigation.navigate('ItineraryDetail')}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                    <List.Item
                        title="Eco Passport"
                        left={props => <List.Icon {...props} icon="passport" color="#4CAF50" />}
                        onPress={() => navigation.navigate('EcoPassport')}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                    <List.Item
                        title="Ride History"
                        left={props => <List.Icon {...props} icon="car-clock" color="#333" />}
                        onPress={() => {}}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                </List.Section>

                <List.Section>
                    <List.Subheader style={styles.subheader}>Administration</List.Subheader>
                    <List.Item
                        title="Personal Details"
                        left={props => <List.Icon {...props} icon="account-details-outline" color="#666" />}
                        onPress={() => {}}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                    <List.Item
                        title="Payments & Wallet"
                        left={props => <List.Icon {...props} icon="wallet-outline" color="#666" />}
                        onPress={() => {}}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                    <List.Item
                        title="Help & Support"
                        left={props => <List.Icon {...props} icon="help-circle-outline" color="#666" />}
                        onPress={() => {}}
                        style={styles.menuItem}
                        titleStyle={styles.menuTitle}
                    />
                </List.Section>

                <Button 
                    mode="contained-tonal" 
                    onPress={handleLogout} 
                    style={styles.logoutBtn}
                    textColor="#D32F2F"
                    buttonColor="#FFEBEE"
                    icon="logout"
                >
                    Logout Account
                </Button>
                <Text style={styles.version}>Ceylo App v1.0.4 Premium</Text>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 100, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
    profileInfo: { alignItems: 'center' },
    avatarSurface: { padding: 4, borderRadius: 50, backgroundColor: '#FFF', marginBottom: 15 },
    avatar: { backgroundColor: '#00695C' },
    name: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF' },
    rankBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, marginTop: 8, gap: 6 },
    rankText: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit-Bold' },
    statsSurface: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginHorizontal: 24, marginTop: -40, justifyContent: 'space-around', alignItems: 'center' },
    statItem: { alignItems: 'center', gap: 5 },
    statVal: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#333' },
    statLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
    vDivider: { width: 1, backgroundColor: '#EEE', height: 40 },
    menuContainer: { paddingHorizontal: 10, marginTop: 20 },
    subheader: { fontFamily: 'Outfit-Bold', color: '#00695C', fontSize: 14, letterSpacing: 1 },
    menuItem: { backgroundColor: '#FFF', borderRadius: 15, marginBottom: 8, marginHorizontal: 10 },
    menuTitle: { fontFamily: 'Outfit-Medium', fontSize: 15 },
    logoutBtn: { margin: 20, borderRadius: 15, height: 50, justifyContent: 'center' },
    version: { textAlign: 'center', color: '#999', fontSize: 10, fontFamily: 'Outfit-Regular', marginBottom: 20 },
});
