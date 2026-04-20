import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Text, Surface, IconButton, Button, Avatar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const MOCK_PLAN = [
  { id: '1', day: 1, title: 'Arrival at Colombo & Eco Walk', time: '09:00 AM', type: 'nature', icon: 'leaf', eco: 95, fee: 'LKR 2,500', transport: 'walk' },
  { id: '2', day: 1, title: 'Gangaramaya Temple Visit', time: '02:00 PM', type: 'culture', icon: 'castle', eco: 80, fee: 'LKR 1,500', transport: 'tuk' },
  { id: '3', day: 2, title: 'Train to Kandy (Scenic Route)', time: '07:00 AM', type: 'travel', icon: 'train', eco: 90, fee: 'LKR 1,200', transport: 'train' },
];

export default function ItineraryDetailScreen({ route, navigation }) {
  const [plan, setPlan] = useState(MOCK_PLAN);

  const exportToPDF = async () => {
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1 style="color: #00695C;">Ceylo Trip Itinerary</h1>
          <p>Your sustainable journey through Sri Lanka</p>
          <hr/>
          ${plan.map(item => `
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0;">${item.time} - ${item.title}</h3>
              <p style="margin: 5px 0; color: #4CAF50;">Eco Score: ${item.eco}%</p>
              <p style="margin: 0; color: #666;">Transport: ${item.transport}</p>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const renderItem = ({ item, drag, isActive }) => (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[styles.item, isActive && styles.activeItem]}
      >
        <Surface style={styles.card} elevation={1}>
          <View style={styles.timeLine}>
            <Text style={styles.timeText}>{item.time}</Text>
            <View style={styles.dot} />
            <View style={styles.line} />
          </View>
          
          <View style={styles.details}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <MaterialCommunityIcons name="drag-vertical" size={20} color="#999" />
            </View>
            
            <View style={styles.chipRow}>
              <Chip style={[styles.ecoChip, { backgroundColor: item.eco >= 90 ? '#E8F5E9' : '#FFF3E0' }]} textStyle={{ fontSize: 10 }}>
                {item.eco}% ECO
              </Chip>
              <Chip icon="currency-usd" style={styles.feeChip} textStyle={{ fontSize: 10 }}>{item.fee}</Chip>
              <MaterialCommunityIcons name={item.transport === 'walk' ? 'walk' : 'taxi'} size={18} color="#00695C" />
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerTop}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Your Eco Itinerary</Text>
          <IconButton icon="share-variant" />
        </View>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>2 Days</Text>
            <Text style={styles.summaryLab}>Duration</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#4CAF50' }]}>88%</Text>
            <Text style={styles.summaryLab}>Carbon Score</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>LKR 5.2k</Text>
            <Text style={styles.summaryLab}>Est. Cost</Text>
          </View>
        </View>
      </Surface>

      <DraggableFlatList
        data={plan}
        onDragEnd={({ data }) => setPlan(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.dayHeader}>DAY 1 — THE EXPLORATION</Text>}
      />

      <Surface style={styles.footer} elevation={8}>
        <Button 
          mode="contained" 
          icon="navigation" 
          style={styles.startBtn} 
          buttonColor="#00695C"
          onPress={() => navigation.navigate('MapScreen')}
        >
          Start Multi-Stop Route
        </Button>
        <Button mode="outlined" icon="file-pdf-box" style={styles.exportBtn} onPress={exportToPDF}>Export PDF</Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, paddingHorizontal: 10 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#004D40' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingHorizontal: 20 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333' },
  summaryLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
  vDivider: { width: 1, backgroundColor: '#EEE', height: 30 },
  listContent: { padding: 20, paddingBottom: 150 },
  dayHeader: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#00695C', letterSpacing: 1.5, marginBottom: 20 },
  item: { marginBottom: 15 },
  activeItem: { opacity: 0.8 },
  card: { backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', padding: 15, height: 100 },
  timeLine: { width: 60, alignItems: 'center' },
  timeText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666', marginBottom: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00695C' },
  line: { flex: 1, width: 2, backgroundColor: '#E0E0E0', marginTop: 5 },
  details: { flex: 1, marginLeft: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#333' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ecoChip: { height: 24 },
  feeChip: { height: 24, backgroundColor: '#F5F5F5' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, gap: 10 },
  startBtn: { borderRadius: 15, height: 55, justifyContent: 'center' },
  exportBtn: { borderRadius: 15, height: 50, justifyContent: 'center', borderColor: '#00695C' },
});
