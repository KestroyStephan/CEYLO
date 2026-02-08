import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

import HomeScreen from './screens/HomeScreen';
import DriverDashboard from './screens/DriverDashboard';
import GuideDashboard from './screens/GuideDashboard';
import ChatbotScreen from './screens/ChatbotScreen'; // Still accessible to all? Or conditionally?
import MainTabNavigator from './navigation/MainTabNavigator';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const Stack = createNativeStackNavigator();

const MAX_LOGIN_DAYS = 7; // Keep logged in for 7 days

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async (currentUser) => {
      if (currentUser) {
        try {
          // Check session expiry logic (existing)
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

          // Fetch Role
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole('tourist'); // Default
          }

        } catch (error) {
          console.log("Session check note:", error.message); // Changed to log to avoid Red Screen
          // If we can't read the profile (likely rule issue or new user), default to tourist
          setUserRole('tourist');
        }
      } else {
        setUserRole(null);
      }
      setUser(currentUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      checkSession(authUser);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00695c" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Group>
              {userRole === 'driver' ? (
                <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
              ) : userRole === 'guide' ? (
                <Stack.Screen name="GuideDashboard" component={GuideDashboard} />
              ) : (
                <Stack.Screen name="Main" component={MainTabNavigator} />
              )}
              <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            </Stack.Group>
          ) : (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
