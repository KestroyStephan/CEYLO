
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, connectAuthEmulator } from "firebase/auth";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
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

// Local testing: start Metro with EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost to use the Firebase
// emulators (sign-in on 9099, Firestore on 8085) with dummy accounts instead of the live project.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
if (emulatorHost) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8085);
}
