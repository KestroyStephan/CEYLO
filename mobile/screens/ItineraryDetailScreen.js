import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert, Linking } from 'react-native';
import { Text, Surface, IconButton, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { buildPlan, summarizePlan, distanceKm } from '../services/ItineraryService';
import destinationsData from '../assets/data/ai_destinations.json';

const { width } = Dimensions.get('window');

// Curated routes from the home screen carry a province instead of a plan
function planForRoute(route) {
  const days = parseInt(route.duration, 10) || 3;
  const stops = destinationsData
    .filter(d => d.province === route.province)
    .sort((a, b) => b.eco_score - a.eco_score)
    .slice(0, Math.min(10, Math.max(5, days)))
    .map(d => ({
      id: d.destination_id, name: d.name, category: d.category, province: d.province,
      lat: parseFloat(d.lat), lon: parseFloat(d.lon), ecoScore: Math.round(d.eco_score),
    }));
  return buildPlan(stops, 'Standard', days);
}

function ecoLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Low';
}

export default function ItineraryDetailScreen({ route, navigation }) {
  const incomingData = route?.params?.routeData;
  const [plan, setPlan] = useState(() => {
    if (incomingData?.plan) return incomingData.plan;
    if (incomingData?.province) return planForRoute(incomingData);
    return [];
  });
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
            const itin = { id: snaps.docs[0].id, ...snaps.docs[0].data() };
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

  const summary = summarizePlan(plan, data?.budget);
  const duration = data?.duration || summary.duration;
  const ecoAvg = summary.ecoScore;
  const cost = data?.cost || summary.cost;
  const title = data?.title || 'Your Eco Itinerary';

  // Saved itineraries (those with a Firestore id owned by this user) keep edits
  const updatePlan = (newPlan) => {
    setPlan(newPlan);
    if (data?.id && data.userId === auth.currentUser?.uid) {
      updateDoc(doc(db, 'itineraries', data.id), { plan: newPlan, ...summarizePlan(newPlan, data.budget) })
        .catch(e => console.log('Could not save itinerary changes:', e.message));
    }
  };

  const handleSwapAlternative = (targetItem) => {
    // Highest eco-score destination near this stop that is not already in the plan
    const used = new Set(plan.map(p => p.destinationId));
    const alternatives = destinationsData
      .filter(d => !used.has(d.destination_id) && d.eco_score > (Number(targetItem.eco) || 0))
      .map(d => ({ d, km: targetItem.lat ? distanceKm(targetItem.lat, targetItem.lon, parseFloat(d.lat), parseFloat(d.lon)) : 0 }))
      .filter(x => x.km <= 60)
      .sort((a, b) => b.d.eco_score - a.d.eco_score);

    if (alternatives.length === 0) {
      Alert.alert("Ceylo Smart Recommendation", "This stop already has the best eco score in the area.");
      return;
    }
    const { d: gem, km } = alternatives[0];

    Alert.alert(
      "Ceylo Smart Recommendation",
      `Would you like to replace "${targetItem.title || targetItem.activity}" with:\n\n✨ ${gem.name}\n🌿 Eco Score: ${Math.round(gem.eco_score)}%\n📍 ${km.toFixed(1)} km away`,
      [
        { text: "Keep Original", style: "cancel" },
        {
          text: "Swap It!",
          onPress: () => {
            updatePlan(plan.map(item => item === targetItem ? {
              ...item,
              title: gem.name,
              activity: `Explore ${gem.name} in ${gem.province} (${gem.category})`,
              category: gem.category,
              eco: Math.round(gem.eco_score),
              lat: parseFloat(gem.lat),
              lon: parseFloat(gem.lon),
              destinationId: gem.destination_id,
            } : item));
          }
        }
      ]
    );
  };

  const startRoute = () => {
    const stops = plan.filter(p => p.lat && p.lon);
    if (stops.length === 0) {
      navigation.navigate('MapScreen');
      return;
    }
    const coord = p => `${p.lat},${p.lon}`;
    const destination = coord(stops[stops.length - 1]);
    const waypoints = stops.slice(0, -1).map(coord).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}` +
      (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') + '&travelmode=driving';
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open navigation.'));
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
            
            {item.distanceKm > 0 && (
              <Text style={styles.legText}>{item.distanceKm} km • ~{item.travelMinutes} min by {item.transport}</Text>
            )}
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
          <IconButton icon="share-variant" onPress={exportToPDF} />
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
              <Text style={styles.ecoProgressText}>Eco-Impact Index: {ecoLabel(ecoAvg)}</Text>
            </View>
            <Text style={styles.carbonSavedText}>🚶 {summary.totalDistanceKm} km total</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${ecoAvg}%` }]} />
          </View>
        </View>
      </Surface>

      <DraggableFlatList
        data={plan}
        onDragEnd={({ data: reordered }) => updatePlan(reordered)}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.dayHeader}>No stops in this itinerary yet.</Text>}
      />

      <Surface style={styles.footer} elevation={8}>
        <Button 
          mode="contained" 
          icon="navigation" 
          style={styles.startBtn} 
          buttonColor="#00695C"
          onPress={startRoute}
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
  legText: { fontSize: 11, color: '#666', fontFamily: 'Outfit-Regular', marginBottom: 4 },
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
