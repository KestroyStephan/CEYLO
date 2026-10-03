import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper,
    TextField, Chip, IconButton, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Stack, Slider, MenuItem, Snackbar, Alert, InputAdornment
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';

import eventsData from '../../../mobile/assets/data/ai_events.json';

const CATEGORIES = ['Religious', 'Arts', 'Cultural', 'Festival', 'Heritage', 'Seasonal', 'Adventure', 'Wildlife', 'Nightlife', 'Leisure', 'Food', 'Family', 'Solo'];

// Massive dataset to simulate AI agent scanning all Sri Lankan events
const aiPickedActivities = [
    ...eventsData,
    { name: 'Sigiriya Rock Climbing', category: 'Heritage', occurrence_month: 'January', location: 'Sigiriya, Central Province', image: 'https://images.unsplash.com/photo-1588665391512-42171505a76e' },
    { name: 'Mirissa Whale Watching', category: 'Wildlife', occurrence_month: 'February', location: 'Mirissa, Southern Province', image: 'https://images.unsplash.com/photo-1549429188-f29e1eb16dfa' },
    { name: 'Arugam Bay Surfing Season', category: 'Adventure', occurrence_month: 'July', location: 'Arugam Bay, Eastern Province', image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f' },
    { name: 'Nallur Kandaswamy Festival', category: 'Religious', occurrence_month: 'August', location: 'Jaffna, Northern Province', image: 'https://images.unsplash.com/photo-1589139599557-4b68ef5c1926' },
    { name: 'Yala Leopard Safari', category: 'Wildlife', occurrence_month: 'September', location: 'Yala, Uva Province', image: 'https://images.unsplash.com/photo-1555571120-7f28bc1748cd' },
    { name: 'Ella Scenic Train Journey', category: 'Adventure', occurrence_month: 'December', location: 'Ella, Uva Province', image: 'https://images.unsplash.com/photo-1559828551-24b52e008d5b' },
    { name: 'Galle Fort Heritage Walk', category: 'Cultural', occurrence_month: 'March', location: 'Galle, Southern Province', image: 'https://images.unsplash.com/photo-1585257904090-f2038e1a1795' },
    { name: 'Adam\'s Peak Pilgrimage', category: 'Religious', occurrence_month: 'April', location: 'Hatton, Central Province', image: 'https://images.unsplash.com/photo-1577967965452-9443b7fc1f2d' },

    // New Highly Diverse Events added based on AI tracking
    { name: 'Unawatuna Beach Full Moon Party', category: 'Nightlife', occurrence_month: 'January', location: 'Unawatuna, Southern Province', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7' },
    { name: 'Hikkaduwa DJ Fest 2026', category: 'Nightlife', occurrence_month: 'December', location: 'Hikkaduwa, Southern Province', image: 'https://images.unsplash.com/photo-1470229722913-7c092bba1d19' },
    { name: 'Colombo Street Food Festival', category: 'Food', occurrence_month: 'May', location: 'Colombo, Western Province', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1' },
    { name: 'St. Anne\'s Church Feast', category: 'Religious', occurrence_month: 'August', location: 'Talawila, North Western Province', image: 'https://images.unsplash.com/photo-1548625361-ec853c84d728' },
    { name: 'Kataragama Esala Festival (Thiruvila)', category: 'Religious', occurrence_month: 'July', location: 'Kataragama, Uva Province', image: 'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a' },
    { name: 'Colombo Holi Colour Festival', category: 'Festival', occurrence_month: 'March', location: 'Colombo, Western Province', image: 'https://images.unsplash.com/photo-1517457210348-703079e57d4b' },
    { name: 'Trincomalee Deep Sea Diving', category: 'Adventure', occurrence_month: 'April', location: 'Trincomalee, Eastern Province', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5' },
    { name: 'Nuwara Eliya Tea Plucking Experience', category: 'Leisure', occurrence_month: 'February', location: 'Nuwara Eliya, Central Province', image: 'https://images.unsplash.com/photo-1596767516765-b38460699bc4' },
    { name: 'Solo Backpackers Jungle Hike', category: 'Solo', occurrence_month: 'June', location: 'Sinharaja, Sabaragamuwa Province', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306' },
    { name: 'Family Turtle Hatchery Visit', category: 'Family', occurrence_month: 'October', location: 'Kosgoda, Southern Province', image: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f' },
    { name: 'Navam Maha Perahera', category: 'Cultural', occurrence_month: 'February', location: 'Colombo, Western Province', image: 'https://images.unsplash.com/photo-1583262791845-a7b2933bebd9' },
    { name: 'Jaffna Mango Festival', category: 'Food', occurrence_month: 'June', location: 'Jaffna, Northern Province', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919' },
    { name: 'Kite Surfing Championship', category: 'Adventure', occurrence_month: 'July', location: 'Kalpitiya, North Western Province', image: 'https://images.unsplash.com/photo-1513628741349-f79435b6abf8' },
    { name: 'Hot Air Ballooning (Rare Event)', category: 'Adventure', occurrence_month: 'November', location: 'Dambulla, Central Province', image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee' },
    { name: 'Pinnawala Elephant Bathing (Family)', category: 'Family', occurrence_month: 'All Year', location: 'Pinnawala, Sabaragamuwa Province', image: 'https://images.unsplash.com/photo-1582274474773-f9f36f6d0f50' },
    { name: 'Madhu Church Feast', category: 'Religious', occurrence_month: 'August', location: 'Mannar, Northern Province', image: 'https://images.unsplash.com/photo-1544427920-c49ccf7a0774' },
    { name: 'Rhythm of the Beach (EDM Party)', category: 'Nightlife', occurrence_month: 'August', location: 'Negombo, Western Province', image: 'https://images.unsplash.com/photo-1533174000273-7d5a045952c1' },
    { name: 'Sri Lankan Ayurveda Retreat', category: 'Leisure', occurrence_month: 'September', location: 'Bentota, Southern Province', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef' },
];

const defaultEvents = aiPickedActivities.map((e, index) => {
    const months = { "January": "01", "February": "02", "March": "03", "April": "04", "May": "05", "June": "06", "July": "07", "August": "08", "September": "09", "October": "10", "November": "11", "December": "12" };
    const mm = months[e.occurrence_month];
    const now = new Date();
    // Next time this yearly event happens; "All Year" events show from the current month
    const monthIdx = mm ? parseInt(mm, 10) - 1 : now.getMonth();
    const year = monthIdx < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`;

    let cat = "Festival";
    if (e.category.includes("Religious")) cat = "Religious";
    else if (e.category.includes("Arts") || e.category.includes("Literature")) cat = "Arts";
    else if (e.category.includes("Cultural")) cat = "Cultural";
    else if (e.category.includes("Seasonal")) cat = "Seasonal";

    return {
        id: `mock-${index}`,
        title: e.name,
        titleLocal: '',
        description: `${e.name} is a popular ${e.category.toLowerCase()} event taking place annually in ${e.location}.`,
        date: dateStr,
        endDate: dateStr,
        location: e.location,
        category: cat,
        geofenceRadius: 3.5,
        imageUrl: e.image || "",
        aiSuggested: true,
        approvalStatus: 'waiting', // waiting, approved, declined
        rating: null,
        isRare: e.name.includes('Rare')
    };
});

export default function CulturalEvents() {
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10); // Changed default to 10 rows
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');

    // Editor State
    const [openDialog, setOpenDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({});

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const q = query(collection(db, "cultural_events"), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let merged = [...firebaseEvents];
            defaultEvents.forEach(mock => {
                if (!merged.some(e => e.id === mock.id || e.title === mock.title)) {
                    merged.push(mock);
                }
            });

            setEvents(merged);
        }, (err) => {
            console.error(err);
            setEvents([...defaultEvents]);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenEditor = (event = null) => {
        if (event) {
            setIsCreating(false);
            setSelectedEvent(event);
            setFormData(event);
        } else {
            setIsCreating(true);
            setSelectedEvent(null);
            setFormData({
                title: '', titleLocal: '', date: new Date().toISOString().split('T')[0], endDate: '',
                location: 'Colombo', description: '', category: 'Religious', geofenceRadius: 3.5,
                imageUrl: '', aiSuggested: false, approvalStatus: 'approved'
            });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                await addDoc(collection(db, "cultural_events"), formData);
                setSnackbar({ open: true, message: 'Event created!', severity: 'success' });
            } else {
                if (!selectedEvent.id.startsWith('mock-')) {
                    await updateDoc(doc(db, "cultural_events", selectedEvent.id), formData);
                }
                setSnackbar({ open: true, message: 'Event updated!', severity: 'success' });
            }
            setOpenDialog(false);
        } catch (error) {
            setSnackbar({ open: true, message: 'Error: ' + error.message, severity: 'error' });
        }
    };

    const handleApproval = async (event, status) => {
        try {
            if (event.id.startsWith('mock-')) {
                // If it's a mock AI event, we save it to DB upon approval
                const newEvent = { ...event, approvalStatus: status, id: undefined };
                await addDoc(collection(db, "cultural_events"), newEvent);
            } else {
                await updateDoc(doc(db, "cultural_events", event.id), { approvalStatus: status });
            }
            setSnackbar({ open: true, message: `Event ${status} successfully!`, severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Approval error: ' + error.message, severity: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this event?")) return;
        if (!id.startsWith('mock-')) {
            await deleteDoc(doc(db, "cultural_events", id));
        }
        setSnackbar({ open: true, message: 'Event deleted.', severity: 'info' });
    };

    // Filter and Pagination
    const filteredEvents = events.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTime = true;
        if (timeFilter !== 'all') {
            const eventDate = new Date(e.date).getTime();
            const today = new Date().getTime();
            const twoWeeks = 14 * 24 * 60 * 60 * 1000;

            if (timeFilter === 'finished') {
                matchesTime = eventDate < today - twoWeeks;
            } else if (timeFilter === 'happening_now') {
                matchesTime = eventDate >= today - twoWeeks && eventDate <= today + twoWeeks;
            } else if (timeFilter === 'upcoming') {
                matchesTime = eventDate > today + twoWeeks;
            }
        }

        return matchesSearch && matchesTime;
    });
    const displayedEvents = filteredEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#006A3B" gutterBottom>
                        CMS: AI Events & Culture
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Review AI-predicted events, approve tourist activities, and manage geofenced broadcasts.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => handleOpenEditor()}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2, px: 3 }}
                >
                    Create Manual Event
                </Button>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <TextField
                    placeholder="Search events or categories..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 320, bgcolor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action"/></InputAdornment> }}
                />
                <TextField
                    select
                    size="small"
                    value={timeFilter}
                    onChange={(e) => { setTimeFilter(e.target.value); setPage(0); }}
                    sx={{ width: 200, bgcolor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
                >
                    <MenuItem value="all" sx={{ fontWeight: 700 }}>All Timeline</MenuItem>
                    <MenuItem value="happening_now" sx={{ fontWeight: 700, color: '#006A3B' }}>Happening Now</MenuItem>
                    <MenuItem value="upcoming" sx={{ fontWeight: 700, color: '#1976D2' }}>Upcoming Events</MenuItem>
                    <MenuItem value="finished" sx={{ fontWeight: 700, color: '#777' }}>Finished</MenuItem>
                </TextField>
            </Box>

            {/* Table */}
            <Paper sx={{ borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#F4F7F6' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>Event Details</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>Date & Location</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>AI Status</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>Approval / Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayedEvents.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar variant="rounded" src={row.imageUrl} sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#EBEFE8' }} />
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="#181D19">{row.title}</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                                    {row.aiSuggested && (
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#E3F2FD', color: '#1976D2', px: 1, py: 0.2, borderRadius: 1 }}>
                                                            <AutoAwesomeIcon sx={{ fontSize: 12 }} />
                                                            <Typography variant="caption" fontWeight={700}>AI Picked</Typography>
                                                        </Box>
                                                    )}
                                                    {row.isRare && (
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#FCE4EC', color: '#C2185B', px: 1, py: 0.2, borderRadius: 1 }}>
                                                            <Typography variant="caption" fontWeight={700}>✨ Rare Event</Typography>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#FFF8E1', color: '#F57F17', px: 1, py: 0.2, borderRadius: 1, border: '1px solid #FFECB3' }}>
                                                        <Typography variant="caption" fontWeight={800}>{row.rating ? `★ ${row.rating}` : 'Rare'}</Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.category} size="small" sx={{ fontWeight: 700, bgcolor: '#E8F5E9', color: '#006A3B' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700} color="#181D19">{row.date}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.location}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {row.approvalStatus === 'approved' && <Chip label="Approved" size="small" color="success" sx={{ fontWeight: 700 }} />}
                                        {row.approvalStatus === 'declined' && <Chip label="Declined" size="small" color="error" sx={{ fontWeight: 700 }} />}
                                        {row.approvalStatus === 'waiting' && <Chip label="Awaiting Approval" size="small" color="warning" sx={{ fontWeight: 700 }} />}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            {row.approvalStatus === 'waiting' && (
                                                <>
                                                    <IconButton size="small" color="success" onClick={() => handleApproval(row, 'approved')}><CheckCircleIcon /></IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleApproval(row, 'declined')}><CancelIcon /></IconButton>
                                                </>
                                            )}
                                            <Button variant="outlined" size="small" sx={{ borderRadius: 8, fontWeight: 700, textTransform: 'none' }} onClick={() => handleOpenEditor(row)}>
                                                Review / Edit
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredEvents.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </Paper>

            {/* Dialog Editor */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
                <DialogTitle>
                    <Typography variant="h5" fontWeight={900} color="#006A3B">
                        {isCreating ? 'Create Manual Event' : 'Review Event Configuration'}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>EVENT NAME</Typography>
                            <TextField fullWidth value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>CATEGORY</Typography>
                            <TextField select fullWidth value={formData.category || 'Festival'} onChange={(e) => setFormData({ ...formData, category: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                {CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>DESCRIPTION</Typography>
                            <TextField fullWidth multiline rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>START DATE</Typography>
                            <TextField type="date" fullWidth value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>GEOFENCE RADIUS (km)</Typography>
                            <Slider value={formData.geofenceRadius || 3.5} min={0.5} max={10.0} step={0.5} onChange={(e, val) => setFormData({ ...formData, geofenceRadius: val })} sx={{ color: '#006A3B', mt: 2 }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    {!isCreating && (
                        <Button color="error" startIcon={<DeleteIcon />} onClick={() => { handleDelete(selectedEvent.id); setOpenDialog(false); }} sx={{ mr: 'auto', fontWeight: 800 }}>
                            Delete Event
                        </Button>
                    )}
                    <Button onClick={() => setOpenDialog(false)} sx={{ color: '#5C6E64', fontWeight: 800 }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2 }}>
                        Save Configuration
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
