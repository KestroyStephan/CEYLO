import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Chip, IconButton, Tooltip, Avatar, List, ListItem, ListItemText
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function CulturalEvents() {
    const [events, setEvents] = useState([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        description: '',
        type: 'Festival'
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "cultural_events"), (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleOpen = (event = null) => {
        if (event) {
            setFormData(event);
            setSelectedId(event.id);
            setEditMode(true);
        } else {
            setFormData({ title: '', date: '', location: '', description: '', type: 'Festival' });
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
                        Cultural Heritage Events
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Promote local traditions and cultural festivals on the interactive map.
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: 2, bgcolor: '#00695c' }}
                >
                    Add Event
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={7}>
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <List sx={{ p: 0 }}>
                            {events.map((event, idx) => (
                                <React.Fragment key={event.id}>
                                    <ListItem sx={{ py: 2, px: 3 }}>
                                        <Avatar sx={{ bgcolor: '#e0f2f1', color: '#00695c', mr: 2 }}>
                                            <EventIcon />
                                        </Avatar>
                                        <ListItemText 
                                            primary={<Typography fontWeight={700}>{event.title}</Typography>}
                                            secondary={`${event.date} • ${event.location}`}
                                        />
                                        <Chip label={event.type} size="small" variant="outlined" sx={{ mr: 2 }} />
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpen(event)}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(event.id)}><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    </ListItem>
                                    {idx < events.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                        {events.length === 0 && <Box sx={{ p: 10, textAlign: 'center' }}><Typography color="text.secondary">No events scheduled.</Typography></Box>}
                    </Paper>
                </Grid>

                {/* Simulated Map Pin View */}
                <Grid item xs={12} lg={5}>
                    <Paper sx={{ 
                        borderRadius: 4, 
                        height: 400, 
                        bgcolor: '#f0f4f8', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '2px dashed #cfd8dc'
                    }}>
                        <LocationOnIcon sx={{ fontSize: 60, color: '#d32f2f', mb: 1, filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.2))' }} />
                        <Typography variant="h6" fontWeight={700} color="text.secondary">Interactive Map Live View</Typography>
                        <Typography variant="caption" color="text.secondary">Drag pins to adjust event locations</Typography>
                        
                        {/* Simulated Pins */}
                        {events.map((e, idx) => (
                            <Box key={e.id} sx={{ 
                                position: 'absolute', 
                                top: `${20 + (idx * 15)%60}%`, 
                                left: `${20 + (idx * 25)%60}%`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <Tooltip title={e.title}>
                                    <LocationOnIcon sx={{ color: '#00695c', cursor: 'pointer' }} />
                                </Tooltip>
                            </Box>
                        ))}
                    </Paper>
                    <Card sx={{ mt: 2, borderRadius: 4, bgcolor: '#00695c', color: '#fff' }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={700}>MAP ANALYTICS</Typography>
                            <Typography variant="h4" fontWeight={900}>{events.length}</Typography>
                            <Typography variant="caption">Active cultural pins this month</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Editor Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={800}>{editMode ? 'Update Event' : 'Schedule Event'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField label="Event Title" fullWidth value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        <TextField label="Date" fullWidth placeholder="e.g. 2026-05-15" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        <TextField label="Location" fullWidth value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                        <TextField label="Description" fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} color="primary">Save Event</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Missing Divider import handled by adding it
import { Divider } from '@mui/material';

export default CulturalEvents;
