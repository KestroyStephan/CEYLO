import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Chip, IconButton, Tooltip, Avatar, List, ListItem, ListItemText,
    MenuItem, Divider, CardMedia, Stack
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const CATEGORIES = ['Festival', 'Religious', 'Cultural', 'Heritage', 'Seasonal', 'Function', 'Feast'];

function CulturalEvents() {
    const [events, setEvents] = useState([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        endDate: '',
        location: '',
        description: '',
        type: 'Cultural',
        category: 'Festival',
        imageUrl: ''
    });

    useEffect(() => {
        const q = query(collection(db, "cultural_events"), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleOpen = (event = null) => {
        if (event) {
            setFormData({
                title: event.title || '',
                date: event.date || '',
                endDate: event.endDate || '',
                location: event.location || '',
                description: event.description || '',
                type: event.type || 'Cultural',
                category: event.category || 'Festival',
                imageUrl: event.imageUrl || ''
            });
            setSelectedId(event.id);
            setEditMode(true);
        } else {
            setFormData({ 
                title: '', 
                date: '', 
                endDate: '',
                location: '', 
                description: '', 
                type: 'Cultural',
                category: 'Festival',
                imageUrl: ''
            });
            setEditMode(false);
        }
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editMode) {
                await updateDoc(doc(db, "cultural_events", selectedId), formData);
            } else {
                await addDoc(collection(db, "cultural_events"), formData);
            }
            setOpen(false);
        } catch (error) {
            console.error("Error saving event:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this event?")) {
            await deleteDoc(doc(db, "cultural_events", id));
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#37474f">
                        Cultural & Heritage Calendar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage Sri Lankan festivals, seasonal events, and heritage functions.
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: 2, bgcolor: '#00695c' }}
                >
                    Add New Event
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <List sx={{ p: 0 }}>
                            {events.map((event, idx) => (
                                <React.Fragment key={event.id}>
                                    <ListItem 
                                        sx={{ 
                                            py: 3, 
                                            px: 3,
                                            '&:hover': { bgcolor: '#f5f5f5' }
                                        }}
                                        secondaryAction={
                                            <Stack direction="row" spacing={1}>
                                                <IconButton size="small" onClick={() => handleOpen(event)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDelete(event.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        }
                                    >
                                        <Avatar 
                                            variant="rounded"
                                            src={event.imageUrl}
                                            sx={{ width: 60, height: 60, mr: 2, bgcolor: '#e0f2f1', color: '#00695c' }}
                                        >
                                            <EventIcon />
                                        </Avatar>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="h6" fontWeight={700}>{event.title}</Typography>
                                                    <Chip label={event.category} size="small" color="primary" variant="outlined" />
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <CalendarMonthIcon sx={{ fontSize: 16 }} />
                                                        {event.date} {event.endDate ? `to ${event.endDate}` : ''} • {event.location}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                        {event.description}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {idx < events.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                        {events.length === 0 && <Box sx={{ p: 10, textAlign: 'center' }}><Typography color="text.secondary">No events scheduled.</Typography></Box>}
                    </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, bgcolor: '#004d40', color: '#fff', mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Quick Stats</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Total Events</Typography>
                                <Typography variant="body2" fontWeight={700}>{events.length}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Upcoming (30 days)</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {events.filter(e => new Date(e.date) > new Date() && new Date(e.date) < new Date(Date.now() + 30*24*60*60*1000)).length}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Paper sx={{ borderRadius: 4, p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Event Categories</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {CATEGORIES.map(cat => (
                                <Chip 
                                    key={cat} 
                                    label={`${cat} (${events.filter(e => e.category === cat).length})`} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ mb: 1 }}
                                />
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Editor Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight={800}>{editMode ? 'Update Event Details' : 'Schedule New Event'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <TextField 
                            label="Event Title" 
                            fullWidth 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField 
                                label="Start Date" 
                                type="date"
                                fullWidth 
                                InputLabelProps={{ shrink: true }}
                                value={formData.date} 
                                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                            />
                            <TextField 
                                label="End Date (Optional)" 
                                type="date"
                                fullWidth 
                                InputLabelProps={{ shrink: true }}
                                value={formData.endDate} 
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})} 
                            />
                        </Stack>
                        <TextField 
                            label="Location" 
                            fullWidth 
                            placeholder="e.g. Kandy, Colombo, or Island-wide"
                            value={formData.location} 
                            onChange={(e) => setFormData({...formData, location: e.target.value})} 
                        />
                        <TextField 
                            select
                            label="Category" 
                            fullWidth 
                            value={formData.category} 
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            {CATEGORIES.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField 
                            label="Image URL" 
                            fullWidth 
                            value={formData.imageUrl} 
                            onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                        />
                        <TextField 
                            label="Description" 
                            fullWidth 
                            multiline 
                            rows={3} 
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} color="primary" sx={{ borderRadius: 2 }}>
                        {editMode ? 'Update Event' : 'Create Event'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default CulturalEvents;
