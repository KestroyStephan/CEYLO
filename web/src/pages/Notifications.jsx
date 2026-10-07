import React, { useState } from 'react';
import { BACKEND_URL } from '../config';
import {
    Box, Typography, Button, Paper, TextField,
    Select, MenuItem, FormControl, InputLabel,
    Stack, Chip, Alert, Card, CardContent, Grid, Avatar, Snackbar
} from '@mui/material';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import SendIcon from '@mui/icons-material/Send';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';

function Notifications() {
    const [target, setTarget] = useState('all');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [sending, setSending] = useState(false);
    const [sentStatus, setSentStatus] = useState(null); // { success: true/false, count: X }
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleBroadcast = async () => {
        if (!title.trim() || !message.trim()) return;
        setSending(true);
        setSentStatus(null);

        try {
            // 1. Fetch users from Firestore
            const usersSnapshot = await getDocs(collection(db, "users"));
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Filter tokens based on target
            let targetUsers = users;
            if (target === 'tourists') {
                targetUsers = users.filter(u => !u.role || u.role === 'tourist');
            } else if (target === 'vendors') {
                targetUsers = users.filter(u => ['vendor', 'accommodation', 'tour_provider', 'vendor_active', 'vendor_pending'].includes(u.role));
            }

            const tokenSnap = await getDocs(collection(db, "push_tokens"));
            const tokenByUid = Object.fromEntries(tokenSnap.docs.map(d => [d.id, d.data().token]));
            const tokens = [...new Set(targetUsers
                .map(u => tokenByUid[u.id] || u.expoPushToken)
                .filter(token => typeof token === 'string' && token.startsWith('ExponentPushToken')))];

            // 3. Send Push Notifications via Expo Push API if tokens exist
            if (tokens.length > 0) {
                // Expo push notifications API allows sending array of notifications
                const messages = tokens.map(token => ({
                    to: token,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { type: 'admin_broadcast', title, message }
                }));

                const backendUrl = BACKEND_URL;
                const idToken = await auth.currentUser.getIdToken();
                const res = await fetch(`${backendUrl}/api/push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ messages }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Push service returned ${res.status}`);
                }
            }

            // 4. Log the broadcast to Firestore history
            await addDoc(collection(db, "notifications"), {
                title,
                message,
                target,
                recipientCount: tokens.length,
                sentAt: serverTimestamp(),
                expiresAt: expiryDate ? expiryDate : null
            });

            setSentStatus({ success: true, count: tokens.length });
            setSnackbarOpen(true);
            setTitle('');
            setMessage('');
            setExpiryDate('');
        } catch (error) {
            console.error("Error broadcasting notification: ", error);
            setSentStatus({ success: false, error: error.message });
            setSnackbarOpen(true);
        } finally {
            setSending(false);
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Notifications</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 4, borderRadius: 1.25 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                            <NotificationsActiveIcon sx={{ mr: 1, color: '#00695c' }} /> New Broadcast Message
                        </Typography>

                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>Target Audience</InputLabel>
                                <Select
                                    value={target}
                                    label="Target Audience"
                                    onChange={(e) => setTarget(e.target.value)}
                                >
                                    <MenuItem value="all">All Registered Devices</MenuItem>
                                    <MenuItem value="tourists">Tourists Only</MenuItem>
                                    <MenuItem value="vendors">Partners & Vendors Only</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Notification Title"
                                fullWidth
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Eco-Festival Tomorrow!"
                                disabled={sending}
                            />

                            <TextField
                                label="Message Body"
                                fullWidth
                                multiline
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe the important update for your users..."
                                disabled={sending}
                            />

                            <TextField
                                type="date"
                                label="Valid Until (Expiry Date)"
                                fullWidth
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                helperText="If set, the message will automatically disappear from the app after this date."
                                disabled={sending}
                            />

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<SendIcon />}
                                disabled={!title.trim() || !message.trim() || sending}
                                onClick={handleBroadcast}
                                sx={{ borderRadius: 1.25, py: 1.5, fontWeight: 600, bgcolor: '#00695c' }}
                            >
                                {sending ? 'Broadcasting...' : 'Send Broadcast Now'}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ borderRadius: 1.25, bgcolor: '#f8fbfc', border: '1px solid #e0e0e0', mb: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} color="#546e7a" sx={{ mb: 2 }}>MOBILE PREVIEW</Typography>
                            <Paper sx={{ p: 2, borderRadius: 1.25, boxShadow: '0px 4px 20px rgba(0,0,0,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar sx={{ width: 20, height: 20, mr: 1, bgcolor: '#00695c', color: '#fff', fontSize: '0.6rem' }}>C</Avatar>
                                    <Typography variant="caption" fontWeight={600}>CEYLO • Just now</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{title || 'Your Title Here'}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {message || 'Notification content will appear here when users receive it on their devices.'}
                                </Typography>
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert
                    severity={sentStatus?.success ? "success" : "error"}
                    sx={{ borderRadius: 2 }}
                >
                    {sentStatus?.success
                        ? `Broadcast delivered to ${sentStatus.count} active Expo tokens!`
                        : `Broadcast failed: ${sentStatus?.error}`
                    }
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default Notifications;
