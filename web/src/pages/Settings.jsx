import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Grid, Paper, Switch, FormControlLabel, 
    TextField, Button, Divider, Alert, Snackbar, Stack, Avatar
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import BuildIcon from '@mui/icons-material/Build';
import SaveIcon from '@mui/icons-material/Save';
import LockResetIcon from '@mui/icons-material/LockReset';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
    const { currentUser } = useAuth();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        appName: 'CEYLO Tourism',
        contactEmail: 'admin@ceylo.lk',
        maintenanceMode: false,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'system_config', 'global');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data());
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await setDoc(doc(db, 'system_config', 'global'), settings);
            setSnackbar({ open: true, message: 'Settings successfully updated & persisted to cloud.', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to save settings.', severity: 'error' });
        }
    };

    const handleResetPassword = async () => {
        if (!currentUser?.email) return;
        try {
            await sendPasswordResetEmail(auth, currentUser.email);
            setSnackbar({ open: true, message: `Password reset email sent to ${currentUser.email}!`, severity: 'info' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to send reset email.', severity: 'error' });
        }
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                {/* Header segment */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Settings</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 600, borderRadius: 1, px: 4, py: 1.5 }}
                >
                    Save Changes
                </Button>
            </Box>

            <Grid container spacing={3}>
                {/* General Settings */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" fontWeight={600} color="#0F172A" sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <SettingsIcon sx={{ mr: 1, color: '#006A3B' }} /> General Configurations
                        </Typography>
                        <Stack spacing={2.5}>
                            <TextField 
                                label="Platform Name" 
                                variant="outlined" 
                                value={settings.appName} 
                                onChange={handleChange('appName')}
                                fullWidth
                                InputProps={{ sx: { borderRadius: 2 } }}
                            />
                            <TextField 
                                label="Support Contact Email" 
                                variant="outlined" 
                                value={settings.contactEmail} 
                                onChange={handleChange('contactEmail')}
                                fullWidth
                                InputProps={{ sx: { borderRadius: 2 } }}
                            />
                            <Box>
                                <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" gutterBottom>
                                    Platform Status
                                </Typography>
                                <Box sx={{ p: 2, border: '1px solid #FEE2E2', bgcolor: '#FEF2F2', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600} color="#DC2626">Maintenance Mode</Typography>
                                        <Typography variant="caption" color="#7F1D1D">Travellers see a maintenance notice instead of the app. Staff can still sign in.</Typography>
                                    </Box>
                                    <Switch checked={settings.maintenanceMode} onChange={handleChange('maintenanceMode')} color="error" />
                                </Box>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Security Settings */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" fontWeight={600} color="#0F172A" sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <SecurityIcon sx={{ mr: 1, color: '#006A3B' }} /> Security & Authentication
                        </Typography>
                        <Stack spacing={2.5}>
                            <Button
                                variant="contained" 
                                color="error" 
                                startIcon={<LockResetIcon />}
                                onClick={handleResetPassword}
                                sx={{ fontWeight: 600, borderRadius: 1.25, py: 1.5, textTransform: 'none', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(220,38,38,0.2)' } }}
                            >
                                Send Password Reset Email
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

            </Grid>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
            </Box>
        </Box>
    );
}
