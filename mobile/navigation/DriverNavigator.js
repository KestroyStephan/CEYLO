import { useTranslation } from 'react-i18next';
import React from 'react';
import useTabBarStyle from '../utils/useTabBarStyle';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DriverDashboard from '../screens/DriverDashboard';
import DriverHistoryScreen from '../screens/driver/DriverHistoryScreen';
import DriverRideRequestsScreen from '../screens/driver/DriverRideRequestsScreen';
import DriverFeesScreen from '../screens/driver/DriverFeesScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();

export default function DriverNavigator() {
  const { t } = useTranslation();
  const tabBarStyle = useTabBarStyle({ backgroundColor: 'rgba(246,251,243,0.95)', borderTopWidth: 0, elevation: 8 });
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#006A3B',
        tabBarInactiveTintColor: 'rgba(63,73,65,0.4)',
        tabBarHideOnKeyboard: true,
        tabBarStyle,
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
      <Tab.Screen name="DriverDashboard" component={DriverDashboard} options={{ tabBarLabel: t('p_dashboard') }} />
      <Tab.Screen name="DriverHistory" component={DriverHistoryScreen} options={{ tabBarLabel: t('p_history') }} />
      <Tab.Screen name="DriverRide" component={DriverRideRequestsScreen} options={{ tabBarLabel: t('p_ride') }} />
      <Tab.Screen name="DriverFees" component={DriverFeesScreen} options={{ tabBarLabel: t('p_fees') }} />
      <Tab.Screen name="DriverProfile" component={DriverProfileScreen} options={{ tabBarLabel: t('tab_profile') }} />
    </Tab.Navigator>
  );
}
