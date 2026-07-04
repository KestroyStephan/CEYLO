import React, { useState, useEffect } from 'react';
import { 
    Grid, Paper, Typography, Box, Badge, Button, 
    List, ListItem, ListItemText, Divider, Chip,
    IconButton, Tooltip, Stack, Alert, AlertTitle
} from '@mui/material';
import { collection, onSnapshot, query, limit, orderBy, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

// We are replacing the static CameraFeed with a dynamic Live Stream viewer below

function SOSMonitor() {
    const [alerts, setAlerts] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = React.useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    
    useEffect(() => {
        // Initialize audio with loop
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/emergency/emergency_siren.ogg");
        audioRef.current.loop = true;
        
        // Request Desktop Notification Permissions
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

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
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("ACTIVE SOS ALERT", { body: "Immediate action required in Command Center!" });
                }
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

    const handleInvestigate = async (id, currentStatus) => {
        try {
            const nextStatus = currentStatus === 'active' ? 'investigating' : 'resolved';
            await updateDoc(doc(db, "sos_alerts", id), { status: nextStatus });
        } catch (e) {
            console.error("Error updating status:", e);
        }
    };

    const activeStream = alerts.find(a => a.status === 'active' || a.status === 'investigating');

    const handleMicDown = async () => {
        if (!activeStream) return alert("No active SOS to communicate with.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const storage = getStorage();
                const storageRef = ref(storage, `admin_audio/${Date.now()}.webm`);
                
                try {
                    const snapshot = await uploadBytesResumable(storageRef, audioBlob);
                    const downloadUrl = await getDownloadURL(snapshot.ref);
                    await updateDoc(doc(db, "sos_alerts", activeStream.id), { adminAudioUrl: downloadUrl });
                    console.log("Walkie-Talkie audio sent to tourist.");
                } catch(e) { console.error("Audio upload failed", e); }
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) { console.error("Mic access denied", e); }
    };

    const handleMicUp = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
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
                        <VideocamIcon sx={{ mr: 1, color: '#00695c' }} /> Live SOS Frame Stream
                    </Typography>
                    
                    {activeStream ? (
                        <Paper sx={{ 
                            position: 'relative', bgcolor: '#000', aspectRatio: '16/9', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 2, 
                            border: '2px solid #d32f2f', mb: 2
                        }}>
                            <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.5)', px: 1, borderRadius: 1, zIndex: 1 }}>
                                <Box sx={{ width: 8, height: 8, bgcolor: '#f44336', borderRadius: '50%', mr: 1, animation: 'pulse 1s infinite' }} />
                                <Typography variant="caption" color="#fff" fontWeight={600}>LIVE: {activeStream.userName || 'Unknown'}</Typography>
                            </Box>
                            {activeStream.photoUrl ? (
                                <img src={activeStream.photoUrl} alt="Live SOS Feed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <VideocamIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)' }} />
                            )}
                            <Box sx={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 1 }}>
                                <Button 
                                    variant="contained" 
                                    color={isRecording ? "error" : "primary"}
                                    size="small"
                                    onMouseDown={handleMicDown}
                                    onMouseUp={handleMicUp}
                                    onMouseLeave={handleMicUp}
                                    startIcon={isRecording ? <StopIcon /> : <MicIcon />}
                                    sx={{ borderRadius: 2, fontWeight: 800, animation: isRecording ? 'pulse 1s infinite' : 'none' }}
                                >
                                    {isRecording ? "RECORDING..." : "HOLD TO TALK"}
                                </Button>
                                <Box sx={{ bgcolor: '#d32f2f', color: '#fff', px: 1, borderRadius: 1, fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                                    SIGNAL INTERCEPTED
                                </Box>
                            </Box>
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#e0f2f1', borderRadius: 4, border: '1px dashed #00695c', mb: 2 }}>
                            <SensorsIcon sx={{ fontSize: 60, color: '#00695c', opacity: 0.5 }} />
                            <Typography variant="h6" color="#00695c" fontWeight={700}>All Clear</Typography>
                            <Typography variant="body2" color="text.secondary">No active SOS streams.</Typography>
                        </Paper>
                    )}

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
                                                    {alert.photoUrl && (
                                                        <Box mt={1}>
                                                            <img src={alert.photoUrl} alt="Emergency Proof" style={{width: 150, borderRadius: 8, border: '2px solid #d32f2f'}} />
                                                        </Box>
                                                    )}
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
                                            <Chip label={alert.status?.toUpperCase()} color={alert.status === 'active' ? 'error' : alert.status === 'investigating' ? 'warning' : 'success'} size="small" sx={{ fontWeight: 800 }} />
                                            {alert.status !== 'resolved' && (
                                                <Button 
                                                    variant="outlined" 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => handleInvestigate(alert.id, alert.status)}
                                                >
                                                    {alert.status === 'active' ? 'Investigate' : 'Resolve'}
                                                </Button>
                                            )}
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
