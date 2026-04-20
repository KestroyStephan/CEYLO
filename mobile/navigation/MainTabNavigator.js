import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Using Expo's vector icons
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import SOSScreen from '../screens/SOSScreen';
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
                    height: 60,
                    paddingBottom: 10,
                    paddingTop: 5,
                    backgroundColor: '#FFF',
                    borderTopWidth: 1,
                    borderTopColor: '#EEE',
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home-variant" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="MapTab"
                component={MapScreen}
                options={{
                    tabBarLabel: 'Map',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="explore" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="AITab"
                component={ChatbotScreen}
                options={{
                    tabBarLabel: 'AI',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="robot" color={color} size={size} />
                    ),
                    tabBarBadge: '!',
                    tabBarBadgeStyle: { backgroundColor: '#00695C' }
                }}
            />
            <Tab.Screen
                name="SOSTab"
                component={SOSScreen}
                options={{
                    tabBarLabel: 'SOS',
                    tabBarActiveTintColor: '#D32F2F',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="alert-circle" color={color === '#00695C' ? '#D32F2F' : color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-circle" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

