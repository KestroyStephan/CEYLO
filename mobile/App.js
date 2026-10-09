import 'react-native-get-random-values';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import './i18n';
import { View, Text, ActivityIndicator, LogBox, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { OfflineQueue } from './services/OfflineQueue';
import { ToastHost } from './components/Toast';
import { DialogHost } from './components/Dialog';
import CallHost from './components/CallHost';
import { NotificationService } from './services/NotificationService';
// Registers the background geofencing task; must run at start-up
import './services/GeofenceService';

// Suppress known unavoidable deprecation warnings
LogBox.ignoreLogs([
  'Method getInfoAsync imported from "expo-file-system" is deprecated',
  'Method makeDirectoryAsync imported from "expo-file-system" is deprecated',
  'Method downloadAsync imported from "expo-file-system" is deprecated',
  'Method deleteAsync imported from "expo-file-system" is deprecated',
  'expo-notifications',
]);

// Auth Screens
import SplashScreen from './screens/auth/SplashScreen';
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import RolePickerScreen from './screens/auth/RolePickerScreen';
import LanguageSelectScreen from './screens/onboarding/LanguageSelectScreen';
import GuideOnboardingScreen from './screens/onboarding/GuideOnboardingScreen';

// Core Screens
import HomeScreen from './screens/HomeScreen';
import DriverNavigator from './navigation/DriverNavigator';
import ActiveRideScreen from './screens/driver/ActiveRideScreen';
import RideTrackingScreen from './screens/RideTrackingScreen';
import GuideDashboard from './screens/GuideDashboard';
import GuideNavigator from './navigation/GuideNavigator';
import ChatbotScreen from './screens/ChatbotScreen';
import ItineraryScreen from './screens/ItineraryScreen';
import MapScreen from './screens/MapScreen';
import DestinationDetailScreen from './screens/DestinationDetailScreen';
import HiddenGemsListScreen from './screens/HiddenGemsListScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import TransportScreen from './screens/TransportScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import EcoPassportScreen from './screens/EcoPassportScreen';
import TravelPreferencesScreen from './screens/TravelPreferencesScreen';
import ConsentScreen from './screens/ConsentScreen';
import PhoneLoginScreen from './screens/auth/PhoneLoginScreen';
import ResearchSurveyScreen from './screens/ResearchSurveyScreen';
import RouteGuideScreen from './screens/RouteGuideScreen';
import SavedPlacesScreen from './screens/SavedPlacesScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import MyOrdersScreen from './screens/MyOrdersScreen';
import CulturalEventsScreen from './screens/CulturalEventsScreen';
import MoodSelectScreen from './screens/onboarding/MoodSelectScreen';
import SOSScreen from './screens/SOSScreen';
import GuidesListScreen from './screens/GuidesListScreen';
import MessageScreen from './screens/MessageScreen';

import GuideProfileScreen from './screens/GuideProfileScreen';
import ConfirmBookingScreen from './screens/ConfirmBookingScreen';
import GuidePendingScreen from './screens/onboarding/GuidePendingScreen';
import WaitingApprovalScreen from './screens/WaitingApprovalScreen';
import EditProfileScreen from './screens/EditProfileScreen';

// Navigation
import DrawerNavigator from './navigation/DrawerNavigator';
import OfflineMapSettings from './screens/OfflineMapSettings';
import EventDetailScreen from './screens/EventDetailScreen';
import SustainableRoutesListScreen from './screens/SustainableRoutesListScreen';

// Vendor portal
import VendorNavigator from './navigation/VendorNavigator';
import VendorRegistrationScreen from './screens/vendor/VendorRegistrationScreen';
import VendorPendingScreen from './screens/vendor/VendorPendingScreen';
import { warmUpBackend } from './services/aiClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Driver approval gate
import DriverPendingScreen from './screens/driver/DriverPendingScreen';
import NearbyPlacesScreen from './screens/NearbyPlacesScreen';

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
  // Maintenance mode from the admin portal (Settings); staff and partners are not blocked
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'system_config', 'global'),
      snap => setMaintenance(Boolean(snap.exists() && snap.data().maintenanceMode)),
      () => setMaintenance(false));
  }, [user]);
  const [loading, setLoading] = useState(true);
  // The screens style text with these family names
  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  });
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    warmUpBackend();
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
        setLoading(true);
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
              setUserData(null);
              setLoading(false);
              return;
            }
          } else {
            await AsyncStorage.setItem('lastLoginDate', new Date().toISOString());
          }

          if (currentUser.isAnonymous) {
            setUserRole('tourist');
            setUser(currentUser);
            setLoading(false);
            return;
          }

          // Real-time listener for user role updates
          unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data.isBanned) {
                Alert.alert('Account Suspended', 'Your account has been suspended. Please contact support@ceylo.lk.');
                signOut(auth);
                return;
              }
              setUserRole(data.role || 'tourist');
              setUserData(data);
              setUser(currentUser);
              setLoading(false);
            } else {
              const createdMs = Date.parse(currentUser.metadata?.creationTime || '') || 0;
              if (Date.now() - createdMs < 20000) {
                // Registration is still writing the profile with the chosen role; wait for the next snapshot
                return;
              }
              setUserRole('tourist');
              setUser(currentUser);
              setLoading(false);
            }
          }, (error) => {
            console.log('User document listener error:', error.message);
            setUserRole('tourist');
            setUser(currentUser);
            setLoading(false);
          });

        } catch (error) {
          console.log('Session check error:', error.message);
          setUserRole('tourist');
          setUser(currentUser);
          setLoading(false);
        }
      } else {
        // The 7-day window starts at each sign-in, so forget the previous session's date
        await AsyncStorage.removeItem('lastLoginDate');
        setUser(null);
        setUserRole(null);
        setUserData(null);
        setLoading(false);
      }
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

  // Register the push token for whoever signs in during this session
  useEffect(() => {
    if (user && !user.isAnonymous && navigationRef.current) {
      NotificationService.init(navigationRef.current);
    }
  }, [user]);

  if (maintenance && (userRole === 'tourist' || user?.isAnonymous)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F6FBF5' }}>
        <Text style={{ fontSize: 22, fontFamily: 'Outfit-Bold', color: '#004D40', marginBottom: 8 }}>Back shortly</Text>
        <Text style={{ fontSize: 15, fontFamily: 'Outfit-Regular', color: '#4A5E4A', textAlign: 'center', lineHeight: 22 }}>
          CEYLO is being updated. In an emergency call 119 (Police) or 1990 (Ambulance).
        </Text>
      </View>
    );
  }

  if (loading || (!fontsLoaded && !fontError) || (user && !userRole && !user.isAnonymous)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6FBF5' }}>
        <ActivityIndicator size="large" color="#00695c" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
                {/* Research consent, once per account (ethics, Sprint 4) */}
                {userRole === 'tourist' && userData && !userData.consent ? (
                  <Stack.Screen name="Consent" component={ConsentScreen} />
                ) : null}

                {userRole === 'tourist' && !userData?.onboardingCompleted ? (
                  <Stack.Screen name="MoodSelect" component={MoodSelectScreen} />
                ) : null}

                {(userRole === 'driver' || userRole === 'driver_active') ? (
                  <Stack.Screen name="DriverDashboard" component={DriverNavigator} />
                ) : (userRole === 'driver_pending' || userRole === 'driver_rejected') ? (
                  <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
                ) : userRole === 'guide' ? (
                  <Stack.Screen name="GuideNavigator" component={GuideNavigator} />
                ) : (userRole === 'vendor' || userRole === 'vendor_active') ? (
                  <Stack.Screen name="VendorPortal" component={VendorNavigator} />
                ) : userRole === 'vendor_onboarding' ? (
                  <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
                ) : userRole === 'guide_pending' && !userData?.onboardingCompleted ? (
                  <Stack.Screen name="GuideOnboarding" component={GuideOnboardingScreen} />
                ) : userRole === 'guide_pending' && userData?.onboardingCompleted ? (
                  <Stack.Screen name="GuidePending" component={GuidePendingScreen} />
                ) : (userRole === 'guide_rejected') ? (
                  <Stack.Screen name="GuidePending" component={GuidePendingScreen} />
                ) : (userRole === 'vendor_pending' || userRole === 'vendor_rejected') ? (
                  <Stack.Screen name="VendorPending" component={VendorPendingScreen} />
                ) : (
                  <Stack.Screen name="Main" component={DrawerNavigator} />
                )}

                {/* Common Screens */}
                <Stack.Screen name="Chatbot" component={ChatbotScreen} />
                <Stack.Screen name="Itinerary" component={ItineraryScreen} />
                <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
                <Stack.Screen name="RideTracking" component={RideTrackingScreen} />
                <Stack.Screen name="MapScreen" component={MapScreen} />
                <Stack.Screen name="HiddenGemsList" component={HiddenGemsListScreen} />
                <Stack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
                <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
                <Stack.Screen name="Transport" component={TransportScreen} />
                <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
                <Stack.Screen name="EcoPassport" component={EcoPassportScreen} />
                <Stack.Screen name="TravelPreferences" component={TravelPreferencesScreen} />
                <Stack.Screen name="ResearchSurvey" component={ResearchSurveyScreen} />
                <Stack.Screen name="RouteGuide" component={RouteGuideScreen} />
                <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
                <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
                <Stack.Screen name="CulturalEvents" component={CulturalEventsScreen} />
                <Stack.Screen name="SOSScreen" component={SOSScreen} />
                <Stack.Screen name="GuidesList" component={GuidesListScreen} />
                <Stack.Screen name="GuideProfile" component={GuideProfileScreen} />
                <Stack.Screen name="ConfirmBooking" component={ConfirmBookingScreen} />
                <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
                <Stack.Screen name="MessageScreen" component={MessageScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />

                {/* Vendor & Utility Screens from Main */}
                {/* Not for vendors mid-application: a screen with the same name would keep the form
                    open after submitting instead of moving on to the pending-review screen */}
                {!['vendor_onboarding', 'vendor_pending', 'vendor_rejected'].includes(userRole) && (
                  <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
                )}
                <Stack.Screen name="OfflineMapSettings" component={OfflineMapSettings} />
                <Stack.Screen name="NearbyPlaces" component={NearbyPlacesScreen} />
                <Stack.Screen name="EventDetail" component={EventDetailScreen} />
                <Stack.Screen name="SustainableRoutesList" component={SustainableRoutesListScreen} />
              </Stack.Group>
            ) : (
              <Stack.Group>
                {!isOnboarded && <Stack.Screen name="Splash" component={SplashScreen} />}
                <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="RolePicker" component={RolePickerScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <ToastHost />
        <DialogHost />
        <CallHost />
      </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
