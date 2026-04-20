import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorOrderManagementScreen from '../screens/vendor/VendorOrderManagementScreen';
import VendorServiceListingScreen from '../screens/vendor/VendorServiceListingScreen';
import VendorRevenueScreen from '../screens/vendor/VendorRevenueScreen';
import VendorIncomingOrderScreen from '../screens/vendor/VendorIncomingOrderScreen';
import VendorChatScreen from '../screens/vendor/VendorChatScreen';
import BookingManagementScreen from '../screens/vendor/BookingManagementScreen';
import ProofOfServiceScreen from '../screens/vendor/ProofOfServiceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function VendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 62, paddingBottom: 10, paddingTop: 6,
          backgroundColor: '#fff', borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tab.Screen
        name="VendorDashboard"
        component={VendorDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="VendorOrders"
        component={BookingManagementScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="VendorServices"
        component={VendorServiceListingScreen}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="store" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="VendorRevenue"
        component={VendorRevenueScreen}
        options={{
          tabBarLabel: 'Revenue',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function VendorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorTabs" component={VendorTabs} />
      <Stack.Screen name="VendorIncomingOrder" component={VendorIncomingOrderScreen} />
      <Stack.Screen name="VendorChat" component={VendorChatScreen} />
      <Stack.Screen name="ProofOfService" component={ProofOfServiceScreen} />
      {/* VendorOrderManagement used inside BookingManagementScreen via navigation */}
      <Stack.Screen name="VendorOrderManagement" component={VendorOrderManagementScreen} />
    </Stack.Navigator>
  );
}
