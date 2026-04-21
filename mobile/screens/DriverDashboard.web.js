import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, IconButton, Avatar, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DriverDashboard({ navigation }) {
    return (
        <View style={styles.container}>
            <LinearGradient colors={['#004D40', '#00695C']} style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.welcome}>Good Morning,</Text>
                        <Text style={styles.driverName}>Dhammika (Web View)</Text>
                    </View>
                    <Avatar.Image size={45} source={{ uri: 'https://i.pravatar.cc/150?u=driver' }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content}>
                <Surface style={styles.webAlert} elevation={1}>
                    <MaterialCommunityIcons name="monitor-shimmer" size={32} color="#00695C" />
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.alertTitle}>Desktop Dashboard Mode</Text>
                        <Text style={styles.alertSub}>
                            Use the mobile app for real-time ride requests and GPS navigation. 
                            The web portal is for earnings review and account management.
                        </Text>
                    </View>
                </Surface>

                <View style={styles.statsRow}>
                    <Card style={styles.statCard}>
                        <Card.Content>
                            <Text style={styles.statVal}>LKR 12.5k</Text>
                            <Text style={styles.statLab}>Earnings</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.statCard}>
                        <Card.Content>
                            <Text style={styles.statVal}>92%</Text>
                            <Text style={styles.statLab}>Eco Score</Text>
                        </Card.Content>
                    </Card>
                </View>

                <Text style={styles.sectionTitle}>Recent Trip Logs</Text>
                {[1, 2, 3].map(i => (
                    <Surface key={i} style={styles.tripLog} elevation={1}>
                        <View style={styles.logHeader}>
                            <Text style={styles.logDate}>20 Apr 2026</Text>
                            <Text style={styles.logPrice}>LKR 450</Text>
                        </View>
                        <Text style={styles.logPath}>Sigiriya → Dambulla</Text>
                    </Surface>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcome: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
    driverName: { fontSize: 24, color: '#FFF', fontFamily: 'Outfit-Bold' },
    content: { padding: 20 },
    webAlert: { padding: 20, borderRadius: 15, backgroundColor: '#E0F2F1', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    alertTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#004D40' },
    alertSub: { fontSize: 12, color: '#00695C' },
    statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 15 },
    statVal: { fontSize: 18, fontFamily: 'Outfit-Bold' },
    statLab: { fontSize: 10, color: '#666' },
    sectionTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', marginBottom: 15 },
    tripLog: { padding: 15, borderRadius: 15, backgroundColor: '#FFF', marginBottom: 10 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    logDate: { fontSize: 12, color: '#999' },
    logPrice: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#00695C' },
    logPath: { fontSize: 14, color: '#333' },
});
