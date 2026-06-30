// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

import VendorDashboardScreen    from '../screens/vendor/VendorDashboardScreen';
import BookingManagementScreen  from '../screens/vendor/BookingManagementScreen';
import VendorServiceListingScreen from '../screens/vendor/VendorServiceListingScreen';
import VendorRevenueScreen      from '../screens/vendor/VendorRevenueScreen';
import VendorIncomingOrderScreen from '../screens/vendor/VendorIncomingOrderScreen';
import VendorOrderManagementScreen from '../screens/vendor/VendorOrderManagementScreen';
import VendorChatScreen         from '../screens/vendor/VendorChatScreen';
import ProofOfServiceScreen     from '../screens/vendor/ProofOfServiceScreen';
import AddNewProductScreen      from '../screens/vendor/AddNewProductScreen';
import VendorRegistrationScreen from '../screens/vendor/VendorRegistrationScreen';
import VendorPendingScreen      from '../screens/vendor/VendorPendingScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PRIMARY   = '#006A3B';
const INACTIVE  = 'rgba(63,73,65,0.4)';
const BG_NAV    = 'rgba(246,251,243,0.95)';

function VendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
          backgroundColor: BG_NAV,
          borderTopWidth: 0.5,
          borderTopColor: '#BECABE',
          position: 'absolute',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            VendorHome:     focused ? 'grid'         : 'grid-outline',
            VendorOrders:   focused ? 'receipt'      : 'receipt-outline',
            VendorServices: focused ? 'storefront'   : 'storefront-outline',
            VendorRevenue:  focused ? 'bar-chart'    : 'bar-chart-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="VendorHome"     component={VendorDashboardScreen}    options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="VendorOrders"   component={BookingManagementScreen}   options={{ tabBarLabel: 'Orders' }} />
      <Tab.Screen name="VendorServices" component={VendorServiceListingScreen} options={{ tabBarLabel: 'Services' }} />
      <Tab.Screen name="VendorRevenue"  component={VendorRevenueScreen}       options={{ tabBarLabel: 'Revenue' }} />
    </Tab.Navigator>
  );
}

export default function VendorNavigator() {
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setRole(snap.data().role);
      setLoading(false);
    }, err => {
      console.log("VendorNavigator doc listener error:", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Determine initial screen based on role
  const isActive   = role === 'vendor_active' || role === 'vendor';
  const isPending  = role === 'vendor_pending' || role === 'vendor_rejected';
  const isOnboard  = role === 'vendor_onboarding';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isActive ? (
        <>
          <Stack.Screen name="VendorTabs"            component={VendorTabs} />
          <Stack.Screen name="VendorIncomingOrder"   component={VendorIncomingOrderScreen}
            options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="VendorOrderManagement" component={VendorOrderManagementScreen} />
          <Stack.Screen name="VendorChat"            component={VendorChatScreen} />
          <Stack.Screen name="ProofOfService"        component={ProofOfServiceScreen} />
          <Stack.Screen name="AddNewProduct"         component={AddNewProductScreen}
            options={{ presentation: 'modal' }} />
        </>
      ) : isPending ? (
        <Stack.Screen name="VendorPending"       component={VendorPendingScreen} />
      ) : (
        <Stack.Screen name="VendorRegistration"  component={VendorRegistrationScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6FBF3' },
});
