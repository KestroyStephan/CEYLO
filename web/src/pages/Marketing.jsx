import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Paper, TextField, Button,
    Select, MenuItem, FormControl, InputLabel, Snackbar, Alert, Stack, Chip, Divider
} from '@mui/material';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import CampaignIcon from '@mui/icons-material/Campaign';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import EmailIcon from '@mui/icons-material/Email';

export default function Marketing() {
    const [destinations, setDestinations] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState('');
    const [targetType, setTargetType] = useState('destination');

    // SEO State
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [seoKeywords, setSeoKeywords] = useState('');
    const [seoLoading, setSeoLoading] = useState(false);

    // Email Campaign State
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailAudience, setEmailAudience] = useState('all');
    const [emailLoading, setEmailLoading] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const destSnap = await getDocs(collection(db, 'destinations'));
                setDestinations(destSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const eventSnap = await getDocs(collection(db, 'cultural_events'));
                setEvents(eventSnap.docs.map(e => ({ id: e.id, ...e.data() })));
            } catch (err) {
                console.error("Error fetching content for SEO:", err);
            }
        };
        fetchContent();
    }, []);

    const handleSeoUpdate = async () => {
        if (!selectedTarget) {
            setSnackbar({ open: true, message: 'Please select a destination or event.', severity: 'warning' });
            return;
        }
        setSeoLoading(true);
        try {
            const collName = targetType === 'destination' ? 'destinations' : 'cultural_events';
            await updateDoc(doc(db, collName, selectedTarget), {
                seoMeta: {
                    title: seoTitle,
                    description: seoDescription,
                    keywords: seoKeywords.split(',').map(k => k.trim())
                }
            });
            setSnackbar({ open: true, message: 'SEO Meta updated successfully!', severity: 'success' });
            setSeoTitle('');
            setSeoDescription('');
            setSeoKeywords('');
            setSelectedTarget('');
        } catch (e) {
            setSnackbar({ open: true, message: 'SEO update failed: ' + e.message, severity: 'error' });
        } finally {
            setSeoLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!emailSubject || !emailBody) {
            setSnackbar({ open: true, message: 'Email subject and body are required.', severity: 'warning' });
            return;
        }
        setEmailLoading(true);
        try {
            // In a real app, this would trigger an edge function or mail extension
            // We simulate it by logging to a marketing_campaigns collection
            await addDoc(collection(db, 'marketing_campaigns'), {
                subject: emailSubject,
                body: emailBody,
                audience: emailAudience,
                sentAt: serverTimestamp(),
                status: 'Sent'
            });
            setSnackbar({ open: true, message: `Email campaign sent to ${emailAudience}!`, severity: 'success' });
            setEmailSubject('');
            setEmailBody('');
        } catch (e) {
            setSnackbar({ open: true, message: 'Campaign failed: ' + e.message, severity: 'error' });
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            <Box sx={{ mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Marketing</Typography>
            </Box>

            <Grid container spacing={3}>
                {/* SEO Injection Panel */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', color: '#181D19' }}>
                            <ManageSearchIcon sx={{ mr: 1, color: '#ef6c00' }} /> Content SEO Injection
                        </Typography>

                        <Stack spacing={3}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Content Type</InputLabel>
                                        <Select value={targetType} label="Content Type" onChange={(e) => { setTargetType(e.target.value); setSelectedTarget(''); }}>
                                            <MenuItem value="destination">Destination</MenuItem>
                                            <MenuItem value="event">Cultural Event</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Select Item</InputLabel>
                                        <Select value={selectedTarget} label="Select Item" onChange={(e) => setSelectedTarget(e.target.value)}>
                                            {(targetType === 'destination' ? destinations : events).map(item => (
                                                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <TextField
                                label="SEO Meta Title"
                                fullWidth
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                placeholder="e.g. Best Safari in Sri Lanka - Ceylo"
                            />

                            <TextField
                                label="SEO Meta Description"
                                fullWidth
                                multiline rows={3}
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                placeholder="A 160-character snippet for search engines..."
                            />

                            <TextField
                                label="Keywords (comma separated)"
                                fullWidth
                                value={seoKeywords}
                                onChange={(e) => setSeoKeywords(e.target.value)}
                                placeholder="safari, yala, sri lanka, tourism"
                            />

                            <Button
                                variant="contained"
                                onClick={handleSeoUpdate}
                                disabled={seoLoading || !selectedTarget}
                                sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 600, py: 1.5, borderRadius: 2 }}
                            >
                                {seoLoading ? 'Injecting...' : 'Inject SEO Data'}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Email Campaign UI */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', color: '#181D19' }}>
                            <EmailIcon sx={{ mr: 1, color: '#0288d1' }} /> Email Marketing Campaign
                        </Typography>

                        <Stack spacing={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Target Audience</InputLabel>
                                <Select value={emailAudience} label="Target Audience" onChange={(e) => setEmailAudience(e.target.value)}>
                                    <MenuItem value="all">All Users & Partners</MenuItem>
                                    <MenuItem value="tourists">Tourists Only</MenuItem>
                                    <MenuItem value="vendors">Vendors & Guides Only</MenuItem>
                                    <MenuItem value="inactive">Inactive Users (30+ days)</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Campaign Subject"
                                fullWidth
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="e.g. Discover Hidden Gems in Sri Lanka this Season!"
                            />

                            <TextField
                                label="Email HTML Body"
                                fullWidth
                                multiline rows={6}
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="<h1>Welcome to Ceylo</h1><p>Check out our latest...</p>"
                            />

                            <Button
                                variant="contained"
                                onClick={handleSendEmail}
                                disabled={emailLoading}
                                sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontWeight: 600, py: 1.5, borderRadius: 2 }}
                            >
                                {emailLoading ? 'Sending...' : 'Send Campaign Blast'}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
