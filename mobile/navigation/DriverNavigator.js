import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DriverDashboard from '../screens/DriverDashboard';
import DriverHistoryScreen from '../screens/driver/DriverHistoryScreen';
import DriverRideRequestsScreen from '../screens/driver/DriverRideRequestsScreen';
import DriverFeesScreen from '../screens/driver/DriverFeesScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

export default function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#006A3B',
        tabBarInactiveTintColor: 'rgba(63,73,65,0.4)',
        tabBarStyle: {
          backgroundColor: 'rgba(246,251,243,0.95)',
          borderTopWidth: 0,
          elevation: 8,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            DriverDashboard: 'speedometer-outline',
            DriverHistory: 'time-outline',
            DriverRide: 'car-outline',
            DriverFees: 'wallet-outline',
            DriverProfile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DriverDashboard" component={DriverDashboard} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="DriverHistory" component={DriverHistoryScreen} options={{ tabBarLabel: 'History' }} />
      <Tab.Screen name="DriverRide" component={DriverRideRequestsScreen} options={{ tabBarLabel: 'Ride' }} />
      <Tab.Screen name="DriverFees" component={DriverFeesScreen} options={{ tabBarLabel: 'Fees' }} />
      <Tab.Screen name="DriverProfile" component={DriverProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
