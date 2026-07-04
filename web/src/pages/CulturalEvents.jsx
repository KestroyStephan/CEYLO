import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    TextField, Chip, IconButton, Tooltip, Avatar, List, ListItem,
    ListItemText, MenuItem, Divider, Stack, Slider, Snackbar, Alert
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import TimelineIcon from '@mui/icons-material/Timeline';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Religious', 'Arts', 'Cultural', 'Festival', 'Heritage', 'Seasonal'];

import eventsData from '../../../mobile/assets/data/ai_events.json';

// Dynamic load matching trained AI events dataset
const defaultEvents = eventsData.map((e, index) => {
    const months = {
        "January": "01", "February": "02", "March": "03", "April": "04",
        "May": "05", "June": "06", "July": "07", "August": "08",
        "September": "09", "October": "10", "November": "11", "December": "12"
    };
    const mm = months[e.occurrence_month] || "08";
    const dateStr = `2026-${mm}-15`;
    const endDateStr = `2026-${mm}-20`;

    let titleLocal = "";
    if (e.name === "Kandy Esala Perahera") titleLocal = "ඇසළ පෙරහැර";
    else if (e.name === "Galle Literary Festival") titleLocal = "ගාලු සාහිත්‍ය උත්සවය";
    else if (e.name === "Sinhala & Tamil New Year") titleLocal = "සිංහල හා දෙමළ අලුත් අවුරුද්ද";
    else if (e.name === "Vesak Festival") titleLocal = "වෙසක් උත්සවය";

    let cat = "Festival";
    if (e.category.includes("Religious")) cat = "Religious";
    else if (e.category.includes("Arts") || e.category.includes("Literature")) cat = "Arts";
    else if (e.category.includes("Cultural")) cat = "Cultural";
    else if (e.category.includes("Seasonal")) cat = "Seasonal";

    return {
        id: e.event_id || `evt-${index}`,
        title: e.name,
        titleLocal: titleLocal,
        description: `${e.name} is a popular ${e.category.toLowerCase()} event taking place annually in ${e.location} during the month of ${e.occurrence_month}. Expected attendance: ${parseInt(e.expected_attendance || 5000).toLocaleString()}.`,
        date: dateStr,
        endDate: endDateStr,
        location: e.location,
        category: cat,
        geofenceRadius: 3.5,
        imageUrl: e.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        tagText: `Seasonal: ${e.occurrence_month}`
    };
});

export default function CulturalEvents() {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date('2026-08-14'));
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

    const handlePrevWeek = () => {
        setCalendarBaseDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            return newDate;
        });
    };

    const handleNextWeek = () => {
        setCalendarBaseDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            return newDate;
        });
    };

    const getWeekDays = (baseDate) => {
        const start = new Date(baseDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = getWeekDays(calendarBaseDate);

    const hasEventOnDay = (dateToCheck) => {
        return events.some(e => {
            const t = new Date(dateToCheck).setHours(0, 0, 0, 0);
            const start = new Date(e.date).setHours(0, 0, 0, 0);
            const end = new Date(e.endDate || e.date).setHours(23, 59, 59, 999);
            return t >= start && t <= end;
        });
    };

    const filteredEventsByCalendar = events.filter(e => {
        if (!selectedCalendarDate) return true;
        const calTime = new Date(selectedCalendarDate).setHours(0, 0, 0, 0);
        const start = new Date(e.date).setHours(0, 0, 0, 0);
        const end = new Date(e.endDate || e.date).setHours(23, 59, 59, 999);
        return calTime >= start && calTime <= end;
    });

    const [formData, setFormData] = useState({
        title: '',
        titleLocal: '',
        date: '',
        endDate: '',
        location: 'Colombo, Western Province',
        description: '',
        category: 'Religious',
        geofenceRadius: 3.5,
        imageUrl: ''
    });

    useEffect(() => {
        const q = query(collection(db, "cultural_events"), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Merge with mock defaults
            let merged = [...firebaseEvents];
            defaultEvents.forEach(mock => {
                if (!merged.some(e => e.id === mock.id || e.title === mock.title)) {
                    merged.push(mock);
                }
            });

            setEvents(merged);
        }, (err) => {
            console.error("Cultural events listen error:", err);
            let merged = [];
            defaultEvents.forEach(mock => merged.push(mock));
            setEvents(merged);
        });
        return () => unsubscribe();
    }, []);

    // Set first event as selected on load
    useEffect(() => {
        if (events.length > 0 && !selectedEvent && !isCreating) {
            setSelectedEvent(events[0]);
            setFormData(events[0]);
        }
    }, [events, selectedEvent, isCreating]);

    const handleSelectEvent = (event) => {
        setIsCreating(false);
        setSelectedEvent(event);
        setFormData({
            title: event.title || '',
            titleLocal: event.titleLocal || '',
            date: event.date || '',
            endDate: event.endDate || '',
            location: event.location || 'Colombo, Western Province',
            description: event.description || '',
            category: event.category || 'Religious',
            geofenceRadius: event.geofenceRadius || 3.5,
            imageUrl: event.imageUrl || ''
        });
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedEvent(null);
        setFormData({
            title: 'New Event',
            titleLocal: '',
            date: new Date().toISOString().split('T')[0],
            endDate: '',
            location: 'Colombo, Western Province',
            description: '',
            category: 'Religious',
            geofenceRadius: 3.5,
            imageUrl: ''
        });
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                // Add new to Firestore
                await addDoc(collection(db, "cultural_events"), formData);
                setSnackbar({ open: true, message: 'Event created successfully!', severity: 'success' });
                setIsCreating(false);
            } else if (selectedEvent) {
                // Update in Firestore
                if (!selectedEvent.id.startsWith('mock-')) {
                    await updateDoc(doc(db, "cultural_events", selectedEvent.id), formData);
                }
                setSnackbar({ open: true, message: 'Event details saved successfully!', severity: 'success' });
            }
        } catch (error) {
            console.error(error);
            setSnackbar({ open: true, message: 'Error saving event: ' + error.message, severity: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            if (!id.startsWith('mock-')) {
                await deleteDoc(doc(db, "cultural_events", id));
            }
            setSnackbar({ open: true, message: 'Event deleted.', severity: 'info' });
            setSelectedEvent(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Sub-Header nav bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={900} color="#006A3B" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        CMS: Events
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#777', cursor: 'pointer' }}>Global Feed</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#006A3B', borderBottom: '2.5px solid #006A3B', pb: 0.5, cursor: 'pointer' }}>Alerts</Typography>
                    </Stack>
                </Box>
                <Button 
                    variant="contained" 
                    onClick={handleCreateNew}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2, textTransform: 'none', px: 2.5 }}
                >
                    Create New Event
                </Button>
            </Box>

            {/* Cultural Mosaic title row */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight={950} color="#181D19">
                        Cultural Mosaic Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Configure seasonal festivals, geofences, and cultural broadcasts across the island.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ color: '#3F4941', borderColor: '#BECABE', fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                        Filter
                    </Button>
                    <Button variant="outlined" startIcon={<TimelineIcon />} sx={{ color: '#3F4941', borderColor: '#BECABE', fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                        Timeline View
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                
                {/* Left Column: Schedule & Active list */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        
                        {/* Weekly Calendar Widget */}
                        <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={900} color="#181D19">
                                    Upcoming Schedule
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography 
                                        variant="caption" 
                                        onClick={handlePrevWeek} 
                                        sx={{ cursor: 'pointer', fontWeight: 900, fontSize: '1rem', color: '#006A3B', userSelect: 'none', px: 0.5 }}
                                    >
                                        ‹
                                    </Typography>
                                    <Typography variant="caption" fontWeight={850} color="#3F4941">
                                        {calendarBaseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        onClick={handleNextWeek} 
                                        sx={{ cursor: 'pointer', fontWeight: 900, fontSize: '1rem', color: '#006A3B', userSelect: 'none', px: 0.5 }}
                                    >
                                        ›
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Stack direction="row" spacing={1} justifyContent="space-between">
                                {weekDays.map((dateObj, i) => {
                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                                    const dateNum = dateObj.getDate();
                                    const isSelected = selectedCalendarDate && dateObj.toDateString() === selectedCalendarDate.toDateString();
                                    const hasEvents = hasEventOnDay(dateObj);
                                    
                                    let bgColor = 'transparent';
                                    const dayEvents = events.filter(e => {
                                        const t = new Date(dateObj).setHours(0, 0, 0, 0);
                                        const start = new Date(e.date).setHours(0, 0, 0, 0);
                                        const end = new Date(e.endDate || e.date).setHours(23, 59, 59, 999);
                                        return t >= start && t <= end;
                                    });
                                    if (dayEvents.some(e => e.category === 'Religious')) bgColor = '#fbc02d30';
                                    else if (dayEvents.some(e => e.category === 'Arts' || e.category === 'Cultural')) bgColor = '#80deea30';
                                    else if (dayEvents.length > 0) bgColor = '#e0f2f170';

                                    return (
                                        <Box 
                                            key={i} 
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedCalendarDate(null);
                                                } else {
                                                    setSelectedCalendarDate(dateObj);
                                                }
                                            }}
                                            sx={{ 
                                                flex: 1, 
                                                textAlign: 'center', 
                                                p: 0.8, 
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                border: isSelected ? '2px solid #006A3B' : '1px solid transparent',
                                                bgcolor: bgColor,
                                                '&:hover': { bgcolor: '#EBEFE8' }
                                            }}
                                        >
                                            <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', fontSize: '0.65rem' }}>{dayName}</Typography>
                                            <Typography variant="body2" fontWeight={900} color="#181D19">{dateNum}</Typography>
                                            {hasEvents && <Box sx={{ width: 4, height: 4, bgcolor: '#006A3B', borderRadius: '50%', mx: 'auto', mt: 0.5 }} />}
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>

                        {/* Active Festivals List */}
                        <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={900} color="#181D19">
                                    Active Festivals {selectedCalendarDate && `(${filteredEventsByCalendar.length})`}
                                </Typography>
                                {selectedCalendarDate && (
                                    <Typography 
                                        variant="caption" 
                                        onClick={() => setSelectedCalendarDate(null)}
                                        sx={{ color: '#006A3B', cursor: 'pointer', fontWeight: 800 }}
                                    >
                                        Clear Filter
                                    </Typography>
                                )}
                            </Box>
                            
                            <List sx={{ p: 0 }}>
                                {filteredEventsByCalendar.map((event) => {
                                    const isSelected = selectedEvent?.id === event.id;
                                    const isReligious = event.category === 'Religious';
                                    
                                    return (
                                        <Paper
                                            key={event.id}
                                            onClick={() => handleSelectEvent(event)}
                                            sx={{
                                                p: 2,
                                                mb: 2,
                                                cursor: 'pointer',
                                                borderRadius: 4,
                                                border: isSelected ? '2px solid #006A3B' : '1px solid #BECABE',
                                                boxShadow: 'none',
                                                bgcolor: isSelected ? '#EBEFE8' : '#FFF',
                                                display: 'flex',
                                                gap: 2,
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Avatar 
                                                variant="rounded" 
                                                src={event.imageUrl} 
                                                sx={{ width: 56, height: 56, borderRadius: 2 }}
                                            />
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" fontWeight={900} color={isReligious ? '#006A3B' : '#735C00'}>
                                                        {event.category?.toUpperCase() || 'EVENT'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                        {event.tagText || 'Active'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={850} color="#181D19">
                                                    {event.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {event.location}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </List>
                        </Paper>

                        {/* Broadcast launcher banner */}
                        <Paper sx={{ p: 2, borderRadius: 4, border: '1px solid #006A3B', bgcolor: '#F6FBF3', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: 'rgba(0,106,59,0.12)', color: '#006A3B' }}><SendIcon fontSize="small" /></Avatar>
                                <Box>
                                    <Typography variant="body2" fontWeight={800} color="#006A3B">Event Broadcaster</Typography>
                                    <Typography variant="caption" color="text.secondary">Send push alerts to 12.4k nearby travelers</Typography>
                                </Box>
                            </Box>
                            <Button 
                                onClick={() => navigate('/notifications')} 
                                endIcon={<ArrowForwardIcon />} 
                                sx={{ color: '#006A3B', fontWeight: 900, textTransform: 'none', fontSize: '0.8rem' }}
                            >
                                Launch
                            </Button>
                        </Paper>

                    </Stack>
                </Grid>

                {/* Right Column: Event Configuration Editor */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', minHeight: 600 }}>
                        <Stack spacing={3}>
                            
                            {/* Configuration Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Avatar sx={{ bgcolor: '#E8F5E9', color: '#006A3B' }}><EditIcon /></Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={900}>
                                            Event Configuration
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                            {isCreating ? 'Drafting: New Event Proposal' : `Drafting: ${formData.title}`}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Stack direction="row" spacing={3} alignItems="center">
                                    <Button 
                                        variant="text" 
                                        onClick={handleCreateNew}
                                        sx={{ color: '#BA1A1A', fontWeight: 800, textTransform: 'none' }}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSave}
                                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, py: 1.2, px: 3, borderRadius: 2, fontWeight: 800, textTransform: 'none' }}
                                    >
                                        Save Changes
                                    </Button>
                                </Stack>
                            </Box>

                            <Divider />

                            {/* Main Input Form */}
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                        EVENT NAME (ENGLISH)
                                    </Typography>
                                    <TextField 
                                        fullWidth
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                        EVENT NAME (SINHALA/TAMIL)
                                    </Typography>
                                    <TextField 
                                        fullWidth
                                        value={formData.titleLocal}
                                        onChange={(e) => setFormData({ ...formData, titleLocal: e.target.value })}
                                        sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                        placeholder="නාවම් පෙරහැර / නවම් පෙර"
                                    />
                                </Grid>
                                
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                        DESCRIPTION
                                    </Typography>
                                    <TextField 
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        sx={{ bgcolor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 4 }}>
                                    <Stack spacing={2.5}>
                                        <Box>
                                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                                START DATE
                                            </Typography>
                                            <TextField 
                                                type="date"
                                                fullWidth
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                                END DATE
                                            </Typography>
                                            <TextField 
                                                type="date"
                                                fullWidth
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1 }}>
                                                CATEGORY
                                            </Typography>
                                            <TextField 
                                                select
                                                fullWidth
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Box>
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 8 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="caption" fontWeight={900} color="#3F4941">
                                            GEOFENCE RADIUS
                                        </Typography>
                                        <Typography variant="caption" fontWeight={900} color="#006A3B">
                                            {formData.geofenceRadius} km
                                        </Typography>
                                    </Box>
                                    
                                    {/* Slider */}
                                    <Slider 
                                        value={formData.geofenceRadius}
                                        min={0.5}
                                        max={10.0}
                                        step={0.5}
                                        onChange={(e, val) => setFormData({ ...formData, geofenceRadius: val })}
                                        sx={{ color: '#006A3B', mb: 2 }}
                                    />

                                    {/* Mini Geofence Map */}
                                    <Box sx={{ position: 'relative', width: '100%', height: 180, borderRadius: 3, overflow: 'hidden', border: '1px solid #BECABE' }}>
                                        <iframe 
                                            title="Geofence Radius Preview"
                                            src={`https://maps.google.com/maps?q=6.9271,79.8612&t=&z=12&ie=UTF8&iwloc=&output=embed`}
                                            style={{ width: '100%', height: '100%', border: 'none', filter: 'grayscale(0.3)' }}
                                        />
                                        <Box sx={{ 
                                            position: 'absolute', 
                                            top: '50%', 
                                            left: '50%', 
                                            width: `${formData.geofenceRadius * 25}px`, 
                                            height: `${formData.geofenceRadius * 25}px`, 
                                            borderRadius: '50%', 
                                            border: '2px solid #006A3B', 
                                            bgcolor: 'rgba(0,106,59,0.15)',
                                            transform: 'translate(-50%, -50%)',
                                            pointerEvents: 'none'
                                        }} />
                                        <Box sx={{ position: 'absolute', bottom: 10, left: 10, bgcolor: 'rgba(0,0,0,0.7)', px: 1, py: 0.5, borderRadius: 1.5 }}>
                                            <Typography variant="caption" color="#FFF" fontWeight={800}>
                                                PIN: 6.9167° N, 79.8500° E
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Upload promotional imagery wrapper */}
                            <Paper 
                                sx={{ 
                                    p: 4, 
                                    borderRadius: 3, 
                                    border: '2.5px dashed #BECABE', 
                                    bgcolor: '#FFF', 
                                    boxShadow: 'none', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 1.5,
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: '#006A3B' }
                                }}
                            >
                                <PhotoCameraIcon sx={{ fontSize: 40, color: '#3F4941' }} />
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" fontWeight={800} color="#3F4941">
                                        Upload Promotional Imagery
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Optimal 16:9 ratio. High-resolution images reflect the luxury eco-experience.
                                    </Typography>
                                </Box>
                            </Paper>

                            {!isCreating && selectedEvent && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        startIcon={<DeleteIcon />} 
                                        onClick={() => handleDelete(selectedEvent.id)}
                                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                                    >
                                        Delete Event Listing
                                    </Button>
                                </Box>
                            )}

                        </Stack>
                    </Paper>
                </Grid>

            </Grid>

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
