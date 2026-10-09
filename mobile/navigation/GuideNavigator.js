import { useTranslation } from 'react-i18next';
import React from 'react';
import useTabBarStyle from '../utils/useTabBarStyle';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import GuideDashboard from '../screens/GuideDashboard';
import GuideBookingsScreen from '../screens/GuideBookingsScreen';
import GuideDiscoverScreen from '../screens/GuideDiscoverScreen';
import SOSScreen from '../screens/SOSScreen';
import GuideAvailabilityScreen from '../screens/GuideAvailabilityScreen';
import GuideServicesScreen from '../screens/GuideServicesScreen';
import MapScreen from '../screens/MapScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MessageScreen from '../screens/MessageScreen';
import GuideEarningsScreen from '../screens/GuideEarningsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function GuideHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GuideDashboardMain" component={GuideDashboard} />
      <Stack.Screen name="GuideAvailability" component={GuideAvailabilityScreen} />
      <Stack.Screen name="GuideServices" component={GuideServicesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MessageScreen" component={MessageScreen} />
      <Stack.Screen name="GuideEarnings" component={GuideEarningsScreen} />
    </Stack.Navigator>
  );
}

export default function GuideNavigator() {
  const { t } = useTranslation();
  const tabBarStyle = useTabBarStyle({ backgroundColor: '#FFF', borderTopColor: '#EEF2EE', borderTopWidth: 1 });
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar-check' : 'calendar-check-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'SOS') {
            iconName = focused ? 'bell' : 'bell-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#006A3B',
        tabBarInactiveTintColor: '#8A9E8A',
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Outfit-Medium',
        },
      })}
    >
      <Tab.Screen name="Home" component={GuideHomeStack} options={{ tabBarLabel: t('tab_home') }} />
      <Tab.Screen name="Bookings" component={GuideBookingsScreen} options={{ tabBarLabel: t('p_bookings') }} />
      <Tab.Screen name="Discover" component={GuideDiscoverScreen} options={{ tabBarLabel: t('p_discover') }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: t('map') }} />
      <Tab.Screen name="SOS" component={SOSScreen} options={{ tabBarLabel: t('sos') }} />
    </Tab.Navigator>
  );
}
