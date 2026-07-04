import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, Alert } from 'react-native';
import { Text, Surface, IconButton, Button, Avatar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function ItineraryDetailScreen({ route, navigation }) {
  const incomingData = route?.params?.routeData;
  const [plan, setPlan] = useState(incomingData && incomingData.plan ? incomingData.plan : []);
  const [data, setData] = useState(incomingData);

  useEffect(() => {
    if (!incomingData && auth.currentUser) {
      const fetchItin = async () => {
        try {
          const q = query(
            collection(db, 'itineraries'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const snaps = await getDocs(q);
          if (!snaps.empty) {
            const itin = snaps.docs[0].data();
            setData(itin);
            if (itin.plan) setPlan(itin.plan);
          }
        } catch (e) {
          console.error("Error fetching itinerary:", e);
        }
      };
      fetchItin();
    }
  }, [incomingData]);

  const duration = data ? data.duration || '2 Days' : '2 Days';
  const ecoAvg = data ? data.ecoScore || 88 : 88;
  const cost = data ? data.cost || 'LKR 5.2k' : 'LKR 5.2k';
  const title = data ? data.title || 'Your Eco Itinerary' : 'Your Eco Itinerary';

  const carbonSaved = ((ecoAvg / 100) * 24.8).toFixed(1);

  const handleSwapAlternative = (targetItem) => {
    // A list of interesting Sri Lankan hidden gems to recommend as alternatives
    const alternativeGems = [
      { title: "Dunhinda Waterfall Hike", eco: 96, fee: "LKR 500", transport: "walk" },
      { title: "Secret Beach Mirissa exploration", eco: 94, fee: "Free", transport: "walk" },
      { title: "Nanu Oya Tea Plantation trek", eco: 95, fee: "Free", transport: "walk" },
      { title: "Pidurangala Rock Sunrise climb", eco: 93, fee: "LKR 1,000", transport: "walk" },
      { title: "Gal Viharaya ancient ruins", eco: 91, fee: "LKR 3,000", transport: "walk" },
    ];

    const randomGem = alternativeGems[Math.floor(Math.random() * alternativeGems.length)];

    Alert.alert(
      "Ceylo Smart Recommendation",
      `Would you like to replace "${targetItem.title || targetItem.activity}" with the nearby hidden gem:\n\n✨ ${randomGem.title}\n🌿 Eco Score: ${randomGem.eco}%\n🎟️ Fee: ${randomGem.fee}?`,
      [
        { text: "Keep Original", style: "cancel" },
        {
          text: "Swap It!",
          onPress: () => {
            const updatedPlan = plan.map(item => {
              const matchesId = item.id && item.id === targetItem.id;
              const matchesActivity = item.day === targetItem.day && (item.title === targetItem.title || item.activity === targetItem.activity);
              if (matchesId || matchesActivity) {
                return {
                  ...item,
                  title: randomGem.title,
                  activity: randomGem.title,
                  eco: randomGem.eco,
                  fee: randomGem.fee,
                  transport: randomGem.transport
                };
              }
              return item;
            });
            setPlan(updatedPlan);
          }
        }
      ]
    );
  };

  const exportToPDF = async () => {
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1 style="color: #00695C;">Ceylo Trip Itinerary</h1>
          <p>Your sustainable journey through Sri Lanka</p>
          <hr/>
          ${plan.map(item => `
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0;">${item.time || 'Day ' + item.day} - ${item.title || item.activity}</h3>
              <p style="margin: 5px 0; color: #4CAF50;">Eco Score: ${item.eco || 80}%</p>
              <p style="margin: 0; color: #666;">Transport: ${item.transport || 'walk'}</p>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walk': return 'walk';
      case 'train': return 'train';
      case 'bus': return 'bus';
      default: return 'car';
    }
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
            <Text style={styles.timeText}>{item.time || 'Day ' + item.day}</Text>
            <View style={[styles.dot, { backgroundColor: (item.eco || 80) >= 90 ? '#4CAF50' : '#FF9800' }]} />
            <View style={styles.line}>
              {/* Transport mode visual arc indicator */}
              <View style={styles.transportBadge}>
                <MaterialCommunityIcons name={getTransportIcon(item.transport)} size={11} color="#00695C" />
              </View>
            </View>
          </View>
          
          <View style={styles.details}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemTitle}>{item.title || item.activity}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton 
                  icon="sparkles" 
                  iconColor="#FF7043" 
                  size={16} 
                  style={{ margin: 0 }}
                  onPress={() => handleSwapAlternative(item)} 
                />
                <MaterialCommunityIcons name="drag-vertical" size={20} color="#999" />
              </View>
            </View>
            
            <View style={styles.chipRow}>
              <Chip style={[styles.ecoChip, { backgroundColor: (item.eco || 80) >= 90 ? '#E8F5E9' : '#FFF3E0' }]} textStyle={{ fontSize: 10 }}>
                {item.eco || 80}% ECO
              </Chip>
              <Chip icon="currency-usd" style={styles.feeChip} textStyle={{ fontSize: 10 }}>{item.fee || 'Free'}</Chip>
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
          <Text style={styles.title}>{title}</Text>
          <IconButton icon="share-variant" />
        </View>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{duration}</Text>
            <Text style={styles.summaryLab}>Duration</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#4CAF50' }]}>{ecoAvg}%</Text>
            <Text style={styles.summaryLab}>Carbon Score</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{cost}</Text>
            <Text style={styles.summaryLab}>Est. Cost</Text>
          </View>
        </View>

        {/* Sustainability Index Progress Bar */}
        <View style={styles.ecoProgressContainer}>
          <View style={styles.ecoProgressInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="leaf" size={14} color="#4CAF50" />
              <Text style={styles.ecoProgressText}>Eco-Impact Index: Excellent</Text>
            </View>
            <Text style={styles.carbonSavedText}>🌿 {carbonSaved}kg CO₂ saved</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${ecoAvg}%` }]} />
          </View>
        </View>
      </Surface>

      <DraggableFlatList
        data={plan}
        onDragEnd={({ data }) => setPlan(data)}
        keyExtractor={(item, index) => item.id || index.toString()}
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
  title: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#004D40', flex: 1, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingHorizontal: 20 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#333' },
  summaryLab: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#666' },
  vDivider: { width: 1, backgroundColor: '#EEE', height: 30 },
  listContent: { padding: 20, paddingBottom: 150 },
  dayHeader: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#00695C', letterSpacing: 1.5, marginBottom: 20 },
  item: { marginBottom: 15 },
  activeItem: { opacity: 0.8 },
  card: { backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', padding: 15, minHeight: 100 },
  timeLine: { width: 60, alignItems: 'center' },
  timeText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666', marginBottom: 5, textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00695C' },
  line: { flex: 1, width: 2, backgroundColor: '#E0E0E0', marginTop: 5 },
  details: { flex: 1, marginLeft: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#333', flex: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ecoChip: { minHeight: 24, paddingVertical: 0 },
  feeChip: { minHeight: 24, backgroundColor: '#F5F5F5', paddingVertical: 0 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, gap: 10 },
  startBtn: { borderRadius: 15, height: 55, justifyContent: 'center' },
  exportBtn: { borderRadius: 15, height: 50, justifyContent: 'center', borderColor: '#00695C' },
  ecoProgressContainer: { paddingHorizontal: 20, marginTop: 15, marginBottom: 5 },
  ecoProgressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  ecoProgressText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#004D40' },
  carbonSavedText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#4CAF50' },
  progressBarBg: { height: 6, backgroundColor: '#E0F2F1', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
  transportBadge: { position: 'absolute', top: '25%', left: -6, backgroundColor: '#E0F2F1', borderRadius: 8, width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00695C' },
});
