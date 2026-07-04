import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen'; // or a separate settings screen
import OfflineMapSettings from '../screens/OfflineMapSettings';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
    return (
        <Drawer.Navigator 
            screenOptions={{ 
                headerShown: false,
                drawerActiveBackgroundColor: '#E0F2F1',
                drawerActiveTintColor: '#00695C',
            }}
        >
            <Drawer.Screen 
                name="AppTabs" 
                component={MainTabNavigator} 
                options={{
                    drawerLabel: 'Home',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="SettingsDrawer" 
                component={ProfileScreen} 
                options={{
                    drawerLabel: 'Settings',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="OfflineSettingsDrawer" 
                component={OfflineMapSettings} 
                options={{
                    drawerLabel: 'Offline Maps',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="map-outline" color={color} size={size} />
                    ),
                }}
            />
        </Drawer.Navigator>
    );
}
