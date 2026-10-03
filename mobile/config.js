// config.js
// Global configuration for the CEYLO mobile app

import { Platform } from 'react-native';

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
