import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Surface, IconButton, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

export default function OfflineMapSettings({ navigation }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      const stored = await AsyncStorage.getItem('offline_regions');
      if (stored) {
        setRegions(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRegion = async (id, name) => {
    Alert.alert('Delete Region', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const newRegions = regions.filter((r) => r.id !== id);
          setRegions(newRegions);
          await AsyncStorage.setItem('offline_regions', JSON.stringify(newRegions));
          
          // Also delete directory
          const dir = `${FileSystem.documentDirectory}maps/${id}/`;
          const info = await FileSystem.getInfoAsync(dir);
          if (info.exists) {
            await FileSystem.deleteAsync(dir, { idempotent: true });
          }
        },
      },
    ]);
  };

  const totalSize = regions.reduce((acc, r) => acc + (r.size || 0), 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#00695C', '#004D40']} style={styles.header}>
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" iconColor="#FFF" onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Offline Maps</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Storage Used: {(totalSize / 1024 / 1024).toFixed(2)} MB
        </Text>
      </LinearGradient>

      <FlatList
        data={regions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Surface style={styles.regionCard} elevation={2}>
            <View style={styles.regionInfo}>
              <Text style={styles.regionName}>{item.name}</Text>
              <Text style={styles.regionMeta}>
                Downloaded: {new Date(item.downloadedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.regionMeta}>
                Size: {(item.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <IconButton
              icon="trash-can-outline"
              iconColor="#FF5252"
              onPress={() => deleteRegion(item.id, item.name)}
            />
          </Surface>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="map-marker-off" size={64} color="#B0BEC5" />
              <Text style={styles.emptyText}>No offline maps downloaded.</Text>
              <Text style={styles.emptySubtext}>
                Go to the Map Screen and tap the download icon to save regions for offline use.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#E0F2F1', marginLeft: 10, marginTop: 5 },
  listContent: { padding: 20 },
  regionCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  regionMeta: { fontSize: 12, color: '#666' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#546E7A', marginTop: 20 },
  emptySubtext: { fontSize: 14, color: '#78909C', textAlign: 'center', marginTop: 10, lineHeight: 22 },
});
