import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Using Expo's vector icons
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#00695C',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    height: 65,
                    paddingBottom: 12,
                    paddingTop: 8,
                    backgroundColor: '#FFF',
                    borderTopWidth: 1,
                    borderTopColor: '#EEE',
                },
                tabBarLabelStyle: {
                    fontFamily: 'Outfit-Medium',
                    fontSize: 11,
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "home" : "home-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="ExploreTab"
                component={MapScreen}
                options={{
                    tabBarLabel: 'Explore',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "compass" : "compass-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="AITab"
                component={ChatbotScreen}
                options={{
                    tabBarLabel: 'AI Guide',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "robot" : "robot-outline"} color={color} size={26} />
                    ),
                }}
            />
            <Tab.Screen
                name="MarketTab"
                component={MarketplaceScreen}
                options={{
                    tabBarLabel: 'Market',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "shopping" : "shopping-outline"} color={color} size={24} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons name={focused ? "account" : "account-outline"} color={color} size={26} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

