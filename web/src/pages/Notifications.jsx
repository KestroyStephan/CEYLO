import React, { useState } from 'react';
import { 
    Box, Typography, Button, Paper, TextField, 
    Select, MenuItem, FormControl, InputLabel,
    Stack, Chip, Alert, Card, CardContent, Grid, Avatar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';

function Notifications() {
    const [target, setTarget] = useState('all');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const handleBroadcast = () => {
        // Simulate FCM broadcast logic
        setSent(true);
        setTimeout(() => setSent(false), 3000);
        setTitle('');
        setMessage('');
    };

    return (
        <Box maxWidth="md">
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Push Notification Broadcaster
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Send real-time alerts, eco-tips, and event reminders to CEYLO mobile app users.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 4, borderRadius: 4 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                            <NotificationsActiveIcon sx={{ mr: 1, color: '#ef6c00' }} /> New Broadcast Message
                        </Typography>
                        
                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>Target Audience</InputLabel>
                                <Select
                                    value={target}
                                    label="Target Audience"
                                    onChange={(e) => setTarget(e.target.value)}
                                >
                                    <MenuItem value="all">All App Users (System Wide)</MenuItem>
                                    <MenuItem value="tourists">Active Tourists</MenuItem>
                                    <MenuItem value="vendors">Service Providers</MenuItem>
                                    <MenuItem value="nearby">Users Near Current Map Focus</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField 
                                label="Notification Title" 
                                fullWidth 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Eco-Festival Tomorrow!"
                            />

                            <TextField 
                                label="Message Body" 
                                fullWidth 
                                multiline 
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe the important update for your users..."
                            />

                            {sent && (
                                <Alert severity="success" sx={{ borderRadius: 2 }}>
                                    Broadcast sent successfully to {target === 'all' ? '12,482' : '3,105'} devices.
                                </Alert>
                            )}

                            <Button 
                                variant="contained" 
                                size="large" 
                                startIcon={<SendIcon />}
                                disabled={!title || !message}
                                onClick={handleBroadcast}
                                sx={{ borderRadius: 3, py: 1.5, fontWeight: 700, bgcolor: '#00695c' }}
                            >
                                Send Broadcast Now
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Card sx={{ borderRadius: 4, bgcolor: '#f8fbfc', border: '1px solid #e0e0e0', mb: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={800} color="#546e7a" sx={{ mb: 2 }}>MOBILE PREVIEW</Typography>
                            <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar src="/logo.png" sx={{ width: 20, height: 20, mr: 1 }} />
                                    <Typography variant="caption" fontWeight={700}>CEYLO • Just now</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={800}>{title || 'Your Title Here'}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {message || 'Notification content will appear here when users receive it on their devices.'}
                                </Typography>
                            </Paper>
                        </CardContent>
                    </Card>

                    <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#37474f', color: '#fff' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>DELIVERY STATS</Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Delivery Success Rate</Typography>
                                <Typography variant="caption" fontWeight={700} color="#81c784">98.2%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Average Click Through</Typography>
                                <Typography variant="caption" fontWeight={700} color="#4fc3f7">4.1%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">Active FCM Tokens</Typography>
                                <Typography variant="caption" fontWeight={700}>15,092</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Notifications;
