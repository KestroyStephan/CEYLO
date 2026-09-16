// config.js
// Global configuration for the CEYLO mobile app

import { Platform } from 'react-native';

// Set this to true when deploying the app for production (APK)
const IS_PRODUCTION = true;

// The URL of your deployed backend (e.g., Render, Railway, Heroku)
const PRODUCTION_API_URL = 'https://ceylo.onrender.com';

// Local development URL (handles Android emulator networking automatically)
const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const API_BASE_URL = IS_PRODUCTION ? PRODUCTION_API_URL : LOCAL_API_URL;
