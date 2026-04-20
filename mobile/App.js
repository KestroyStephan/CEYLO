import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

import './i18n'; // Import i18n configuration
import { theme } from './Theme';

import SplashScreen from './screens/auth/SplashScreen';
import LanguageSelectScreen from './screens/onboarding/LanguageSelectScreen';
import MoodSelectScreen from './screens/onboarding/MoodSelectScreen';
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

import MainTabNavigator from './navigation/MainTabNavigator';
import DriverDashboard from './screens/DriverDashboard';
import GuideDashboard from './screens/GuideDashboard';
import ChatbotScreen from './screens/ChatbotScreen';
import MapScreen from './screens/MapScreen';
import DestinationDetailScreen from './screens/DestinationDetailScreen';
import ItineraryDetailScreen from './screens/ItineraryDetailScreen';
import TransportScreen from './screens/TransportScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import EcoPassportScreen from './screens/EcoPassportScreen';

import { doc, getDoc } from 'firebase/firestore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        await Font.loadAsync({
          'Outfit-Regular': Outfit_400Regular,
          'Outfit-Medium': Outfit_500Medium,
          'Outfit-SemiBold': Outfit_600SemiBold,
          'Outfit-Bold': Outfit_700Bold,
        });

        const onboarded = await AsyncStorage.getItem('onboarding-completed');
        setIsOnboarded(onboarded === 'true');

        setFontsLoaded(true);
      } catch (e) {
        console.warn(e);
      }
    }
    loadResources();
  }, []);

  useEffect(() => {
    const checkSession = async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setUserRole(data.role);
          } else {
            setUserRole('tourist');
          }
        } catch (error) {
          console.log("Session check note:", error.message);
          setUserRole('tourist');
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setUser(currentUser);
      if (fontsLoaded) setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      checkSession(authUser);
    });
    return unsubscribe;
  }, [fontsLoaded]);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#00695C" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Group>
              {/* Show Mood selection if tourist hasn't completed it */}
              {userRole === 'tourist' && !userData?.onboardingCompleted ? (
                <Stack.Screen name="MoodSelect" component={MoodSelectScreen} />
              ) : null}

              {userRole === 'driver' ? (
                <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
              ) : userRole === 'guide' ? (
                <Stack.Screen name="GuideDashboard" component={GuideDashboard} />
              ) : (
                <Stack.Screen name="Main" component={MainTabNavigator} />
              )}
              <Stack.Screen name="Chatbot" component={ChatbotScreen} />
              <Stack.Screen name="MapScreen" component={MapScreen} />
              <Stack.Screen name="DestinationDetail" component={DestinationDetailScreen} />
              <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
              <Stack.Screen name="Transport" component={TransportScreen} />
              <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
              <Stack.Screen name="EcoPassport" component={EcoPassportScreen} />
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
  );
}





