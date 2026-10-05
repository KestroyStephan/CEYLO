/**
 * ItineraryCache.js
 * Keeps the most recent itineraries on the phone so they open without a connection (FR-012).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cachedItineraries';
const MAX = 10;

export async function getCachedItineraries() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** Save or update one itinerary (matched by id), newest first. */
export async function cacheItinerary(itinerary) {
  if (!itinerary?.id) return;
  const list = (await getCachedItineraries()).filter(i => i.id !== itinerary.id);
  list.unshift({ ...itinerary, cachedAt: new Date().toISOString() });
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (e) {
    console.log('Could not cache itinerary:', e.message);
  }
}

export async function getLatestCachedItinerary(userId) {
  const list = await getCachedItineraries();
  return list.find(i => !userId || i.userId === userId) || null;
}
