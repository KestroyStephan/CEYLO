/**
 * offlineMapUtils.js
 * Utility to download OpenStreetMap tile images to local storage for offline use.
 * Works without Google Play Services.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAPS_DIR = `${FileSystem.documentDirectory}maps/`;
const STORAGE_KEY = 'offline_regions';

/** Convert lat/lon + zoom to tile x,y */
function latLonToTile(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/** Get all tile coords for a bounding box at a given zoom level */
function getTilesForBounds(minLat, maxLat, minLon, maxLon, zoom) {
  const topLeft = latLonToTile(maxLat, minLon, zoom);
  const bottomRight = latLonToTile(minLat, maxLon, zoom);
  const tiles = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

/** Download a single tile to local filesystem */
async function downloadTile(regionId, z, x, y) {
  const dir = `${MAPS_DIR}${regionId}/${z}/${x}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const filePath = `${dir}${y}.png`;
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) return filePath; // Already downloaded

  const url = OSM_TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  await FileSystem.downloadAsync(url, filePath);
  return filePath;
}

/**
 * Download all tiles for a named region.
 * @param {string} name - Display name (e.g. "Colombo Area")
 * @param {object} bounds - { minLat, maxLat, minLon, maxLon }
 * @param {number[]} zooms - Array of zoom levels e.g. [10, 11, 12]
 * @param {function} onProgress - (downloaded, total) => void
 * @returns {object} saved region metadata
 */
export async function downloadRegion(name, bounds, zooms, onProgress) {
  const regionId = `region_${Date.now()}`;
  const allTiles = [];
  for (const zoom of zooms) {
    const tiles = getTilesForBounds(
      bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon, zoom
    );
    allTiles.push(...tiles);
  }

  let downloaded = 0;
  const total = allTiles.length;

  for (const tile of allTiles) {
    try {
      await downloadTile(regionId, tile.z, tile.x, tile.y);
    } catch (e) {
      // Skip failed tiles silently
    }
    downloaded++;
    if (onProgress) onProgress(downloaded, total);
  }

  // Calculate downloaded size
  const dirInfo = await FileSystem.getInfoAsync(`${MAPS_DIR}${regionId}/`);
  const sizeBytes = dirInfo.size || (total * 8 * 1024); // Estimate ~8KB per tile

  const regionMeta = {
    id: regionId,
    name,
    bounds,
    zooms,
    tileCount: total,
    size: sizeBytes,
    downloadedAt: new Date().toISOString(),
  };

  // Persist to AsyncStorage
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const existing = stored ? JSON.parse(stored) : [];
  existing.push(regionMeta);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  return regionMeta;
}

/** Get local tile file URI (for use in map rendering) */
export function getLocalTileUri(regionId, z, x, y) {
  return `${MAPS_DIR}${regionId}/${z}/${x}/${y}.png`;
}

/** Delete a region by id */
export async function deleteRegion(regionId) {
  const dir = `${MAPS_DIR}${regionId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const existing = JSON.parse(stored).filter(r => r.id !== regionId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Load all saved regions */
export async function loadRegions() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Pre-defined Sri Lanka regions for quick download
export const SRI_LANKA_REGIONS = [
  {
    name: 'Colombo & Western',
    bounds: { minLat: 6.8, maxLat: 7.4, minLon: 79.8, maxLon: 80.2 },
    zooms: [10, 11, 12],
    estimatedMB: '18 MB',
    icon: 'city',
  },
  {
    name: 'Kandy & Central',
    bounds: { minLat: 6.9, maxLat: 7.5, minLon: 80.5, maxLon: 80.9 },
    zooms: [10, 11, 12],
    estimatedMB: '16 MB',
    icon: 'temple-buddhist',
  },
  {
    name: 'Galle & Southern Coast',
    bounds: { minLat: 5.9, maxLat: 6.4, minLon: 80.0, maxLon: 81.0 },
    zooms: [10, 11, 12],
    estimatedMB: '22 MB',
    icon: 'beach',
  },
  {
    name: 'Sigiriya & Ancient Cities',
    bounds: { minLat: 7.8, maxLat: 8.5, minLon: 80.0, maxLon: 81.0 },
    zooms: [10, 11, 12],
    estimatedMB: '20 MB',
    icon: 'chess-rook',
  },
  {
    name: 'Ella & Uva Highlands',
    bounds: { minLat: 6.7, maxLat: 7.1, minLon: 80.9, maxLon: 81.5 },
    zooms: [10, 11, 12],
    estimatedMB: '14 MB',
    icon: 'image-filter-hdr',
  },
  {
    name: 'All Sri Lanka (Overview)',
    bounds: { minLat: 5.9, maxLat: 9.9, minLon: 79.5, maxLon: 82.0 },
    zooms: [7, 8, 9],
    estimatedMB: '8 MB',
    icon: 'map',
  },
];
