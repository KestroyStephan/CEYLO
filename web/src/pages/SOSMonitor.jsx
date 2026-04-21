import React, { useState, useEffect } from 'react';
import { 
    Grid, Paper, Typography, Box, Badge, Button, 
    List, ListItem, ListItemText, Divider, Chip,
    IconButton, Tooltip, Stack, Alert, AlertTitle
} from '@mui/material';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import VideocamIcon from '@mui/icons-material/Videocam';
import SensorsIcon from '@mui/icons-material/Sensors';
import SecurityIcon from '@mui/icons-material/Security';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

const CameraFeed = ({ id, label, status }) => (
    <Paper sx={{ 
        position: 'relative', 
        bgcolor: '#000', 
        aspectRatio: '16/9', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 2,
        border: status === 'alert' ? '2px solid #d32f2f' : 'none'
    }}>
        <Box sx={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.5)',
            px: 1,
            borderRadius: 1,
            zIndex: 1
        }}>
            <Box sx={{ width: 8, height: 8, bgcolor: status === 'alert' ? '#f44336' : '#4caf50', borderRadius: '50%', mr: 1, animation: status === 'alert' ? 'pulse 1s infinite' : 'none' }} />
            <Typography variant="caption" color="#fff" fontWeight={600}>{label}</Typography>
        </Box>
        <VideocamIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.1)' }} />
        {status === 'alert' && (
            <Box sx={{ position: 'absolute', bottom: 10, right: 10, bgcolor: '#d32f2f', color: '#fff', px: 1, borderRadius: 1, fontSize: '0.6rem', fontWeight: 800 }}>
                CRITICAL MOTION DETECTED
            </Box>
        )}
    </Paper>
);

function SOSMonitor() {
    const [alerts, setAlerts] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = React.useRef(null);
    
    useEffect(() => {
        // Initialize audio with loop
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/emergency/emergency_siren.ogg");
        audioRef.current.loop = true;
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);
    
    const [aiInsights, setAiInsights] = useState([
        "CCTV-04: Abnormal crowd gathering detected near Entrance B.",
        "System: High humidity detected in Section 12 (Wildfire Risk: 12%).",
        "SOS-982: User reported medical emergency. Nearby Responder: 1.2km."
    ]);

    useEffect(() => {
        const q = query(collection(db, "sos_alerts"), orderBy("timestamp", "desc"), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAlerts(newAlerts);

            const hasActiveAlert = newAlerts.some(a => a.status === 'active');
            
            if (hasActiveAlert && !isMuted) {
                audioRef.current?.play().catch(e => console.log("Audio play blocked:", e));
            } else {
                audioRef.current?.pause();
                if (audioRef.current) audioRef.current.currentTime = 0;
            }
        });
        return () => unsubscribe();
    }, [isMuted]);

    const dispatchEmergency = (type) => {
        alert(`Dispatching ${type} to the selected location...`);
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Emergency Command Center
                </Typography>
                <Stack direction="row" spacing={2}>
                    <IconButton onClick={() => setIsMuted(!isMuted)} color={isMuted ? "default" : "error"}>
                        {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                    <Button variant="contained" color="error" startIcon={<WarningIcon />} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Panic Broadcast
                    </Button>
                </Stack>
            </Box>

            {alerts.some(a => a.status === 'active') && (
                <Alert 
                    severity="error" 
                    variant="filled" 
                    icon={<WarningIcon fontSize="large" />} 
                    sx={{ 
                        mb: 4, 
                        borderRadius: 3, 
                        animation: 'pulse-bg 2s infinite',
                        '@keyframes pulse-bg': {
                            '0%': { backgroundColor: '#d32f2f' },
                            '50%': { backgroundColor: '#b71c1c' },
                            '100%': { backgroundColor: '#d32f2f' },
                        }
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 900, fontSize: '1.2rem' }}>ACTIVE EMERGENCY SITUATION</AlertTitle>
                    Multiple SOS alerts have been triggered. Immediate action required.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Left Column: Live Feeds */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <VideocamIcon sx={{ mr: 1, color: '#00695c' }} /> Live Security Surveillance
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}> <CameraFeed label="Main Entrance" status="idle" /> </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}> <CameraFeed label="Forest Trail A" status="alert" /> </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}> <CameraFeed label="Eco Village Hub" status="idle" /> </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}> <CameraFeed label="River Crossing" status="idle" /> </Grid>
                    </Grid>

                    <Paper sx={{ mt: 3, p: 3, borderRadius: 4 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent SOS Activations</Typography>
                        <List>
                            {alerts.map((alert, idx) => (
                                <React.Fragment key={alert.id}>
                                    <ListItem sx={{ py: 2 }}>
                                        <Badge badgeContent="!" color="error" overlap="circular" invisible={alert.status !== 'active'}>
                                            <Box sx={{ bgcolor: '#ffebee', p: 1, borderRadius: 2, mr: 2 }}>
                                                <WarningIcon sx={{ color: '#d32f2f' }} />
                                            </Box>
                                        </Badge>
                                        <ListItemText 
                                            primary={<Typography fontWeight={700}>{alert.userName || 'Unknown User'}</Typography>}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2">{alert.phone || 'N/A'}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {alert.timestamp?.toDate().toLocaleString() || 'Just now'}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {alert.location && (
                                                <Tooltip title="View on Map">
                                                    <IconButton 
                                                        size="small" 
                                                        color="secondary"
                                                        onClick={() => window.open(`https://www.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}`, '_blank')}
                                                    >
                                                        <MyLocationIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Chip label={alert.status?.toUpperCase()} color={alert.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 800 }} />
                                            <Button variant="outlined" size="small" color="primary">Investigate</Button>
                                        </Stack>
                                    </ListItem>
                                    {idx < alerts.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Right Column: AI Analysis & Dispatch */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <SensorsIcon sx={{ mr: 1, color: '#ef6c00' }} /> Situation AI Analysis
                    </Typography>
                    <Paper sx={{ p: 0, borderRadius: 4, mb: 3, overflow: 'hidden', border: '1px solid #ffcc80' }}>
                        <Box sx={{ p: 2, bgcolor: '#fff8e1', borderBottom: '1px solid #ffcc80' }}>
                            <Typography variant="subtitle2" fontWeight={800} color="#e65100">AI AGENT: ACTIVE</Typography>
                        </Box>
                        <List sx={{ p: 0 }}>
                            {aiInsights.map((insight, idx) => (
                                <ListItem key={idx} sx={{ py: 1.5, px: 2, borderBottom: idx < aiInsights.length - 1 ? '1px solid #fff3e0' : 'none' }}>
                                    <InfoIcon sx={{ fontSize: 18, mr: 2, color: '#ef6c00' }} />
                                    <Typography variant="body2" fontWeight={500}>{insight}</Typography>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>

                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Emergency Dispatch</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Button 
                                fullWidth 
                                variant="contained" 
                                color="error" 
                                sx={{ py: 3, borderRadius: 3, display: 'flex', flexDirection: 'column' }}
                                onClick={() => dispatchEmergency('Rescue Team')}
                            >
                                <SecurityIcon sx={{ mb: 1 }} />
                                Rescue
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button 
                                fullWidth 
                                variant="contained" 
                                color="primary" 
                                sx={{ py: 3, borderRadius: 3, display: 'flex', flexDirection: 'column' }}
                                onClick={() => dispatchEmergency('Medical Support')}
                            >
                                <LocalHospitalIcon sx={{ mb: 1 }} />
                                Medical
                            </Button>
                        </Grid>
                    </Grid>

                    <Paper sx={{ mt: 3, p: 3, borderRadius: 4, bgcolor: '#37474f', color: '#fff' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ENVIRONMENTAL SENSORS</Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Air Quality</Typography>
                                <Typography variant="caption" fontWeight={700} color="#81c784">GOOD (94/100)</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Fire Risk</Typography>
                                <Typography variant="caption" fontWeight={700} color="#ffb74d">MODERATE (12%)</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">System Uptime</Typography>
                                <Typography variant="caption" fontWeight={700}>99.98%</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default SOSMonitor;
