// config.js
// Global configuration for the CEYLO mobile app

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Set this to true when deploying the app for production (APK)
const IS_PRODUCTION = true;

// The URL of your deployed backend (e.g., Render, Railway, Heroku)
const PRODUCTION_API_URL = 'https://ceylo.onrender.com';

// Local development URL (handles Android emulator networking automatically)
const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

// EXPO_PUBLIC_BACKEND_URL (in mobile/.env) overrides both, e.g. http://192.168.1.10:5000 for a phone on LAN
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || (IS_PRODUCTION ? PRODUCTION_API_URL : LOCAL_API_URL);

// Mobile number of the CEYLO emergency desk that receives the SMS when SOS is triggered without
// internet. Set EXPO_PUBLIC_SOS_SMS_NUMBER in mobile/.env; if unset, the traveller chooses a contact.
export const SOS_SMS_NUMBER = process.env.EXPO_PUBLIC_SOS_SMS_NUMBER || null;

// Google Maps Platform key for Places and Directions calls. Falls back to the key the native map
// already uses (app.json, exposed through app.config.js) so an APK built without mobile/.env still works.
export const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  || Constants.expoConfig?.extra?.mapsApiKey   // copied from app.json by app.config.js
  || Constants.expoConfig?.android?.config?.googleMaps?.apiKey
  || '';

// Agora project for in-app voice calls (the App ID is a public identifier, not a secret; the
// App Certificate stays on the backend only). EXPO_PUBLIC_AGORA_APP_ID overrides it.
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '9b2ecc9f5f46409fa28e65940fa84c3e';
