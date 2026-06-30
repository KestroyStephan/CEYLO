import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import './i18n';
import { View, ActivityIndicator, LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineQueue } from './services/OfflineQueue';
import { NotificationService } from './services/NotificationService';

// Suppress common warnings that are unavoidable or web-specific
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'Animated: `useNativeDriver` is not supported'
]);

// Auth Screens
import SplashScreen from './screens/auth/SplashScreen';
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import LanguageSelectScreen from './screens/onboarding/LanguageSelectScreen';

// Core Screens
import HomeScreen from './screens/HomeScreen';
import DriverDashboard from './screens/DriverDashboard';
import GuideDashboard from './screens/GuideDashboard';
import ChatbotScreen from './screens/ChatbotScreen';
import MapScreen from './screens/MapScreen';
import DestinationDetailScreen from './screens/DestinationDetailScreen';
import HiddenGemsListScreen from './screens/HiddenGemsListScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import TransportScreen from './screens/TransportScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import EcoPassportScreen from './screens/EcoPassportScreen';
import CulturalEventsScreen from './screens/CulturalEventsScreen';
import MoodSelectScreen from './screens/onboarding/MoodSelectScreen';

// Navigation
import MainTabNavigator from './navigation/MainTabNavigator';
import OfflineMapSettings from './screens/OfflineMapSettings';
import EventDetailScreen from './screens/EventDetailScreen';

// Vendor portal
import VendorNavigator from './navigation/VendorNavigator';
import VendorRegistrationScreen from './screens/vendor/VendorRegistrationScreen';
import VendorPendingScreen from './screens/vendor/VendorPendingScreen';

const Stack = createNativeStackNavigator();
const navigationRef = React.createRef();

const MAX_LOGIN_DAYS = 7;

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00695c',
    secondary: '#004d40',
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    OfflineQueue.startListening();
    return () => OfflineQueue.stopListening();
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      const onboarded = await AsyncStorage.getItem('userOnboarded');
      setIsOnboarded(!!onboarded);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    let unsubUser = null;

    const checkSession = async (currentUser) => {
      if (currentUser) {
        try {
          const lastLoginDate = await AsyncStorage.getItem('lastLoginDate');
          if (lastLoginDate) {
            const loginDate = new Date(lastLoginDate);
            const currentDate = new Date();
            const diffDays = Math.abs(currentDate - loginDate) / (1000 * 60 * 60 * 24);

            if (diffDays > MAX_LOGIN_DAYS) {
              await signOut(auth);
              await AsyncStorage.removeItem('lastLoginDate');
              setUser(null);
              setUserRole(null);
              setLoading(false);
              return;
            }
          } else {
            await AsyncStorage.setItem('lastLoginDate', new Date().toISOString());
          }

          // Real-time listener for user role updates
          unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserRole(data.role);
              setUserData(data);
            } else {
              setUserRole('tourist');
            }
            setLoading(false);
          }, (error) => {
            console.log('User document listener error:', error.message);
            setUserRole('tourist');
            setLoading(false);
          });

        } catch (error) {
          console.log('Session check error:', error.message);
          setUserRole('tourist');
          setLoading(false);
        }
      } else {
        setUserRole(null);
        setUserData(null);
        setLoading(false);
      }
      setUser(currentUser);
    };

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }
      checkSession(authUser);
    });

    return () => {
      unsubscribe();
      if (unsubUser) {
        unsubUser();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00695c" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            if (NotificationService.init) {
              NotificationService.init(navigationRef.current);
            }
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <Stack.Group>
                {/* Role-based entry screens */}
                {userRole === 'tourist' && !userData?.onboardingCompleted ? (
                   <Stack.Screen name="MoodSelect" component={MoodSelectScreen} />
                ) : null}

                {userRole === 'driver' ? (
                  <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
                ) : userRole === 'guide' ? (
                  <Stack.Screen name="GuideDashboard" component={GuideDashboard} />
                ) : (userRole === 'vendor' || userRole === 'vendor_active') ? (
                  <Stack.Screen name="VendorPortal" component={VendorNavigator} />
                ) : userRole === 'vendor_onboarding' ? (
                  <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
                ) : (userRole === 'vendor_pending' || userRole === 'vendor_rejected') ? (
                  <Stack.Screen name="VendorPending" component={VendorPendingScreen} />
                ) : (
                  <Stack.Screen name="Main" component={MainTabNavigator} />
                )}

                {/* Common Screens */}
                <Stack.Screen name="Chatbot" component={ChatbotScreen} />
                <Stack.Screen name="MapScreen" component={MapScreen} />
                <Stack.Screen name="HiddenGemsList" component={HiddenGemsListScreen} />
                <Stack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
                <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
                <Stack.Screen name="Transport" component={TransportScreen} />
                <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
                <Stack.Screen name="EcoPassport" component={EcoPassportScreen} />
                <Stack.Screen name="CulturalEvents" component={CulturalEventsScreen} />
                
                {/* Vendor & Utility Screens from Main */}
                {userRole !== 'vendor_onboarding' && (
                  <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
                )}
                <Stack.Screen name="OfflineMapSettings" component={OfflineMapSettings} />
                <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              </Stack.Group>
            ) : (
              <Stack.Group>
                {!isOnboarded && <Stack.Screen name="Splash" component={SplashScreen} />}
                <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
