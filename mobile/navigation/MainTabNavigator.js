import React from 'react';
import useTabBarStyle from '../utils/useTabBarStyle';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Using Expo's vector icons
import { useTranslation } from 'react-i18next';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ProfileScreen from '../screens/ProfileScreen';

import GuidesListScreen from '../screens/GuidesListScreen';
import GuideProfileScreen from '../screens/GuideProfileScreen';
import ConfirmBookingScreen from '../screens/ConfirmBookingScreen';
import WaitingApprovalScreen from '../screens/WaitingApprovalScreen';
import MessageScreen from '../screens/MessageScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SOSScreen from '../screens/SOSScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TouristHomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="GuidesList" component={GuidesListScreen} />
            <Stack.Screen name="GuideProfile" component={GuideProfileScreen} />
            <Stack.Screen name="ConfirmBooking" component={ConfirmBookingScreen} />
            <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
            <Stack.Screen name="MessageScreen" component={MessageScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="SOSScreen" component={SOSScreen} />
        </Stack.Navigator>
    );
}

export default function MainTabNavigator() {
    const { t } = useTranslation();
    const tabBarStyle = useTabBarStyle({
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    });
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: '#00695C',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle,
                tabBarLabelStyle: {
                    fontFamily: 'Outfit-Medium',
                    fontSize: 11,
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={TouristHomeStack}
                options={{
                    tabBarLabel: t('tab_home'),
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "home" : "home-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="ExploreTab"
                component={MapScreen}
                options={{
                    tabBarLabel: t('tab_explore'),
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "compass" : "compass-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="AITab"
                component={ChatbotScreen}
                options={{
                    tabBarLabel: t('tab_ai'),
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "robot" : "robot-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="MarketTab"
                component={MarketplaceScreen}
                options={{
                    tabBarLabel: t('tab_market'),
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "shopping" : "shopping-outline"} color={color} size={24} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: t('tab_profile'),
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "account" : "account-outline"} color={color} size={26} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

