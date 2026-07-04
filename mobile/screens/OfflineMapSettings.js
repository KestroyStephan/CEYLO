import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, Animated, Easing
} from 'react-native';
import { Surface, IconButton, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  downloadRegion,
  deleteRegion as deleteRegionUtil,
  loadRegions,
  SRI_LANKA_REGIONS,
} from '../utils/offlineMapUtils';

const COLORS = {
  primary: '#00695C',
  dark: '#004D40',
  danger: '#FF5252',
  bg: '#F4F7F4',
  card: '#FFFFFF',
  text: '#1A1A2E',
  sub: '#6B7280',
};

export default function OfflineMapSettings({ navigation }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadingName, setDownloadingName] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (downloading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [downloading]);

  const fetchRegions = async () => {
    setLoading(true);
    const saved = await loadRegions();
    setRegions(saved);
    setLoading(false);
  };

  const handleDownload = async (region) => {
    setShowDownloadModal(false);
    setDownloading(true);
    setDownloadingName(region.name);
    setProgress(0);
    setProgressLabel('Preparing tiles...');

    try {
      await downloadRegion(
        region.name,
        region.bounds,
        region.zooms,
        (done, total) => {
          const pct = done / total;
          setProgress(pct);
          setProgressLabel(`${done} / ${total} tiles`);
        }
      );
      await fetchRegions();
      Alert.alert(
        '✅ Download Complete',
        `"${region.name}" is now available offline.`,
        [{ text: 'Great!' }]
      );
    } catch (e) {
      Alert.alert('Download Failed', e.message || 'Please check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Region', `Remove "${item.name}" from offline storage?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRegionUtil(item.id);
          await fetchRegions();
        },
      },
    ]);
  };

  const totalMB = (regions.reduce((acc, r) => acc + (r.size || 0), 0) / 1024 / 1024).toFixed(1);

  const renderRegionCard = ({ item }) => (
    <Surface style={styles.regionCard} elevation={2}>
      <View style={styles.regionIconBox}>
        <MaterialCommunityIcons name="map-check" size={26} color={COLORS.primary} />
      </View>
      <View style={styles.regionInfo}>
        <Text style={styles.regionName}>{item.name}</Text>
        <Text style={styles.regionMeta}>
          {(item.size / 1024 / 1024).toFixed(1)} MB • {item.tileCount} tiles
        </Text>
        <Text style={styles.regionMeta}>
          Downloaded {new Date(item.downloadedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
        <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORS.danger} />
      </TouchableOpacity>
    </Surface>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.dark]} style={styles.header}>
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" iconColor="#FFF" onPress={() => navigation.goBack()} />
          <View>
            <Text style={styles.headerTitle}>Offline Maps</Text>
            <Text style={styles.headerSub}>Available without internet</Text>
          </View>
        </View>
        <View style={styles.storageRow}>
          <MaterialCommunityIcons name="database" size={16} color="#B2DFDB" />
          <Text style={styles.storageTxt}> {totalMB} MB used  •  {regions.length} region{regions.length !== 1 ? 's' : ''}</Text>
        </View>
      </LinearGradient>

      {/* Download progress overlay */}
      {downloading && (
        <View style={styles.downloadingBanner}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name="cloud-download" size={28} color={COLORS.primary} />
          </Animated.View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.downloadingTitle}>Downloading "{downloadingName}"</Text>
            <ProgressBar progress={progress} color={COLORS.primary} style={styles.progressBar} />
            <Text style={styles.downloadingLabel}>{progressLabel} ({Math.round(progress * 100)}%)</Text>
          </View>
        </View>
      )}

      {/* Region List */}
      <FlatList
        data={regions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderRegionCard}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={72} color="#CBD5C0" />
              <Text style={styles.emptyText}>No offline maps yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the button below to download a Sri Lanka region for use without internet.
              </Text>
            </View>
          )
        }
      />

      {/* FAB to open download modal */}
      {!downloading && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowDownloadModal(true)}>
          <MaterialCommunityIcons name="cloud-download-outline" size={26} color="#FFF" />
          <Text style={styles.fabLabel}>Download Region</Text>
        </TouchableOpacity>
      )}

      {/* Download Region Picker Modal */}
      <Modal
        visible={showDownloadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDownloadModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDownloadModal(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalDragBar} />
          <Text style={styles.modalTitle}>Choose a Region</Text>
          <Text style={styles.modalSubtitle}>Tiles from OpenStreetMap — works offline, no Google needed</Text>

          <FlatList
            data={SRI_LANKA_REGIONS}
            keyExtractor={(item) => item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => {
              const alreadySaved = regions.some(r => r.name === item.name);
              return (
                <TouchableOpacity
                  style={[styles.regionOption, alreadySaved && styles.regionOptionSaved]}
                  onPress={() => {
                    if (alreadySaved) {
                      Alert.alert('Already Downloaded', `"${item.name}" is already saved offline.`);
                      return;
                    }
                    Alert.alert(
                      `Download "${item.name}"`,
                      `Estimated size: ~${item.estimatedMB}\n\nThis will download map tiles for offline use. Make sure you are on Wi-Fi.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Download', onPress: () => handleDownload(item) },
                      ]
                    );
                  }}
                >
                  <View style={[styles.regionOptionIcon, alreadySaved && { backgroundColor: '#E8F5E9' }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={alreadySaved ? COLORS.primary : '#666'}
                    />
                  </View>
                  <View style={styles.regionOptionInfo}>
                    <Text style={styles.regionOptionName}>{item.name}</Text>
                    <Text style={styles.regionOptionMeta}>~{item.estimatedMB}</Text>
                  </View>
                  {alreadySaved ? (
                    <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.primary} />
                  ) : (
                    <MaterialCommunityIcons name="cloud-download-outline" size={22} color="#999" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#FFF' },
  headerSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#B2DFDB' },
  storageRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 14, marginTop: 8 },
  storageTxt: { fontSize: 13, color: '#E0F2F1', fontFamily: 'Outfit-Medium' },

  downloadingBanner: {
    margin: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  downloadingTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: COLORS.text, marginBottom: 8 },
  progressBar: { height: 6, borderRadius: 3 },
  downloadingLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 4 },

  listContent: { padding: 16, paddingBottom: 120 },

  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  regionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 16, fontFamily: 'Outfit-Bold', color: COLORS.text, marginBottom: 3 },
  regionMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub },
  deleteBtn: { padding: 6 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, padding: 24 },
  emptyText: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#546E7A', marginTop: 20, marginBottom: 10 },
  emptySubtext: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#78909C', textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 10,
  },
  fabLabel: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 0,
    maxHeight: '75%',
  },
  modalDragBar: { width: 44, height: 5, backgroundColor: '#DDD', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginBottom: 20, lineHeight: 18 },

  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 14,
  },
  regionOptionSaved: { opacity: 0.75 },
  regionOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionOptionInfo: { flex: 1 },
  regionOptionName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: COLORS.text },
  regionOptionMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.sub, marginTop: 2 },
});
