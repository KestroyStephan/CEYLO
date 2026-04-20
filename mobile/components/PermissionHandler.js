import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

export default function PermissionHandler() {
    const [locationPermission, setLocationPermission] = useState(null);
    const [cameraPermission, setCameraPermission] = useState(null);

    const requestPermissions = async () => {
        // 1. Request Location Permission
        const locStatus = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locStatus.status === 'granted');

        if (locStatus.status !== 'granted') {
            Alert.alert(
                "Permission Required",
                "This app needs location access to help you find nearby services."
            );
        }

        // 2. Request Camera Permission
        const camStatus = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(camStatus.status === 'granted');

        if (camStatus.status !== 'granted') {
            Alert.alert(
                "Permission Required",
                "Camera access is needed to upload documents and photos."
            );
        }
    };

    useEffect(() => {
        requestPermissions();
    }, []);

    if (locationPermission === null || cameraPermission === null) {
        return <View style={styles.container}><Text>Checking permissions...</Text></View>;
    }

    if (locationPermission === false || cameraPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.warning}>Permissions are required to use this feature.</Text>
                <Button title="Grant Permissions" onPress={requestPermissions} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.success}>All Permissions Granted!</Text>
            <Text>Accessing Camera and Location features...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    warning: { color: 'red', marginBottom: 10, textAlign: 'center' },
    success: { color: 'green', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }
});
