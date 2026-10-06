import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Grid,
    TextField, Chip, IconButton, Avatar,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Select, MenuItem,
    Snackbar, Alert, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, Stack, Slider, Divider
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DiamondIcon from '@mui/icons-material/Diamond';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

import destinationsData from '../../../mobile/assets/data/ai_destinations.json';

const ALL_CATEGORIES = ['All Categories', 'Hidden Gems', 'Temples', 'Churches', 'Heritage', 'Adventure', 'Park', 'Coastal', 'Nature'];
const PROVINCES = ['All Provinces', 'Central', 'Southern', 'Western', 'Eastern', 'Northern', 'North Central', 'North Western', 'Uva', 'Sabaragamuwa'];

const defaultDestinations = destinationsData.map((d, index) => {
    let nameSinhala = "";
    let nameTamil = "";
    if (d.name === "Sigiriya Rock Fortress") {
        nameSinhala = "සීගිරිය";
        nameTamil = "சிகிரியா";
    } else if (d.name === "Temple of the Sacred Tooth Relic") {
        nameSinhala = "ශ්‍රී දළදා මාළිගාව";
        nameTamil = "தலதா மாளிகை";
    }

    // Map existing categories to the new ones where appropriate, or just assign randomly for mock variety
    let cat = d.category || 'Heritage';
    if (d.name.toLowerCase().includes('temple')) cat = 'Temples';
    else if (d.name.toLowerCase().includes('church') || d.name.toLowerCase().includes('cathedral')) cat = 'Churches';
    else if (d.name.toLowerCase().includes('park') || d.name.toLowerCase().includes('safari')) cat = 'Park';

    return {
        id: d.destination_id || `dest-${index}`,
        name: d.name,
        nameSinhala: nameSinhala,
        nameTamil: nameTamil,
        province: d.province.replace(" Province", ""),
        category: cat,
        ecoScore: Math.round(d.eco_score || 0),
        description: d.description || `${d.name} is a ${cat.toLowerCase()} destination in the ${d.province}.`,
        latitude: parseFloat(d.lat || 6.9271),
        longitude: parseFloat(d.lon || 79.8612),
        imageUrl: d.image || "https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a",
        hasPhoto: Boolean(d.image),
        isHiddenGem: d.hidden_gem === true || d.hidden_gem === "true" || d.hidden_gem === "True"
    };
});

export default function Destinations() {
    const [destinations, setDestinations] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [filterProvince, setFilterProvince] = useState('All Provinces');
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [openDialog, setOpenDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedDest, setSelectedDest] = useState(null);
    const [formData, setFormData] = useState({});

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        setPage(0);
    }, [searchQuery, filterProvince, filterCategory]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "destinations"), (snapshot) => {
            const firebaseDest = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            let merged = [...firebaseDest];
            defaultDestinations.forEach(mock => {
                if (!merged.some(d => d.id === mock.id || d.name === mock.name)) {
                    merged.push(mock);
                }
            });
            setDestinations(merged);
        }, (err) => {
            console.error("Destinations listen error:", err);
            setDestinations([...defaultDestinations]);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenEditor = (dest = null) => {
        if (dest) {
            setIsCreating(false);
            setSelectedDest(dest);
            setFormData(dest);
        } else {
            setIsCreating(true);
            setSelectedDest(null);
            setFormData({
                name: '', nameSinhala: '', nameTamil: '',
                province: 'Central', category: 'Heritage',
                ecoScore: 85, description: '',
                latitude: 6.9271, longitude: 79.8612,
                imageUrl: '', isHiddenGem: false
            });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            setSnackbar({ open: true, message: 'Please provide a destination name.', severity: 'warning' });
            return;
        }

        try {
            if (isCreating) {
                await addDoc(collection(db, "destinations"), formData);
                setSnackbar({ open: true, message: 'Destination created!', severity: 'success' });
            } else {
                if (!selectedDest.id.startsWith('mock-')) {
                    await updateDoc(doc(db, "destinations", selectedDest.id), formData);
                }
                setSnackbar({ open: true, message: 'Destination updated!', severity: 'success' });
            }
            setOpenDialog(false);
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to save: ' + error.message, severity: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this destination?")) return;
        if (!id.startsWith('mock-')) {
            await deleteDoc(doc(db, "destinations", id));
        }
        setSnackbar({ open: true, message: 'Destination deleted.', severity: 'info' });
        setOpenDialog(false);
    };

    // Filters
    const filteredDestinations = destinations.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchProvince = filterProvince === 'All Provinces' || d.province === filterProvince;

        let matchCategory = filterCategory === 'All Categories';
        if (!matchCategory) {
            if (filterCategory === 'Hidden Gems') {
                matchCategory = d.isHiddenGem;
            } else {
                matchCategory = d.category === filterCategory;
            }
        }
        return matchSearch && matchProvince && matchCategory;
    });

    const displayedDestinations = filteredDestinations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const gemCount = destinations.filter(d => d.isHiddenGem).length;
    const photoCount = destinations.filter(d => d.hasPhoto ?? Boolean(d.image || d.imageUrl || (d.images && d.images.length))).length;
    const avgScore = destinations.length > 0 ? Math.round(destinations.reduce((acc, curr) => acc + (curr.ecoScore || 0), 0) / destinations.length) : 82;

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Destinations</Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => handleOpenEditor()}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 600, borderRadius: 2, px: 3, textTransform: 'none' }}
                >
                    Create Destination
                </Button>
            </Box>

            {/* Statistics Banner */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">TOTAL DESTINATIONS</Typography>
                        <Typography variant="h4" fontWeight={600} color="#006A3B">{destinations.length}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{destinations.filter(d => d.latitude || d.lat).length} on the map</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">ECO SCORE</Typography>
                        <Typography variant="h4" fontWeight={600} color="#735C00">{avgScore}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Average eco score (out of 100)</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">PHOTOS</Typography>
                        <Typography variant="h4" fontWeight={600} color="#1976D2">{destinations.length ? Math.round(100 * photoCount / destinations.length) : 0}%</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{photoCount} places have a photo</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none', bgcolor: '#FFF8E1' }}>
                        <Typography variant="caption" fontWeight={600} color="#F57F17">HIDDEN GEMS</Typography>
                        <Typography variant="h4" fontWeight={600} color="#F57F17">{gemCount}</Typography>
                        <Typography variant="caption" color="#F57F17" fontWeight={600}>Rare Finds</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Premium Controls Toolbar */}
            <Paper sx={{ mb: 3, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', bgcolor: '#FFF' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                        <FilterListIcon sx={{ color: '#006A3B' }} />
                        <Typography variant="body2" fontWeight={600} color="#006A3B">FILTERS</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    <TextField
                        select
                        size="small"
                        value={filterProvince}
                        onChange={(e) => setFilterProvince(e.target.value)}
                        sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 1.25, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><LocationOnIcon sx={{ fontSize: 18, color: '#006A3B' }}/></InputAdornment> }}
                    >
                        {PROVINCES.map(prov => <MenuItem key={prov} value={prov} sx={{ fontWeight: 600 }}>{prov}</MenuItem>)}
                    </TextField>
                    <TextField
                        select
                        size="small"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 1.25, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    >
                        {ALL_CATEGORIES.map(cat => (
                            <MenuItem key={cat} value={cat} sx={{ fontWeight: 600, color: cat === 'Hidden Gems' ? '#F57F17' : 'inherit' }}>
                                {cat === 'Hidden Gems' ? '✨ Hidden Gems' : cat}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
                <TextField
                    placeholder="Search destinations..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.25, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                />
            </Paper>

            {/* Data Table */}
            <Paper sx={{ borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#F4F7F6' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: '#3F4941', py: 2 }}>Destination Name</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#3F4941', py: 2 }}>Province & Map</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#3F4941', py: 2 }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#3F4941', py: 2 }}>Eco-Score</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#3F4941', py: 2 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayedDestinations.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, fontWeight: 600, color: '#777' }}>No destinations match your filters.</TableCell></TableRow>
                            ) : displayedDestinations.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ py: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar variant="rounded" src={row.imageUrl} sx={{ width: 56, height: 56, borderRadius: 2 }} />
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600} color="#181D19">{row.name}</Typography>
                                                {row.isHiddenGem && (
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <DiamondIcon sx={{ fontSize: 14, color: '#F57F17' }} />
                                                        <Typography variant="caption" fontWeight={600} color="#F57F17">Hidden Gem</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600} color="#3F4941">{row.province}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <LocationOnIcon sx={{ fontSize: 12 }} /> {row.latitude}, {row.longitude}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={row.category} size="small" sx={{ bgcolor: '#E8F5E9', color: '#006A3B', fontWeight: 600 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid', borderColor: row.ecoScore >= 80 ? '#006A3B' : '#F57F17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" fontWeight={600}>{row.ecoScore}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button variant="outlined" size="small" sx={{ borderRadius: 1, fontWeight: 600, textTransform: 'none' }} onClick={() => handleOpenEditor(row)}>
                                            Review / Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredDestinations.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </Paper>

            {/* Editor Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 1.25, p: 2 } }}>
                <DialogTitle>
                    <Typography variant="h5" fontWeight={600} color="#006A3B">
                        {isCreating ? 'Create Destination' : 'Edit Destination'}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#FAFCFA' }}>
                    <Grid container spacing={3} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" fontWeight={600} color="#006A3B" sx={{ mb: 2 }}>NAMING & LOCALIZATION</Typography>
                            <TextField fullWidth label="English Name" variant="outlined" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mb: 2, bgcolor: '#FFF' }} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField fullWidth label="Sinhala Name (සිංහල)" variant="outlined" value={formData.nameSinhala || ''} onChange={(e) => setFormData({ ...formData, nameSinhala: e.target.value })} sx={{ bgcolor: '#FFF' }} />
                                <TextField fullWidth label="Tamil Name (தமிழ்)" variant="outlined" value={formData.nameTamil || ''} onChange={(e) => setFormData({ ...formData, nameTamil: e.target.value })} sx={{ bgcolor: '#FFF' }} />
                            </Stack>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>CATEGORY & CLASSIFICATION</Typography>
                            <TextField select fullWidth value={formData.category || 'Heritage'} onChange={(e) => setFormData({ ...formData, category: e.target.value })} sx={{ bgcolor: '#FFF', mb: 2 }}>
                                {ALL_CATEGORIES.filter(c => c !== 'All Categories' && c !== 'Hidden Gems').map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </TextField>

                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>PROVINCE</Typography>
                            <TextField select fullWidth value={formData.province || 'Central'} onChange={(e) => setFormData({ ...formData, province: e.target.value })} sx={{ bgcolor: '#FFF', mb: 2 }}>
                                {PROVINCES.filter(p => p !== 'All Provinces').map(prov => (
                                    <MenuItem key={prov} value={prov}>{prov}</MenuItem>
                                ))}
                            </TextField>

                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>MARK AS HIDDEN GEM (RARE FIND)?</Typography>
                            <TextField select fullWidth value={formData.isHiddenGem ? 'Yes' : 'No'} onChange={(e) => setFormData({ ...formData, isHiddenGem: e.target.value === 'Yes' })} sx={{ bgcolor: '#FFF' }}>
                                <MenuItem value="Yes">Yes, flag as Rare/Hidden</MenuItem>
                                <MenuItem value="No">No, standard destination</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>ECO-SCORE TRACKING</Typography>
                            <Box sx={{ px: 2, pb: 2 }}>
                                <Slider
                                    value={formData.ecoScore || 85}
                                    min={0} max={100}
                                    valueLabelDisplay="auto"
                                    onChange={(e, val) => setFormData({ ...formData, ecoScore: val })}
                                    sx={{ color: formData.ecoScore >= 80 ? '#006A3B' : '#F57F17' }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -1 }}>
                                    <Typography variant="caption" color="text.secondary">0 (Poor)</Typography>
                                    <Typography variant="caption" color="text.secondary">100 (Excellent)</Typography>
                                </Box>
                            </Box>

                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>MAP COORDINATES (GPS)</Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <TextField fullWidth label="Latitude" type="number" variant="outlined" size="small" value={formData.latitude || ''} onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })} sx={{ bgcolor: '#FFF' }} />
                                <TextField fullWidth label="Longitude" type="number" variant="outlined" size="small" value={formData.longitude || ''} onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })} sx={{ bgcolor: '#FFF' }} />
                            </Stack>

                            <Typography variant="caption" fontWeight={600} color="#3F4941" sx={{ display: 'block', mb: 1 }}>DESCRIPTION SUMMARY</Typography>
                            <TextField fullWidth multiline rows={3} variant="outlined" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={{ bgcolor: '#FFF' }} />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} color="#006A3B">PHOTO ASSETS & MEDIA</Typography>
                                <Typography variant="caption" color="text.secondary">Optimal ratio 16:9</Typography>
                            </Box>
                            <Paper sx={{ p: 4, borderRadius: 2, border: '2px dashed #BECABE', bgcolor: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: '#006A3B' } }}>
                                <PhotoCameraIcon sx={{ fontSize: 40, color: '#94A3B8', mb: 1 }} />
                                <Typography variant="body2" fontWeight={600} color="#3F4941">Upload Promotional Imagery</Typography>
                                <Typography variant="caption" color="text.secondary">Drag & drop files or click to browse</Typography>
                            </Paper>
                        </Grid>

                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    {!isCreating && (
                        <Button color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(selectedDest?.id)} sx={{ mr: 'auto', fontWeight: 600 }}>
                            Delete
                        </Button>
                    )}
                    <Button onClick={() => setOpenDialog(false)} sx={{ color: '#5C6E64', fontWeight: 600 }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 600, borderRadius: 2 }}>
                        Save Destination
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ fontWeight: 600 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
