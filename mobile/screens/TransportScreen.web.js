import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TransportScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={2}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text style={styles.title}>Transport Options</Text>
                <IconButton icon="dots-vertical" />
            </Surface>

            <View style={styles.content}>
                <View style={styles.msgCard}>
                    <MaterialCommunityIcons name="car-connected" size={80} color="#00695C" />
                    <Text style={styles.msgTitle}>Real-time Transport Unavailable on Web</Text>
                    <Text style={styles.msgSub}>
                        Booking and tracking Eco-rides requires precise device GPS and background signals. 
                        Please use the Ceylo mobile app for the full experience.
                    </Text>
                    <Button 
                        mode="contained" 
                        onPress={() => navigation.goBack()}
                        style={styles.btn}
                        buttonColor="#00695C"
                    >
                        Return Home
                    </Button>
                </View>

                <Text style={styles.sectionTitle}>Typical Rates (Informational)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rateScroll}>
                    <Surface style={styles.rateCard} elevation={1}>
                        <MaterialCommunityIcons name="auto-fix" size={32} color="#00695C" />
                        <Text style={styles.vType}>Tuk-Tuk</Text>
                        <Text style={styles.vPrice}>~ LKR 150/km</Text>
                    </Surface>
                    <Surface style={styles.rateCard} elevation={1}>
                        <MaterialCommunityIcons name="car" size={32} color="#00695C" />
                        <Text style={styles.vType}>Eco Car</Text>
                        <Text style={styles.vPrice}>~ LKR 300/km</Text>
                    </Surface>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7F8' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#FFF', paddingBottom: 10, paddingTop: 50 },
    title: { fontSize: 18, fontFamily: 'Outfit-Bold' },
    content: { flex: 1, padding: 30, justifyContent: 'center' },
    msgCard: { alignItems: 'center', gap: 15, marginBottom: 40 },
    msgTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', textAlign: 'center', color: '#333' },
    msgSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
    btn: { width: '100%', borderRadius: 15, height: 50, justifyContent: 'center' },
    sectionTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', marginBottom: 15 },
    rateScroll: { flexDirection: 'row' },
    rateCard: { padding: 20, borderRadius: 20, backgroundColor: '#FFF', marginRight: 15, alignItems: 'center', minWidth: 140 },
    vType: { fontSize: 14, fontFamily: 'Outfit-Bold', marginTop: 10 },
    vPrice: { fontSize: 12, color: '#666' },
});
