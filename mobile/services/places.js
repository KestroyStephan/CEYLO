/**
 * places.js
 * Live points of interest from Google Places around a position: places of worship for travellers
 * and fuel stations / services for drivers. Nothing here is hard-coded; results come from the
 * Places API for the position given.
 */
import { Linking } from 'react-native';
import { distanceKm } from './ItineraryService';
import { MAPS_API_KEY } from '../config';

const KEY = MAPS_API_KEY;
const NEARBY = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

// Google has types for churches, Hindu temples and mosques; Buddhist temples are found by keyword
export const WORSHIP_KINDS = {
  buddhist: { short: 'Temples', label: 'Buddhist temple', icon: 'dharmachakra', color: '#B26A00', query: { type: 'place_of_worship', keyword: 'buddhist temple vihara' } },
  hindu: { short: 'Kovils', label: 'Hindu kovil', icon: 'om', color: '#C2185B', query: { type: 'hindu_temple' } },
  church: { short: 'Churches', label: 'Church', icon: 'church', color: '#1F5F99', query: { type: 'church' } },
  mosque: { short: 'Mosques', label: 'Mosque', icon: 'mosque', color: '#166534', query: { type: 'mosque' } },
};

async function search(coords, { type, keyword }, radius) {
  if (!KEY) throw new Error('Maps key not configured');
  const params = new URLSearchParams({ location: `${coords.latitude},${coords.longitude}`, radius: String(radius), key: KEY });
  if (type) params.set('type', type);
  if (keyword) params.set('keyword', keyword);
  const res = await fetch(`${NEARBY}?${params}`);
  const json = await res.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') throw new Error(json.error_message || json.status);
  return json.results || [];
}

const normalise = (p, coords, kind) => {
  const loc = p.geometry?.location || {};
  return {
    id: p.place_id,
    name: p.name,
    kind,
    address: p.vicinity || '',
    latitude: loc.lat,
    longitude: loc.lng,
    distanceKm: distanceKm(coords.latitude, coords.longitude, loc.lat, loc.lng),
    rating: p.rating || null,
    ratings: p.user_ratings_total || 0,
    openNow: p.opening_hours ? p.opening_hours.open_now : null,
    priceLevel: p.price_level || null,
  };
};

/** Temples, kovils, churches and mosques within radius metres, nearest first. */
export async function nearbyWorship(coords, radius = 5000) {
  const seen = new Set();
  const out = [];
  const results = await Promise.allSettled(Object.entries(WORSHIP_KINDS).map(async ([kind, k]) => ({ kind, list: await search(coords, k.query, radius) })));
  results.forEach(r => {
    if (r.status !== 'fulfilled') return;
    r.value.list.forEach(p => {
      if (seen.has(p.place_id)) return;
      seen.add(p.place_id);
      out.push(normalise(p, coords, r.value.kind));
    });
  });
  if (out.length === 0 && results.every(r => r.status === 'rejected')) throw results[0].reason;
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Fuel stations (and other driver services) within radius metres, nearest first. */
export async function nearbyOfType(coords, type, radius = 5000) {
  return (await search(coords, { type }, radius)).map(p => normalise(p, coords, type)).sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Turn-by-turn navigation in Google Maps to a place. */
export function openDirections(place, mode = 'driving') {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    + (place.id ? `&destination_place_id=${encodeURIComponent(place.id)}` : '') + `&travelmode=${mode}`;
  return Linking.openURL(url);
}

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
