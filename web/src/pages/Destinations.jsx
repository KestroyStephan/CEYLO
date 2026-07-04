import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    TextField, Chip, IconButton, Tooltip, Avatar, List, ListItem,
    Divider, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert, Pagination
} from '@mui/material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import PrintIcon from '@mui/icons-material/Print';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublicIcon from '@mui/icons-material/Public';
import CloseIcon from '@mui/icons-material/Close';

import destinationsData from '../../../mobile/assets/data/ai_destinations.json';

// Dynamic load matching trained AI destinations dataset
const defaultDestinations = destinationsData.map((d, index) => {
    let nameSinhala = "";
    let nameTamil = "";
    if (d.name === "Sigiriya Rock Fortress") {
        nameSinhala = "සීගිරිය";
        nameTamil = "சிகிரியா";
    } else if (d.name === "Temple of the Sacred Tooth Relic") {
        nameSinhala = "ශ්‍රී දළදා මාළිගාව";
        nameTamil = "தலதா மாளிகை";
    } else if (d.name === "Nine Arches Bridge") {
        nameSinhala = "ආරුක්කු නවය";
        nameTamil = "ஒன்பது வளைவு பாலம்";
    } else if (d.name === "Mirissa Beach") {
        nameSinhala = "මිරිස්ස වෙරළ";
        nameTamil = "මිරිසා கடற்கரை";
    } else if (d.name === "Yala National Park") {
        nameSinhala = "යාල ජාතික වනෝද්‍යානය";
        nameTamil = "யாலா தேசிய பூங்கா";
    }

    return {
        id: d.destination_id || `dest-${index}`,
        name: d.name,
        nameSinhala: nameSinhala,
        nameTamil: nameTamil,
        province: d.province.replace(" Province", ""),
        category: d.category,
        ecoScore: Math.round(d.eco_score || 70),
        description: `${d.name} is a renowned ${d.category.toLowerCase()} destination located in the ${d.province}. It has a seasonal availability of ${d.seasonal_availability} and a popularity rank of #${d.popularity_rank}.`,
        latitude: parseFloat(d.lat || 6.9271),
        longitude: parseFloat(d.lon || 79.8612),
        imageUrl: d.image || "https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a",
        isHiddenGem: d.hidden_gem === true || d.hidden_gem === "true",
        photoAssets: d.image ? [d.image] : []
    };
});

export default function Destinations() {
    const [destinations, setDestinations] = useState([]);
    const [selectedDest, setSelectedDest] = useState(null);
    const [filterProvince, setFilterProvince] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        setPage(1);
    }, [searchQuery, filterProvince, filterCategory]);

    const [formData, setFormData] = useState({
        name: '',
        nameSinhala: '',
        nameTamil: '',
        province: 'North Central',
        category: 'Heritage',
        ecoScore: 80,
        description: '',
        latitude: 6.9271,
        longitude: 79.8612,
        imageUrl: '',
        isHiddenGem: false,
        photoAssets: []
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "destinations"), (snapshot) => {
            const firebaseDest = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Merge with mock defaults
            let merged = [...firebaseDest];
            defaultDestinations.forEach(mock => {
                if (!merged.some(d => d.id === mock.id || d.name === mock.name)) {
                    merged.push(mock);
                }
            });

            setDestinations(merged);
        }, (err) => {
            console.error("Destinations listen error:", err);
            let merged = [];
            defaultDestinations.forEach(mock => merged.push(mock));
            setDestinations(merged);
        });
        return () => unsubscribe();
    }, []);

    // Load first item on start
    useEffect(() => {
        if (destinations.length > 0 && !selectedDest) {
            setSelectedDest(destinations[0]);
            setFormData(destinations[0]);
        }
    }, [destinations, selectedDest]);

    const handleSelectDest = (dest) => {
        setSelectedDest(dest);
        setFormData({
            name: dest.name || '',
            nameSinhala: dest.nameSinhala || '',
            nameTamil: dest.nameTamil || '',
            province: dest.province || 'North Central',
            category: dest.category || 'Heritage',
            ecoScore: dest.ecoScore || 80,
            description: dest.description || '',
            latitude: dest.latitude || 6.9271,
            longitude: dest.longitude || 79.8612,
            imageUrl: dest.imageUrl || '',
            isHiddenGem: dest.isHiddenGem || false,
            photoAssets: dest.photoAssets || []
        });
    };

    const handlePublish = async () => {
        if (!formData.name) {
            setSnackbar({ open: true, message: 'Please provide a destination name.', severity: 'warning' });
            return;
        }

        try {
            if (selectedDest && !selectedDest.id.startsWith('mock-')) {
                await updateDoc(doc(db, "destinations", selectedDest.id), formData);
                setSnackbar({ open: true, message: 'Destination updates published successfully!', severity: 'success' });
            } else {
                // If it is a mock, or we want to save a new one
                const newDoc = await addDoc(collection(db, "destinations"), formData);
                setSnackbar({ open: true, message: 'New destination successfully added!', severity: 'success' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to publish updates: ' + error.message, severity: 'error' });
        }
    };

    const handleNew = () => {
        setSelectedDest(null);
        setFormData({
            name: 'New Destination',
            nameSinhala: '',
            nameTamil: '',
            province: 'North Central',
            category: 'Heritage',
            ecoScore: 80,
            description: '',
            latitude: 6.9271,
            longitude: 79.8612,
            imageUrl: '',
            isHiddenGem: false,
            photoAssets: []
        });
    };

    // Filters & Search
    const filteredDestinations = destinations
        .filter(d => filterProvince === 'All' || d.province === filterProvince)
        .filter(d => filterCategory === 'All' || d.category === filterCategory)
        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const rowsPerPage = 10;
    const startIndex = (page - 1) * rowsPerPage;
    const paginatedDestinations = filteredDestinations.slice(startIndex, startIndex + rowsPerPage);

    const gemCount = destinations.filter(d => d.isHiddenGem).length;
    const avgScore = destinations.length > 0 
        ? Math.round(destinations.reduce((acc, curr) => acc + (curr.ecoScore || 0), 0) / destinations.length)
        : 82;

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header section matching screenshot */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={900} color="#006A3B">
                        Ceylo Admin Portal
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#006A3B', borderBottom: '2.5px solid #006A3B', pb: 0.5 }}>
                            Global Feed
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#777' }}>
                            Alerts
                        </Typography>
                    </Stack>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField 
                        placeholder="Search destinations..." 
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ bgcolor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Button 
                        variant="contained" 
                        onClick={handleNew}
                        startIcon={<AddIcon />}
                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                    >
                        Create New
                    </Button>
                </Box>
            </Box>

            {/* Statistics Banner cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            TOTAL DESTINATIONS
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#006A3B">
                            {destinations.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={750}>
                            +4 this week
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            ECO-SCORE MASTERY
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#735C00">
                            A+
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={750}>
                            Avg {avgScore}%
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            MEDIA GALLERY
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#006A6A">
                            92%
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={750}>
                            1,402 assets
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            HIDDEN GEMS
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#BA1A1A">
                            {gemCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={750}>
                            Rare Finds
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Split layout workspace */}
            <Grid container spacing={3}>
                
                {/* Left panel: Filters and list */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        
                        {/* Filters list row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <FormControl size="small" sx={{ width: 150 }}>
                                    <Select
                                        value={filterProvince}
                                        onChange={(e) => setFilterProvince(e.target.value)}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="All">All Provinces</MenuItem>
                                        <MenuItem value="North Central">North Central</MenuItem>
                                        <MenuItem value="Central">Central</MenuItem>
                                        <MenuItem value="Southern">Southern</MenuItem>
                                        <MenuItem value="Western">Western</MenuItem>
                                        <MenuItem value="Uva">Uva</MenuItem>
                                        <MenuItem value="Northern">Northern</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" sx={{ width: 150 }}>
                                    <Select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="All">All Categories</MenuItem>
                                        <MenuItem value="Heritage">Heritage</MenuItem>
                                        <MenuItem value="Mountain">Mountain</MenuItem>
                                        <MenuItem value="Beach">Beach</MenuItem>
                                        <MenuItem value="Wildlife">Wildlife</MenuItem>
                                        <MenuItem value="Temple">Temple</MenuItem>
                                        <MenuItem value="Waterfall">Waterfall</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                <IconButton sx={{ border: '1px solid #BECABE', borderRadius: 2 }}><GetAppIcon fontSize="small" /></IconButton>
                                <IconButton sx={{ border: '1px solid #BECABE', borderRadius: 2 }}><PrintIcon fontSize="small" /></IconButton>
                            </Stack>
                        </Box>

                        {/* Destinations list table */}
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>DESTINATION NAME</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>PROVINCE</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>CATEGORY</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ECO-SCORE</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ACTIONS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedDestinations.map((d) => {
                                        const isSelected = selectedDest?.id === d.id;
                                        return (
                                            <TableRow 
                                                key={d.id} 
                                                hover 
                                                onClick={() => handleSelectDest(d)}
                                                sx={{ 
                                                    cursor: 'pointer', 
                                                    bgcolor: isSelected ? '#EBEFE8' : 'inherit'
                                                }}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar variant="rounded" src={d.imageUrl} sx={{ width: 40, height: 40 }} />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={800}>{d.name}</Typography>
                                                            {d.isHiddenGem && (
                                                                <Typography variant="caption" sx={{ color: '#BA1A1A', fontWeight: 800 }}>
                                                                    💎 Hidden Gem
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{d.province}</TableCell>
                                                <TableCell>
                                                    <Chip label={d.category} size="small" sx={{ fontWeight: 700, bgcolor: '#E0F2F1', color: '#00695c' }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                        <CircularProgress variant="determinate" value={d.ecoScore || 0} size={32} thickness={5} sx={{ color: '#006A3B' }} />
                                                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Typography variant="caption" fontSize="0.65rem" fontWeight={900}>{d.ecoScore}</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {!d.id.startsWith('mock-') && (
                                                        <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, "destinations", d.id)); }}>
                                                            <DeleteIcon fontSize="inherit" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Footer pagination */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredDestinations.length)} of {filteredDestinations.length} destinations
                            </Typography>
                            <Pagination 
                                count={Math.ceil(filteredDestinations.length / rowsPerPage)} 
                                page={page} 
                                onChange={(e, p) => setPage(p)} 
                                size="small" 
                                color="primary" 
                            />
                        </Box>

                    </Paper>
                </Grid>

                {/* Right panel: Edit Destination Drawer */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', position: 'relative' }}>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={900}>
                                    Edit Destination
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Enter details carefully for publishing
                                </Typography>
                            </Box>
                            <IconButton onClick={() => setSelectedDest(null)}><CloseIcon fontSize="small" /></IconButton>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Stack spacing={3}>
                            
                            {/* Naming & Localization */}
                            <Box>
                                <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 2 }}>
                                    Naming & Localization
                                </Typography>
                                <Stack spacing={2}>
                                    <TextField 
                                        label="ENGLISH NAME" 
                                        fullWidth 
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                    />
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField 
                                                label="SINHALA NAME" 
                                                fullWidth 
                                                value={formData.nameSinhala}
                                                onChange={(e) => setFormData({ ...formData, nameSinhala: e.target.value })}
                                                sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <TextField 
                                                label="TAMIL NAME" 
                                                fullWidth 
                                                value={formData.nameTamil}
                                                onChange={(e) => setFormData({ ...formData, nameTamil: e.target.value })}
                                                sx={{ bgcolor: '#F8F9FA', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Box>

                            {/* Photo Assets */}
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Typography variant="caption" fontWeight={900} color="#3F4941">
                                        Photo Assets
                                    </Typography>
                                    <Typography variant="caption" fontWeight={850} color="text.secondary">
                                        {formData.photoAssets?.length || 0} / 10 used
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
                                    {formData.photoAssets?.map((url, idx) => (
                                        <Avatar 
                                            key={idx} 
                                            variant="rounded" 
                                            src={url} 
                                            sx={{ width: 80, height: 80, borderRadius: 2 }}
                                        />
                                    ))}
                                    <Paper 
                                        sx={{ 
                                            width: 80, 
                                            height: 80, 
                                            borderRadius: 2, 
                                            border: '2px dashed #BECABE', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: 'none'
                                        }}
                                    >
                                        <PhotoCameraIcon fontSize="small" sx={{ color: '#777' }} />
                                        <Typography variant="caption" fontSize="0.55rem" fontWeight={800}>Add</Typography>
                                    </Paper>
                                </Stack>
                            </Box>

                            {/* Geographic Placement */}
                            <Box>
                                <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 1.5 }}>
                                    Geographic Placement
                                </Typography>
                                <Box sx={{ position: 'relative', width: '100%', height: 160, borderRadius: 3, overflow: 'hidden', border: '1px solid #BECABE' }}>
                                    <iframe 
                                        title="Destination Location Map"
                                        src={`https://maps.google.com/maps?q=${formData.latitude || 7.9570},${formData.longitude || 80.7603}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 10, left: 10, bgcolor: 'rgba(255,255,255,0.9)', border: '1px solid #BECABE', px: 1, py: 0.5, borderRadius: 1.5 }}>
                                        <Typography variant="caption" fontWeight={900} color="#181D19">
                                            📍 {formData.latitude?.toFixed(4)}° N, {formData.longitude?.toFixed(4)}° E
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Eco-Score Authority */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F6FBF3', p: 2, borderRadius: 3, border: '1px solid #BECABE' }}>
                                <Typography variant="subtitle2" fontWeight={900} color="#181D19">
                                    Eco-Score Authority
                                </Typography>
                                <Typography variant="h5" fontWeight={950} color="#006A3B">
                                    {formData.ecoScore}
                                </Typography>
                            </Box>

                            {/* Actions */}
                            <Stack direction="row" spacing={2}>
                                <Button 
                                    fullWidth 
                                    variant="outlined"
                                    onClick={() => setSelectedDest(null)}
                                    sx={{ 
                                        color: '#006A3B', 
                                        borderColor: '#006A3B', 
                                        py: 1.5, 
                                        borderRadius: 2.5, 
                                        fontWeight: 800, 
                                        textTransform: 'none' 
                                    }}
                                >
                                    Cancel Changes
                                </Button>
                                <Button 
                                    fullWidth 
                                    variant="contained"
                                    onClick={handlePublish}
                                    startIcon={<PublicIcon />}
                                    sx={{ 
                                        bgcolor: '#006A3B', 
                                        '&:hover': { bgcolor: '#004D2C' },
                                        py: 1.5, 
                                        borderRadius: 2.5, 
                                        fontWeight: 800, 
                                        textTransform: 'none' 
                                    }}
                                >
                                    Publish Updates
                                </Button>
                            </Stack>

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
