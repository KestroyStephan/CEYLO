import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Avatar, List, Divider, Button } from 'react-native-paper';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
    const user = auth.currentUser;

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text
                    size={80}
                    label={user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                    style={styles.avatar}
                />
                <Text variant="headlineSmall" style={styles.name}>{user?.displayName || "User Name"}</Text>
                <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>

                <Button mode="outlined" onPress={handleLogout} style={styles.logoutBtn}>
                    Logout
                </Button>
            </View>

            <View style={styles.section}>
                <List.Section>
                    <List.Subheader>Account Settings</List.Subheader>
                    <List.Item
                        title="Personal Information"
                        left={props => <List.Icon {...props} icon="account" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <List.Item
                        title="Payment Methods"
                        left={props => <List.Icon {...props} icon="credit-card" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <List.Item
                        title="Notifications"
                        left={props => <List.Icon {...props} icon="bell" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader>Support</List.Subheader>
                    <List.Item
                        title="Help Center"
                        left={props => <List.Icon {...props} icon="help-circle" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                    <List.Item
                        title="Terms & Privacy"
                        left={props => <List.Icon {...props} icon="file-document" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                    />
                </List.Section>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'white',
        marginBottom: 10,
    },
    avatar: {
        backgroundColor: '#00695c',
        marginBottom: 15,
    },
    name: {
        fontWeight: 'bold',
        color: '#333',
    },
    email: {
        color: '#666',
        marginBottom: 20,
    },
    logoutBtn: {
        borderColor: '#d32f2f',
        textColor: '#d32f2f', // Note: paper buttons use specific props for text color often, or style
    },
    section: {
        backgroundColor: 'white',
    },
});
