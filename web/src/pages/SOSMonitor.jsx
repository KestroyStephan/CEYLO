import React, { useState, useEffect, useRef } from 'react';
import { 
    Grid, Paper, Typography, Box, Badge, Button, 
    List, ListItem, ListItemText, Divider, Chip,
    IconButton, Tooltip, Stack, Alert, AlertTitle, Avatar,
    TextField, InputAdornment, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Snackbar
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import MicIcon from '@mui/icons-material/Mic';
import CallIcon from '@mui/icons-material/Call';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import WarningIcon from '@mui/icons-material/Warning';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// Emergency workflow (Sprint 3): active -> acknowledged -> dispatched -> resolved.
// 'investigating' is the older name for dispatched and is still read.
const OPEN_STATUSES = ['active', 'acknowledged', 'dispatched', 'investigating'];
const STATUS_LABEL = { active: 'NEW', acknowledged: 'ACKNOWLEDGED', dispatched: 'DISPATCHED', investigating: 'DISPATCHED', resolved: 'RESOLVED', closed: 'CLOSED' };
const toMillis = (t) => (t?.toMillis ? t.toMillis() : t ? Date.parse(t) || null : null);
const ago = (t) => {
    const ms = toMillis(t);
    if (!ms) return null;
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};
const fmtTime = (t) => (t?.toDate ? t.toDate().toLocaleTimeString() : typeof t === 'string' ? new Date(t).toLocaleTimeString() : null);

function SOSMonitor() {
    const { currentUser } = useAuth();
    const handler = () => ({ uid: currentUser?.uid || null, email: currentUser?.email || null });
    const [alerts, setAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [subTab, setSubTab] = useState('alerts'); // 'feed', 'alerts'
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const audioRef = useRef(null);
    const [, setClock] = useState(0);
    // Re-render every second so waiting times and location ages stay current
    useEffect(() => {
        const t = setInterval(() => setClock(n => n + 1), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        // Initialize emergency alert sound
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/emergency/emergency_siren.ogg");
        audioRef.current.loop = true;

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

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "sos_alerts"), (snapshot) => {
            const firebaseAlerts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    threatLevel: data.threatLevel || (data.status === 'active' ? 'CRITICAL' : OPEN_STATUSES.includes(data.status) ? 'IN PROGRESS' : 'STABLE'),
                    emergencyContactName: data.emergencyContactName || 'Tourist Police',
                    emergencyContactPhone: data.emergencyContactPhone || '1912'
                };
            });

            setAlerts(firebaseAlerts);

            // Handle active siren
            const activeInDB = firebaseAlerts.some(a => a.status === 'active');
            if (activeInDB && !isMuted) {
                audioRef.current?.play().catch(e => console.log("Audio block:", e));
            } else {
                audioRef.current?.pause();
            }
        }, (err) => {
            console.error("SOS Monitor listener error:", err);
            setAlerts([]);
        });

        return () => unsubscribe();
    }, [isMuted]);

    // Sync selectedAlert with fresh data from the alerts array
    useEffect(() => {
        if (selectedAlert) {
            const freshAlert = alerts.find(a => a.id === selectedAlert.id);
            if (freshAlert) {
                setSelectedAlert(freshAlert);
            } else {
                setSelectedAlert(null);
            }
        } else {
            const activeList = alerts.filter(a => OPEN_STATUSES.includes(a.status));
            if (activeList.length > 0) {
                setSelectedAlert(activeList[0]);
            }
        }
    }, [alerts]);

    const handleSelectAlert = (alert) => {
        setSelectedAlert(alert);
    };

    const handleDispatchAction = async (team) => {
        if (!selectedAlert) return;

        try {
            // Update Firestore status
            await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                status: 'dispatched',
                dispatchTeam: team,
                dispatchedAt: serverTimestamp(),
                handledBy: handler(),
                ...(selectedAlert.acknowledgedAt ? {} : { acknowledgedAt: serverTimestamp() }),
            });

            // Write record to EmergencyLogs
            await addDoc(collection(db, "EmergencyLogs"), {
                alertId: selectedAlert.id,
                userName: selectedAlert.userName,
                location: selectedAlert.location || null,
                dispatchedTeam: team,
                action: 'dispatched',
                handledBy: handler(),
                createdAt: serverTimestamp(),
                notes: `Emergency response dispatched: ${team}.`
            });

            setSnackbar({
                open: true,
                message: `Successfully dispatched ${team} to ${selectedAlert.locationName || 'tourist location'}!`,
                severity: 'success'
            });
        } catch (e) {
            console.error(e);
            setSnackbar({ open: true, message: 'Failed to record dispatch: ' + e.message, severity: 'error' });
        }
    };

    const handleResolveIncident = async () => {
        if (!selectedAlert) return;
        try {
            await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                status: 'resolved',
                resolvedAt: serverTimestamp(),
                handledBy: handler(),
            });

            await addDoc(collection(db, "EmergencyLogs"), {
                alertId: selectedAlert.id,
                userName: selectedAlert.userName,
                location: selectedAlert.location || null,
                action: 'resolved',
                handledBy: handler(),
                createdAt: serverTimestamp(),
                resolvedAt: serverTimestamp(),
                notes: `Incident marked as resolved. Closed emergency monitor.`
            });

            setSnackbar({ open: true, message: 'Incident resolved and archived successfully!', severity: 'success' });
            setSelectedAlert(null);
        } catch (e) {
            setSnackbar({ open: true, message: 'Failed to resolve: ' + e.message, severity: 'error' });
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedAlert) return;
        try {
            await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                status: 'acknowledged',
                acknowledgedAt: serverTimestamp(),
                handledBy: handler(),
            });
            await addDoc(collection(db, "EmergencyLogs"), {
                alertId: selectedAlert.id,
                userName: selectedAlert.userName,
                location: selectedAlert.location || null,
                action: 'acknowledged',
                handledBy: handler(),
                createdAt: serverTimestamp(),
                notes: 'Alert acknowledged by the emergency desk.',
            });
            setSnackbar({ open: true, message: 'Alert acknowledged. The traveller sees that help is on the way.', severity: 'success' });
        } catch (e) {
            setSnackbar({ open: true, message: 'Failed to acknowledge: ' + e.message, severity: 'error' });
        }
    };

    // Hands the case to the authority with everything they need, and records that it was sent
    const handleForward = async () => {
        if (!selectedAlert) return;
        const loc = selectedAlert.location;
        const lat = loc?.latitude ?? loc?.lat;
        const lon = loc?.longitude ?? loc?.lng ?? loc?.lon;
        const details = [
            `CEYLO SOS alert ${selectedAlert.id}`,
            `Traveller: ${selectedAlert.userName || 'Unknown'}${selectedAlert.userPhone ? `, phone ${selectedAlert.userPhone}` : ''}`,
            `Raised: ${selectedAlert.timestamp?.toDate ? selectedAlert.timestamp.toDate().toLocaleString() : 'unknown'}`,
            lat != null ? `Location: ${lat}, ${lon} - https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : `Location: ${selectedAlert.locationName || 'not shared'}`,
            selectedAlert.message ? `Message: ${selectedAlert.message}` : null,
            (selectedAlert.evidenceUrl || selectedAlert.photoUrl) ? `${selectedAlert.mediaType === 'video' ? 'Video' : 'Photo'}: ${selectedAlert.evidenceUrl || selectedAlert.photoUrl}` : null,
            `Status: ${STATUS_LABEL[selectedAlert.status] || selectedAlert.status}${selectedAlert.dispatchTeam ? `, ${selectedAlert.dispatchTeam} dispatched` : ''}`,
        ].filter(Boolean).join('\n');
        try {
            await navigator.clipboard.writeText(details);
            await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                forwardedToAuthorityAt: serverTimestamp(),
                forwardedBy: handler(),
            });
            await addDoc(collection(db, "EmergencyLogs"), {
                alertId: selectedAlert.id, action: 'forwarded', handledBy: handler(),
                createdAt: serverTimestamp(), notes: details,
            });
            setSnackbar({ open: true, message: 'Case details copied. Paste them to Tourist Police (1912) or the relevant authority.', severity: 'success' });
        } catch (e) {
            setSnackbar({ open: true, message: 'Could not forward: ' + e.message, severity: 'error' });
        }
    };

    const toggleWalkieTalkie = async () => {
        if (!selectedAlert) return;

        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                let options = {};
                let extension = 'webm';
                let mimeType = 'audio/webm';

                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options = { mimeType: 'audio/mp4' };
                    extension = 'mp4';
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/aac')) {
                    options = { mimeType: 'audio/aac' };
                    extension = 'aac';
                    mimeType = 'audio/aac';
                }

                const mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    stream.getTracks().forEach(track => track.stop());
                    
                    try {
                        const audioStorageRef = ref(storage, `sos_alerts/${selectedAlert.id}_admin_audio_${Date.now()}.${extension}`);
                        await uploadBytes(audioStorageRef, audioBlob);
                        const downloadUrl = await getDownloadURL(audioStorageRef);
                        
                        await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                            adminAudioUrl: downloadUrl,
                            adminAudioTimestamp: Date.now()
                        });
                        setSnackbar({ open: true, message: 'Voice message sent!', severity: 'success' });
                    } catch (err) {
                        setSnackbar({ open: true, message: 'Upload failed: ' + err.message, severity: 'error' });
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                setSnackbar({ open: true, message: 'Mic permission denied', severity: 'error' });
            }
        }
    };

    const handleRequestCamera = async () => {
        if (!selectedAlert) return;
        try {
            await updateDoc(doc(db, "sos_alerts", selectedAlert.id), {
                cameraRequestedAt: serverTimestamp()
            });
            setSnackbar({ open: true, message: 'Camera request sent to tourist!', severity: 'success' });
        } catch (e) {
            setSnackbar({ open: true, message: 'Failed to request camera: ' + e.message, severity: 'error' });
        }
    };

    // Filter alerts for history table
    const activeAlertsList = alerts.filter(a => OPEN_STATUSES.includes(a.status));
    const historicalAlertsList = alerts.filter(a => a.status === 'resolved' || a.status === 'closed')
        .filter(a => a.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     a.locationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     a.category?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            {/* Header section with Ceylo Sub-Tabs */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={900} color="#006A3B">
                        Ceylo Admin Portal
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        <Typography 
                            variant="body2" 
                            fontWeight={700} 
                            onClick={() => setSubTab('feed')}
                            sx={{ cursor: 'pointer', color: subTab === 'feed' ? '#006A3B' : '#777', borderBottom: subTab === 'feed' ? '2.5px solid #006A3B' : 'none', pb: 0.5 }}
                        >
                            Global Feed
                        </Typography>
                        <Typography 
                            variant="body2" 
                            fontWeight={700} 
                            onClick={() => setSubTab('alerts')}
                            sx={{ cursor: 'pointer', color: subTab === 'alerts' ? '#006A3B' : '#777', borderBottom: subTab === 'alerts' ? '2.5px solid #006A3B' : 'none', pb: 0.5 }}
                        >
                            Alerts
                        </Typography>
                    </Stack>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton onClick={() => setIsMuted(!isMuted)} color={isMuted ? "default" : "error"}>
                        {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                    <Chip 
                        label="Command Center Live" 
                        color="success" 
                        icon={<Box sx={{ width: 8, height: 8, bgcolor: '#FFF', borderRadius: '50%' }} />}
                        sx={{ fontWeight: 800, bgcolor: '#006A3B', color: '#FFF' }}
                    />
                </Stack>
            </Box>

            {subTab === 'feed' ? (
                <Box sx={{ mt: 4 }}>
                    <Paper sx={{ p: 5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', textAlign: 'center', bgcolor: '#FFF' }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <WarningIcon sx={{ color: '#006A3B', fontSize: 32 }} />
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="#181D19" gutterBottom>
                            Global Incident Feed
                        </Typography>
                        <Typography variant="body1" color="#5C6E64" sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
                            The Global Feed aggregates all system events (Emergency Triggers, User Reports, System Anomalies) into a single chronological stream. The live integration for this feed is currently being provisioned.
                        </Typography>
                        <Button variant="contained" onClick={() => setSubTab('alerts')} sx={{ bgcolor: '#006A3B', color: '#FFF', borderRadius: 8, px: 4, fontWeight: 700, '&:hover': { bgcolor: '#004A29' }}}>
                            Switch to Live Alerts Monitor
                        </Button>
                    </Paper>
                </Box>
            ) : (
                <Box>
                    {/* Three-column top grid workspace */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                
                {/* Column 1: Active SOS list */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={900} color="#181D19" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Active SOS ({activeAlertsList.length}) <WarningIcon color="error" fontSize="small" />
                            </Typography>
                        </Box>

                        <List sx={{ p: 0 }}>
                            {activeAlertsList.map((alert) => {
                                const isSelected = selectedAlert?.id === alert.id;
                                const isCritical = alert.threatLevel === 'CRITICAL';
                                const timeStr = alert.timestamp?.toDate ? new Date(alert.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                                return (
                                    <Paper 
                                        key={alert.id}
                                        onClick={() => handleSelectAlert(alert)}
                                        sx={{
                                            p: 2,
                                            mb: 2,
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                            border: isSelected ? '2px solid #006A3B' : '1px solid #BECABE',
                                            background: isCritical 
                                                ? 'linear-gradient(135deg, #FFEBEB 0%, #FFF5F5 100%)' 
                                                : 'linear-gradient(135deg, #FFFDE7 0%, #FFFFFD 100%)',
                                            boxShadow: 'none',
                                            '&:hover': { border: '2px solid #006A3B' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Chip 
                                                label={alert.threatLevel} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 900, 
                                                    fontSize: '0.65rem',
                                                    color: '#FFF', 
                                                    bgcolor: isCritical ? '#BA1A1A' : '#735C00' 
                                                }} 
                                            />
                                            <Typography variant="caption" fontWeight={800}
                                                color={alert.status === 'active' && Date.now() - (toMillis(alert.timestamp) || Date.now()) > 120000 ? '#BA1A1A' : 'text.secondary'}>
                                                {alert.status === 'active' ? `Waiting ${ago(alert.timestamp) || '0s'}` : timeStr}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: isCritical ? '#FFEBEE' : '#FFF9C4', color: isCritical ? '#BA1A1A' : '#735C00' }}>
                                                {alert.userName.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={800} color="#181D19">
                                                    {alert.userName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {alert.locationName || (alert.location ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}` : 'Unknown Location')}
                                                </Typography>
                                                {alert.location && (
                                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: Date.now() - (toMillis(alert.lastLocationAt || alert.timestamp) || 0) > 60000 ? '#B26A00' : '#2E7D32' }}>
                                                        Location {ago(alert.lastLocationAt || alert.timestamp) || 'just now'} old{alert.location.accuracy ? ` · ±${alert.location.accuracy} m` : ''}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Paper>
                                );
                            })}
                            {activeAlertsList.length === 0 && (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No active emergency alerts.</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* Column 2: Live SOS Feed & Dispatch controls */}
                <Grid size={{ xs: 12, md: 5.2 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid #EBEFE8', boxShadow: 'none', display: 'flex', flexDirection: 'column' }}>
                        
                        {selectedAlert ? (
                            <>
                                {/* Video/Feed frame */}
                                <Box sx={{ 
                                    position: 'relative', 
                                    bgcolor: '#000', 
                                    aspectRatio: '16/10', 
                                    borderRadius: 4, 
                                    overflow: 'hidden',
                                    border: '2px solid #BA1A1A',
                                    mb: 2.5
                                }}>
                                    <Box sx={{ 
                                        position: 'absolute', 
                                        top: 16, 
                                        left: 16, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        bgcolor: 'rgba(0,0,0,0.65)', 
                                        px: 1.5, 
                                        py: 0.5, 
                                        borderRadius: 2, 
                                        zIndex: 2 
                                    }}>
                                        <Box sx={{ width: 8, height: 8, bgcolor: '#f44336', borderRadius: '50%', mr: 1, animation: 'pulse 1.2s infinite' }} />
                                        <Typography variant="caption" color="#FFF" fontWeight={800}>
                                            {(selectedAlert.evidenceUrl || selectedAlert.photoUrl)
                                                ? (selectedAlert.mediaType === 'video' ? 'VIDEO FROM TRAVELLER' : 'PHOTO FROM TRAVELLER')
                                                : 'NO EVIDENCE SENT YET'}
                                        </Typography>
                                    </Box>

                                    {selectedAlert.mediaType === 'video' && selectedAlert.evidenceUrl ? (
                                        <video
                                            src={selectedAlert.evidenceUrl}
                                            controls
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
                                        />
                                    ) : (selectedAlert.evidenceUrl || selectedAlert.photoUrl) ? (
                                        <img
                                            src={selectedAlert.evidenceUrl || selectedAlert.photoUrl}
                                            alt="Photo sent with the SOS"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF', gap: 1, px: 3, textAlign: 'center' }}>
                                            <MyLocationIcon sx={{ fontSize: 40 }} />
                                            <Typography fontWeight={800}>
                                                {selectedAlert.location?.latitude != null
                                                    ? `${Number(selectedAlert.location.latitude).toFixed(5)}, ${Number(selectedAlert.location.longitude).toFixed(5)}`
                                                    : (selectedAlert.locationName || 'Location not shared')}
                                            </Typography>
                                            {selectedAlert.location?.latitude != null && (
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${selectedAlert.location.latitude},${selectedAlert.location.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#A5D6A7', fontWeight: 700 }}>
                                                    Open in Google Maps
                                                </a>
                                            )}
                                        </Box>
                                    )}

                                    {/* Vision AI Analysis Banner */}
                                    <Box sx={{ 
                                        position: 'absolute', 
                                        bottom: 0, 
                                        left: 0, 
                                        right: 0, 
                                        bgcolor: 'rgba(255, 255, 255, 0.95)', 
                                        p: 2, 
                                        borderTop: '1px solid #FFCDD2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={900} color="#BA1A1A" sx={{ letterSpacing: 0.5 }}>
                                                RESPONSE STATUS
                                            </Typography>
                                            <Typography variant="caption" color="#444" fontWeight={800}>
                                                {[
                                                    fmtTime(selectedAlert.timestamp) && `Raised ${fmtTime(selectedAlert.timestamp)} (${ago(selectedAlert.timestamp)} ago)`,
                                                    fmtTime(selectedAlert.acknowledgedAt) && `acknowledged ${fmtTime(selectedAlert.acknowledgedAt)}`,
                                                    fmtTime(selectedAlert.dispatchedAt) && `${selectedAlert.dispatchTeam || 'team'} dispatched ${fmtTime(selectedAlert.dispatchedAt)}`,
                                                ].filter(Boolean).join(' • ') || 'Waiting for the desk'}
                                            </Typography>
                                        </Box>
                                        <Chip 
                                            label={STATUS_LABEL[selectedAlert.status] || 'NEW'} 
                                            size="small"
                                            sx={{ 
                                                bgcolor: '#FFF9C4', 
                                                color: '#735C00', 
                                                fontWeight: 900, 
                                                fontSize: '0.7rem',
                                                border: '1px solid #FBC02D'
                                            }} 
                                        />
                                    </Box>
                                </Box>

                                {/* Tags & Indicators */}
                                <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                                    <Chip label={selectedAlert.handledBy?.email ? `Handled by ${selectedAlert.handledBy.email}` : 'Not yet handled'} size="small" variant="outlined" sx={{ borderColor: '#FFCDD2', color: '#BA1A1A', fontWeight: 800 }} />
                                    {selectedAlert.forwardedToAuthorityAt && <Chip label={`Forwarded ${fmtTime(selectedAlert.forwardedToAuthorityAt) || ''}`} size="small" variant="outlined" sx={{ borderColor: '#BECABE', color: '#3F4941', fontWeight: 800 }} />}
                                    {selectedAlert.smsStatus && <Chip label={selectedAlert.smsStatus === 'sent' ? `SMS sent to desk${selectedAlert.smsProvider ? ` via ${selectedAlert.smsProvider}` : ''} ${fmtTime(selectedAlert.smsAt) || ''}` : selectedAlert.smsStatus === 'not_configured' ? 'SMS gateway not configured' : 'SMS failed'} size="small" variant="outlined" sx={{ borderColor: '#BECABE', color: selectedAlert.smsStatus === 'sent' ? '#1B5E20' : '#B45309', fontWeight: 800 }} />}
                                    {selectedAlert.channel && <Chip label={`Sent by ${selectedAlert.channel}`} size="small" variant="outlined" sx={{ borderColor: '#BECABE', color: '#3F4941', fontWeight: 800 }} />}
                                </Stack>

                                {/* Dispatch Action Grid buttons */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Button fullWidth variant="contained" startIcon={<DoneAllIcon />} onClick={handleAcknowledge}
                                            disabled={selectedAlert.status !== 'active'}
                                            sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' }, py: 1.8, borderRadius: 3, fontWeight: 800, textTransform: 'none', fontSize: '0.9rem' }}>
                                            {selectedAlert.status === 'active' ? 'Acknowledge' : 'Acknowledged'}
                                        </Button>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Button fullWidth variant="outlined" startIcon={<ForwardToInboxIcon />} onClick={handleForward}
                                            sx={{ color: '#3F4941', borderColor: '#BECABE', borderWidth: 1.5, py: 1.8, borderRadius: 3, fontWeight: 800, textTransform: 'none', fontSize: '0.9rem' }}>
                                            Forward to authority
                                        </Button>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Button 
                                            fullWidth 
                                            variant="contained" 
                                            startIcon={<LocalPoliceIcon />}
                                            onClick={() => handleDispatchAction('Police')}
                                            sx={{ 
                                                bgcolor: '#BA1A1A', 
                                                '&:hover': { bgcolor: '#930006' },
                                                py: 1.8, 
                                                borderRadius: 3, 
                                                fontWeight: 800, 
                                                textTransform: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Dispatch Police
                                        </Button>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Button 
                                            fullWidth 
                                            variant="outlined" 
                                            startIcon={<LocalHospitalIcon />}
                                            onClick={() => handleDispatchAction('Ambulance')}
                                            sx={{ 
                                                color: '#BA1A1A', 
                                                borderColor: '#BA1A1A', 
                                                borderWidth: 1.5,
                                                '&:hover': { borderColor: '#930006', borderWidth: 1.5 },
                                                py: 1.8, 
                                                borderRadius: 3, 
                                                fontWeight: 800, 
                                                textTransform: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Dispatch Ambulance
                                        </Button>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Button 
                                            fullWidth 
                                            variant="contained" 
                                            startIcon={<LocalFireDepartmentIcon />}
                                            onClick={() => handleDispatchAction('Fire')}
                                            sx={{ 
                                                bgcolor: '#006A3B', 
                                                '&:hover': { bgcolor: '#004D2C' },
                                                py: 1.8, 
                                                borderRadius: 3, 
                                                fontWeight: 800, 
                                                textTransform: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Dispatch Fire
                                        </Button>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Button 
                                            fullWidth 
                                            variant="outlined" 
                                            startIcon={<HighlightOffIcon />}
                                            onClick={handleResolveIncident}
                                            sx={{ 
                                                color: '#3F4941', 
                                                borderColor: '#BECABE', 
                                                borderWidth: 1.5,
                                                '&:hover': { borderColor: '#3F4941', borderWidth: 1.5 },
                                                py: 1.8, 
                                                borderRadius: 3, 
                                                fontWeight: 800, 
                                                textTransform: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Mark Resolved
                                        </Button>
                                    </Grid>
                                </Grid>
                            </>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center', my: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h2" sx={{ fontSize: '3rem' }}>🛡️</Typography>
                                <Typography variant="h6" fontWeight={800} color="#1A2E1A">
                                    {alerts.length === 0 ? 'No emergency alerts received yet! 💚' : 'Select an alert to initiate monitoring'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {alerts.length === 0 ? 'System is online and scanning for tourist emergencies.' : 'Click on any active alert in the list to view live details.'}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
                {/* Column 3: Live Map coordinates & Emergency Contacts */}
                <Grid size={{ xs: 12, md: 3.8 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid #EBEFE8', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        
                        {(() => {
                            const displayMapAlert = selectedAlert;
                            if (displayMapAlert) {
                                return (
                                    <>
                                        {/* Micro Map block */}
                                        <Box sx={{ width: '100%', height: 200, borderRadius: 4, overflow: 'hidden', border: '1px solid #BECABE', position: 'relative' }}>
                                            <iframe 
                                                title="SOS Location Map"
                                                src={`https://maps.google.com/maps?q=${displayMapAlert.location?.latitude || 7.9573},${displayMapAlert.location?.longitude || 80.7603}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                            />
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                top: 8, 
                                                left: 8, 
                                                bgcolor: 'rgba(255,255,255,0.95)', 
                                                px: 1.2, 
                                                py: 0.4, 
                                                borderRadius: 1.5, 
                                                border: '1px solid #BECABE',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}>
                                                <Typography variant="caption" fontWeight={900} color="#181D19">
                                                    🔴 Active Alert Location
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Alert Controls (Mic & Camera Request) */}
                                        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, width: '100%' }}>
                                            <Button 
                                                fullWidth
                                                variant="contained" 
                                                onClick={toggleWalkieTalkie}
                                                startIcon={<MicIcon />}
                                                sx={{ 
                                                    bgcolor: isRecording ? '#BA1A1A' : '#777', 
                                                    color: '#FFF',
                                                    fontWeight: 800,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'none',
                                                    borderRadius: 2,
                                                    py: 1.2,
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: isRecording ? '#930006' : '#555' }
                                                }}
                                            >
                                                {isRecording ? 'Recording...' : 'Hold to Talk'}
                                            </Button>
                                            <Button 
                                                fullWidth
                                                variant="contained" 
                                                onClick={handleRequestCamera}
                                                startIcon={<CameraAltIcon />}
                                                sx={{ 
                                                    bgcolor: '#006A3B', 
                                                    color: '#FFF',
                                                    fontWeight: 800,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'none',
                                                    borderRadius: 2,
                                                    py: 1.2,
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: '#004D2C' }
                                                }}
                                            >
                                                Check Camera
                                            </Button>
                                        </Stack>

                                        {/* Emergency contact details card */}
                                        <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#F6FBF3', border: '1px solid #BECABE', boxShadow: 'none' }}>
                                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                                EMERGENCY CONTACT
                                            </Typography>
                                            <Typography variant="body2" fontWeight={800} color="#181D19">
                                                {selectedAlert.emergencyContactName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                                {selectedAlert.emergencyContactPhone}
                                            </Typography>

                                            <Button 
                                                fullWidth 
                                                variant="contained" 
                                                startIcon={<CallIcon />}
                                                onClick={() => window.open(`tel:${selectedAlert.emergencyContactPhone}`)}
                                                sx={{ 
                                                    bgcolor: '#B2DFDB', 
                                                    color: '#004D40',
                                                    fontWeight: 800,
                                                    textTransform: 'none',
                                                    borderRadius: 2,
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: '#80CBC4' }
                                                }}
                                            >
                                                Notify Contact
                                            </Button>
                                        </Paper>
                                    </>
                                );
                            } else {
                                return (
                                    <Box sx={{ p: 4, textAlign: 'center', my: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="h3">🛡️</Typography>
                                        <Typography variant="caption" fontWeight={900} color="text.secondary">
                                            No active emergency alerts received yet! 💚
                                        </Typography>
                                    </Box>
                                );
                            }
                        })()}
                    </Paper>
                </Grid>

            </Grid>

            {/* Bottom Section: SOS Event History */}
            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={800} color="#181D19">
                        SOS Event History
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, width: 350 }}>
                        <TextField 
                            placeholder="Search events..." 
                            size="small" 
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 3, bgcolor: '#FFF' }
                            }}
                        />
                        <IconButton sx={{ border: '1px solid #BECABE', borderRadius: 3 }}>
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#F6FBF3' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>TIME / DATE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>USER</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>LOCATION</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>TYPE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>RESPONSE TEAM</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>STATUS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {historicalAlertsList.map((row) => {
                                const isResolved = row.status === 'resolved';
                                const timeStr = row.timestamp?.toDate ? row.timestamp.toDate().toLocaleString() : 'N/A';
                                
                                // Color map for category tags
                                const tagColors = {
                                    'Animal Encounter': { color: '#ba1a1a', bg: '#ffebee' },
                                    'Medical': { color: '#00695c', bg: '#e0f2f1' },
                                    'False Alarm': { color: '#555', bg: '#eee' },
                                    'Physical Injury': { color: '#e65100', bg: '#fff3e0' },
                                    'default': { color: '#000', bg: '#fff' }
                                };
                                const tagStyle = tagColors[row.category] || tagColors.default;

                                return (
                                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectAlert(row)}>
                                        <TableCell sx={{ fontWeight: 600, color: '#555' }}>{timeStr}</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>{row.userName}</TableCell>
                                        <TableCell>{row.locationName || (row.location?.latitude != null ? `${Number(row.location.latitude).toFixed(4)}, ${Number(row.location.longitude).toFixed(4)}` : 'Not shared')}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={row.category || 'Emergency'} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    color: tagStyle.color, 
                                                    bgcolor: tagStyle.bg 
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{row.dispatchTeam || row.responseTeam || (row.resolvedBy === 'traveller' ? 'Closed by traveller' : 'Closed by desk')}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={row.status?.toUpperCase() || 'RESOLVED'} 
                                                size="small" 
                                                color={isResolved ? "success" : "default"}
                                                sx={{ fontWeight: 800 }} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {historicalAlertsList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        No historical events found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            </Box>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default SOSMonitor;
