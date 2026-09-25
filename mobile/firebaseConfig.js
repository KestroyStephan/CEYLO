
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace these values with your actual Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACNB5L3HjIjZIwuYA4T-f6cUFt-G4NOk8",
    authDomain: "ceylo-app.firebaseapp.com",
    projectId: "ceylo-app",
    storageBucket: "ceylo-app.firebasestorage.app",
    messagingSenderId: "8889588910",
    appId: "1:8889588910:android:ce17460e21616d075ea13f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth conditionally based on Platform
let auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
}
export { auth };

export const db = getFirestore(app);
export const storage = getStorage(app);
