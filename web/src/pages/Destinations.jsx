import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardMedia, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Rating, Slider, Chip, IconButton, Tooltip
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GrassIcon from '@mui/icons-material/Grass';
import LandscapeIcon from '@mui/icons-material/Landscape';

function Destinations() {
    const [destinations, setDestinations] = useState([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        ecoScore: 70,
        category: 'Eco Spot'
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "destinations"), (snapshot) => {
            setDestinations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleOpen = (dest = null) => {
        if (dest) {
            setFormData(dest);
            setSelectedId(dest.id);
            setEditMode(true);
        } else {
            setFormData({ name: '', description: '', imageUrl: '', ecoScore: 70, category: 'Eco Spot' });
            setEditMode(false);
        }
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editMode) {
                await updateDoc(doc(db, "destinations", selectedId), formData);
            } else {
                await addDoc(collection(db, "destinations"), formData);
            }
            setOpen(false);
        } catch (error) {
            console.error("Error saving destination:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this destination?")) {
            await deleteDoc(doc(db, "destinations", id));
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#37474f">
                        Sustainable Destinations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage eco-friendly spots and hidden gems for the CEYLO platform.
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: 2, bgcolor: '#00695c' }}
                >
                    Add Destination
                </Button>
            </Box>

            <Grid container spacing={3}>
                {destinations.map((dest) => (
                    <Grid item xs={12} sm={6} md={4} key={dest.id}>
                        <Card sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardMedia
                                component="img"
                                height="160"
                                image={dest.imageUrl || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470'}
                                alt={dest.name}
                            />
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="h6" fontWeight={700}>{dest.name}</Typography>
                                    <Chip 
                                        label={`${dest.ecoScore}%`} 
                                        color={dest.ecoScore > 80 ? 'success' : 'warning'} 
                                        size="small" 
                                        icon={<GrassIcon />}
                                        sx={{ fontWeight: 800 }}
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                    {dest.description}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                                    <Chip label={dest.category} size="small" variant="outlined" />
                                    <Box>
                                        <IconButton size="small" color="primary" onClick={() => handleOpen(dest)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(dest.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Editor Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight={800}>{editMode ? 'Edit Destination' : 'New Destination'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField 
                            label="Name" 
                            fullWidth 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        />
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
                        
                        <Box sx={{ mt: 2 }}>
                            <Typography gutterBottom variant="subtitle2" fontWeight={700}>
                                <GrassIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle', color: '#00695c' }} />
                                Sustainability Score Editor ({formData.ecoScore}%)
                            </Typography>
                            <Slider 
                                value={formData.ecoScore} 
                                onChange={(e, val) => setFormData({...formData, ecoScore: val})} 
                                color={formData.ecoScore > 80 ? 'success' : 'warning'}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} color="primary" sx={{ borderRadius: 2 }}>
                        Save Destination
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Destinations;
