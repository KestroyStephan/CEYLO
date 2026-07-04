import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    TextField, Chip, IconButton, Tooltip, Avatar, List, ListItem,
    Divider, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert, Pagination, Drawer, Dialog,
    DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Icons
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import BlockIcon from '@mui/icons-material/Block';
import PetsIcon from '@mui/icons-material/Pets';
import MuseumIcon from '@mui/icons-material/Museum';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HikingIcon from '@mui/icons-material/Hiking';
import ExploreIcon from '@mui/icons-material/Explore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Mock default list matching screenshot
const defaultGuides = [
    {
        id: 'guide-mock-1',
        name: 'Asanka Perera',
        guideLicense: 'SLTDA/G/2023/4521',
        languages: ['English', 'Sinhala', 'German'],
        specializations: 'Wildlife',
        status: 'Verified',
        ecoScore: 85,
        region: 'Central Province',
        email: 'asanka.p@ceylo.com',
        phone: '+94 77 123 4567',
        experience: 5
    },
    {
        id: 'guide-mock-2',
        name: 'Dilani Jayawardena',
        guideLicense: 'SLTDA/G/2024/0912',
        languages: ['English', 'French'],
        specializations: 'Cultural',
        status: 'Pending',
        ecoScore: 60,
        region: 'Southern Province',
        email: 'dilani.j@ceylo.com',
        phone: '+94 71 987 6543',
        experience: 2
    },
    {
        id: 'guide-mock-3',
        name: 'Mahinda Gunathilaka',
        guideLicense: 'SLTDA/G/2018/1204',
        languages: ['English', 'Japanese', 'Sinhala'],
        specializations: 'Heritage',
        status: 'Verified',
        ecoScore: 95,
        region: 'North Central Province',
        email: 'mahinda.g@ceylo.com',
        phone: '+94 72 345 6789',
        experience: 8
    },
    {
        id: 'guide-mock-4',
        name: 'Ruwan Silva',
        guideLicense: 'SLTDA/G/2024/0115',
        languages: ['English'],
        specializations: 'Adventure',
        status: 'Under Review',
        ecoScore: 45,
        region: 'Uva Province',
        email: 'ruwan.s@ceylo.com',
        phone: '+94 76 567 8901',
        experience: 3
    }
];

export default function Guides() {
    const [guides, setGuides] = useState([]);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [filterExpertise, setFilterExpertise] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRegion, setFilterRegion] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    
    // Dialog State
    const [openOnboardDialog, setOpenOnboardDialog] = useState(false);
    const [newGuideData, setNewGuideData] = useState({
        name: '',
        guideLicense: '',
        languages: 'English, Sinhala',
        specializations: 'Wildlife',
        region: 'Central Province',
        ecoScore: 75,
        email: '',
        phone: '',
        experience: 2
    });

    useEffect(() => {
        // Listen to active guide users in Firestore
        const q = query(collection(db, 'users'), where('role', 'in', ['guide', 'guide_pending', 'guide_rejected']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseGuides = snapshot.docs.map(doc => {
                const data = doc.data();
                // Parse languages
                let languagesParsed = ['English'];
                if (data.languages) {
                    if (Array.isArray(data.languages)) {
                        languagesParsed = data.languages;
                    } else if (typeof data.languages === 'string') {
                        languagesParsed = data.languages.split(',').map(s => s.trim());
                    }
                }
                
                // Map status based on role
                let mappedStatus = 'Pending';
                if (data.role === 'guide') mappedStatus = 'Verified';
                if (data.role === 'guide_rejected') mappedStatus = 'Rejected';
                if (data.status === 'under_review') mappedStatus = 'Under Review';

                return {
                    id: doc.id,
                    name: data.name || 'Guide Partner',
                    guideLicense: data.guideLicense || 'SLTDA/G/TEMP',
                    languages: languagesParsed,
                    specializations: data.specializations || 'Eco-Tour',
                    status: mappedStatus,
                    ecoScore: Math.round(data.ecoScore || 70),
                    region: data.region || 'Central Province',
                    email: data.email || '',
                    phone: data.phone || '',
                    experience: parseInt(data.experience || 3)
                };
            });

            // Merge with mock defaults if not present
            let merged = [...firebaseGuides];
            defaultGuides.forEach(mock => {
                if (!merged.some(g => g.id === mock.id || g.name === mock.name)) {
                    merged.push(mock);
                }
            });

            setGuides(merged);
        }, (err) => {
            console.error("Guides listen error:", err);
            // Fallback to mocks
            let merged = [];
            defaultGuides.forEach(mock => merged.push(mock));
            setGuides(merged);
        });

        return () => {
            setTimeout(() => {
                if (typeof unsubscribe === 'function') unsubscribe();
            }, 0);
        };
    }, []);

    // Reset pagination page on filter
    useEffect(() => {
        setPage(1);
    }, [searchQuery, filterExpertise, filterStatus, filterRegion]);

    const handleSelectGuide = (guide) => {
        setSelectedGuide(guide);
    };

    const handleDecision = async (id, approve) => {
        try {
            const role = approve ? 'guide' : 'guide_rejected';
            await updateDoc(doc(db, 'users', id), { 
                role: role,
                status: approve ? 'approved' : 'rejected'
            });
            setSnackbar({
                open: true,
                message: `Guide applications successfully ${approve ? 'approved' : 'rejected'}!`,
                severity: 'success'
            });
            setSelectedGuide(null);
        } catch (e) {
            console.error("Error updating guide status:", e);
            setSnackbar({
                open: true,
                message: 'Failed to update guide: ' + e.message,
                severity: 'error'
            });
        }
    };

    const handleOnboardSubmit = async () => {
        if (!newGuideData.name || !newGuideData.guideLicense) {
            setSnackbar({ open: true, message: 'Please provide guide name and license.', severity: 'warning' });
            return;
        }

        try {
            // Write user registration to db
            const langsArray = newGuideData.languages.split(',').map(s => s.trim());
            await addDoc(collection(db, "users"), {
                name: newGuideData.name,
                guideLicense: newGuideData.guideLicense,
                languages: langsArray,
                specializations: newGuideData.specializations,
                region: newGuideData.region,
                ecoScore: parseInt(newGuideData.ecoScore),
                email: newGuideData.email,
                phone: newGuideData.phone,
                experience: parseInt(newGuideData.experience),
                role: 'guide',
                status: 'approved',
                createdAt: new Date()
            });

            setSnackbar({ open: true, message: 'Guide successfully onboarded!', severity: 'success' });
            setOpenOnboardDialog(false);
            setNewGuideData({
                name: '',
                guideLicense: '',
                languages: 'English, Sinhala',
                specializations: 'Wildlife',
                region: 'Central Province',
                ecoScore: 75,
                email: '',
                phone: '',
                experience: 2
            });
        } catch (e) {
            console.error("Error onboarding guide:", e);
            setSnackbar({ open: true, message: 'Onboarding failed: ' + e.message, severity: 'error' });
        }
    };

    // Filter math
    const filteredGuides = guides
        .filter(g => filterExpertise === 'All' || g.specializations.toLowerCase() === filterExpertise.toLowerCase())
        .filter(g => filterStatus === 'All' || g.status.toLowerCase() === filterStatus.toLowerCase())
        .filter(g => filterRegion === 'All' || g.region.toLowerCase() === filterRegion.toLowerCase())
        .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.guideLicense.toLowerCase().includes(searchQuery.toLowerCase()));

    const rowsPerPage = 6;
    const startIndex = (page - 1) * rowsPerPage;
    const paginatedGuides = filteredGuides.slice(startIndex, startIndex + rowsPerPage);

    const pendingReviewCount = guides.filter(g => g.status === 'Pending').length;
    const activeGuidesCount = guides.filter(g => g.status === 'Verified').length;

    // Get specialization icon
    const getExpertiseIcon = (specialization) => {
        const spec = specialization.toLowerCase();
        if (spec.includes('wildlife')) return <PetsIcon fontSize="small" sx={{ color: '#00695c' }} />;
        if (spec.includes('cultural')) return <MuseumIcon fontSize="small" sx={{ color: '#5b6000' }} />;
        if (spec.includes('heritage')) return <AccountBalanceIcon fontSize="small" sx={{ color: '#004d40' }} />;
        if (spec.includes('adventure')) return <HikingIcon fontSize="small" sx={{ color: '#d84315' }} />;
        return <ExploreIcon fontSize="small" sx={{ color: '#0288d1' }} />;
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={900} color="#006A3B">
                        Ceylon Tourism
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="#777">
                        Management / Guide Management
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField 
                        placeholder="Search guides, licenses, or regions..." 
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ bgcolor: '#FFF', width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                </Box>
            </Box>

            {/* Title description segment */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#181D19" sx={{ mb: 0.5 }}>
                        Guide Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Supervise, verify, and monitor tour operators across the island.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={3} alignItems="center">
                    {/* Active guides card */}
                    <Paper sx={{ p: 1.5, px: 2.5, borderRadius: 3, border: '1px solid #EBEFE8', bgcolor: '#F1F8F6', display: 'flex', alignItems: 'center', gap: 2, boxShadow: 'none' }}>
                        <Avatar sx={{ bgcolor: '#006A3B', color: '#FFF', width: 32, height: 32 }}><CheckCircleIcon fontSize="small" /></Avatar>
                        <Box>
                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, fontWeight: 700 }} color="text.secondary">Total Active Guides</Typography>
                            <Typography variant="h6" fontWeight={950} color="#006A3B">{activeGuidesCount.toLocaleString()}</Typography>
                        </Box>
                    </Paper>

                    {/* Onboard Guide CTA */}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenOnboardDialog(true)}
                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 3, py: 1.5, px: 2.5, textTransform: 'none' }}
                    >
                        Onboard New Guide
                    </Button>
                </Stack>
            </Box>

            {/* Split layout: cards section & filters */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                
                {/* Left Alert Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper 
                        sx={{ 
                            p: 2.5, 
                            borderRadius: 4, 
                            border: '1px solid #FFCDD2', 
                            bgcolor: '#FFF5F5',
                            position: 'relative',
                            boxShadow: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%'
                        }}
                    >
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Chip label="HIGH PRIORITY" size="small" sx={{ fontWeight: 900, fontSize: '0.65rem', bgcolor: '#BA1A1A', color: '#FFF' }} />
                                <ErrorOutlineIcon sx={{ color: '#BA1A1A' }} />
                            </Box>
                            <Typography variant="subtitle2" fontWeight={850} color="#BA1A1A" gutterBottom>
                                New Applications
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                                {pendingReviewCount} guides are awaiting document verification.
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => setFilterStatus('Pending')}
                            sx={{ bgcolor: '#BA1A1A', '&:hover': { bgcolor: '#8C1111' }, fontWeight: 800, borderRadius: 2, textTransform: 'none', py: 1 }}
                        >
                            Review Pending
                        </Button>
                    </Paper>
                </Grid>

                {/* Right Filters Panel */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Grid container spacing={2} alignItems="center">
                            
                            <Grid size={{ xs: 4 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel id="expertise-label">EXPERTISE</InputLabel>
                                    <Select
                                        labelId="expertise-label"
                                        value={filterExpertise}
                                        label="EXPERTISE"
                                        onChange={(e) => setFilterExpertise(e.target.value)}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="All">All Specializations</MenuItem>
                                        <MenuItem value="Wildlife">Wildlife</MenuItem>
                                        <MenuItem value="Cultural">Cultural</MenuItem>
                                        <MenuItem value="Heritage">Heritage</MenuItem>
                                        <MenuItem value="Adventure">Adventure</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 4 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel id="status-label">STATUS</InputLabel>
                                    <Select
                                        labelId="status-label"
                                        value={filterStatus}
                                        label="STATUS"
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="All">All Statuses</MenuItem>
                                        <MenuItem value="Verified">Verified</MenuItem>
                                        <MenuItem value="Pending">Pending</MenuItem>
                                        <MenuItem value="Under Review">Under Review</MenuItem>
                                        <MenuItem value="Rejected">Rejected</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 4 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel id="region-label">REGION</InputLabel>
                                    <Select
                                        labelId="region-label"
                                        value={filterRegion}
                                        label="REGION"
                                        onChange={(e) => setFilterRegion(e.target.value)}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="All">All Regions</MenuItem>
                                        <MenuItem value="Central Province">Central</MenuItem>
                                        <MenuItem value="Southern Province">Southern</MenuItem>
                                        <MenuItem value="North Central Province">North Central</MenuItem>
                                        <MenuItem value="Western Province">Western</MenuItem>
                                        <MenuItem value="Uva Province">Uva</MenuItem>
                                        <MenuItem value="Northern Province">Northern</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                        </Grid>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<FileDownloadIcon />}
                                sx={{ borderColor: '#BECABE', color: '#181D19', fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                            >
                                Export Registry
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

            </Grid>

            {/* Split layout workspace */}
            <Grid container spacing={3}>
                
                {/* Guides Table list */}
                <Grid size={{ xs: 12, md: selectedGuide ? 7 : 12 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>NAME & LICENSE</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>LANGUAGES</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>EXPERTISE</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>VERIFICATION</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ECO-SCORE</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedGuides.map((g) => {
                                        const isSelected = selectedGuide?.id === g.id;
                                        return (
                                            <TableRow 
                                                key={g.id} 
                                                hover 
                                                onClick={() => handleSelectGuide(g)}
                                                sx={{ 
                                                    cursor: 'pointer', 
                                                    bgcolor: isSelected ? '#EBEFE8' : 'inherit'
                                                }}
                                            >
                                                {/* Profile Name & License ID */}
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ position: 'relative' }}>
                                                            <Avatar sx={{ bgcolor: '#e0f2f1', color: '#004d40', fontWeight: 800 }}>
                                                                {g.name.split(' ').map(n => n[0]).join('')}
                                                            </Avatar>
                                                            {g.status === 'Verified' && (
                                                                <Box sx={{ 
                                                                    position: 'absolute', bottom: 0, right: 0, 
                                                                    width: 12, height: 12, bgcolor: '#2e7d32', 
                                                                    borderRadius: '50%', border: '2px solid #FFF' 
                                                                }} />
                                                            )}
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={800}>{g.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                                {g.guideLicense}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>

                                                {/* Spoken Languages */}
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                                        {g.languages.map((lng, idx) => (
                                                            <Chip 
                                                                key={idx} 
                                                                label={lng} 
                                                                size="small" 
                                                                sx={{ 
                                                                    height: 18, fontSize: '0.65rem', fontWeight: 800,
                                                                    bgcolor: lng === 'Sinhala' ? '#E1F5FE' : lng === 'Tamil' ? '#FFF3E0' : '#E8F5E9',
                                                                    color: lng === 'Sinhala' ? '#0288D1' : lng === 'Tamil' ? '#E65100' : '#2E7D32'
                                                                }} 
                                                            />
                                                        ))}
                                                    </Stack>
                                                </TableCell>

                                                {/* Specialization Badge */}
                                                <TableCell>
                                                    <Chip 
                                                        label={g.specializations} 
                                                        icon={getExpertiseIcon(g.specializations)}
                                                        size="small" 
                                                        sx={{ 
                                                            fontWeight: 700, 
                                                            bgcolor: '#F5F5F5', 
                                                            color: '#333',
                                                            border: '1px solid #EBEFE8'
                                                        }} 
                                                    />
                                                </TableCell>

                                                {/* Verification status chip */}
                                                <TableCell>
                                                    <Chip 
                                                        label={g.status} 
                                                        size="small" 
                                                        sx={{ 
                                                            fontWeight: 800, fontSize: '0.65rem',
                                                            bgcolor: g.status === 'Verified' ? '#E8F5E9' : g.status === 'Pending' ? '#FFF3E0' : '#E0F7FA',
                                                            color: g.status === 'Verified' ? '#2E7D32' : g.status === 'Pending' ? '#E65100' : '#00838F'
                                                        }} 
                                                    />
                                                </TableCell>

                                                {/* Eco Passport Score */}
                                                <TableCell>
                                                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                        <CircularProgress 
                                                            variant="determinate" 
                                                            value={g.ecoScore} 
                                                            size={32} 
                                                            thickness={5} 
                                                            sx={{ color: g.ecoScore > 80 ? '#2E7D32' : g.ecoScore > 60 ? '#F57C00' : '#D32F2F' }} 
                                                        />
                                                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Typography variant="caption" fontSize="0.65rem" fontWeight={900}>{g.ecoScore}</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>

                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Pagination footer */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredGuides.length)} of {filteredGuides.length} guides
                            </Typography>
                            <Pagination 
                                count={Math.ceil(filteredGuides.length / rowsPerPage)} 
                                page={page} 
                                onChange={(e, p) => setPage(p)} 
                                size="small" 
                                color="primary" 
                            />
                        </Box>

                    </Paper>
                </Grid>

                {/* Right panel: Detail Drawer sheet */}
                {selectedGuide && (
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', position: 'relative' }}>
                            <IconButton 
                                onClick={() => setSelectedGuide(null)} 
                                sx={{ position: 'absolute', top: 16, right: 16 }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>

                            <Box sx={{ textAlign: 'center', mb: 3, mt: 1 }}>
                                <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: '#e0f2f1', color: '#004d40', fontSize: '1.5rem', fontWeight: 800 }}>
                                    {selectedGuide.name.split(' ').map(n => n[0]).join('')}
                                </Avatar>
                                <Typography variant="h6" fontWeight={900}>{selectedGuide.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {selectedGuide.region} • {selectedGuide.experience} Years Experience
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            <Stack spacing={2.5}>
                                {/* License detail */}
                                <Box>
                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        LICENSE IDENTIFICATION
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                            {selectedGuide.guideLicense}
                                        </Typography>
                                        {selectedGuide.status === 'Verified' && <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />}
                                    </Box>
                                </Box>

                                {/* Contact detail */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                            EMAIL
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {selectedGuide.email || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                            PHONE
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {selectedGuide.phone || 'N/A'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {/* Expertise description details */}
                                <Box>
                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        EXPERTISE SPECIALIZATION
                                    </Typography>
                                    <Chip 
                                        label={selectedGuide.specializations} 
                                        icon={getExpertiseIcon(selectedGuide.specializations)}
                                        size="small" 
                                        sx={{ fontWeight: 800 }} 
                                    />
                                </Box>

                                {/* Eco passport detail */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F1F8F6', p: 2, borderRadius: 3, border: '1px solid #EBEFE8' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={900} color="#006A3B">Eco Score Authority</Typography>
                                        <Typography variant="caption" color="text.secondary">Adherence to sustainable tourism guidelines</Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={950} color="#006A3B">{selectedGuide.ecoScore}%</Typography>
                                </Box>

                                {/* Decision actions panel */}
                                <Box sx={{ pt: 2 }}>
                                    {selectedGuide.status === 'Pending' ? (
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 6 }}>
                                                <Button 
                                                    fullWidth 
                                                    variant="contained" 
                                                    color="success" 
                                                    onClick={() => handleDecision(selectedGuide.id, true)}
                                                    sx={{ borderRadius: 2, py: 1.2, fontWeight: 800, textTransform: 'none' }}
                                                >
                                                    Approve Partner
                                                </Button>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Button 
                                                    fullWidth 
                                                    variant="outlined" 
                                                    color="error" 
                                                    onClick={() => handleDecision(selectedGuide.id, false)}
                                                    sx={{ borderRadius: 2, py: 1.2, fontWeight: 800, textTransform: 'none' }}
                                                >
                                                    Reject
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <Chip 
                                                label={selectedGuide.status === 'Verified' ? 'Verification Complete — Active Guide' : 'Application Rejected'} 
                                                color={selectedGuide.status === 'Verified' ? 'success' : 'error'}
                                                variant="outlined" 
                                                sx={{ fontWeight: 850, py: 2, px: 1, borderRadius: 2 }} 
                                            />
                                        </Box>
                                    )}
                                </Box>

                            </Stack>
                        </Paper>
                    </Grid>
                )}

            </Grid>

            {/* Onboard New Guide Modal Dialog */}
            <Dialog open={openOnboardDialog} onClose={() => setOpenOnboardDialog(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Onboard New Guide</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 400 }}>
                        <TextField 
                            label="ENGLISH FULL NAME" 
                            fullWidth
                            value={newGuideData.name}
                            onChange={(e) => setNewGuideData({ ...newGuideData, name: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <TextField 
                            label="SLTDA LICENSE NUMBER" 
                            fullWidth
                            value={newGuideData.guideLicense}
                            onChange={(e) => setNewGuideData({ ...newGuideData, guideLicense: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <TextField 
                            label="SPOKEN LANGUAGES (comma separated)" 
                            fullWidth
                            value={newGuideData.languages}
                            onChange={(e) => setNewGuideData({ ...newGuideData, languages: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="dialog-expertise-label">EXPERTISE</InputLabel>
                                    <Select
                                        labelId="dialog-expertise-label"
                                        value={newGuideData.specializations}
                                        label="EXPERTISE"
                                        onChange={(e) => setNewGuideData({ ...newGuideData, specializations: e.target.value })}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="Wildlife">Wildlife</MenuItem>
                                        <MenuItem value="Cultural">Cultural</MenuItem>
                                        <MenuItem value="Heritage">Heritage</MenuItem>
                                        <MenuItem value="Adventure">Adventure</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="dialog-region-label">REGION</InputLabel>
                                    <Select
                                        labelId="dialog-region-label"
                                        value={newGuideData.region}
                                        label="REGION"
                                        onChange={(e) => setNewGuideData({ ...newGuideData, region: e.target.value })}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        <MenuItem value="Central Province">Central Province</MenuItem>
                                        <MenuItem value="Southern Province">Southern Province</MenuItem>
                                        <MenuItem value="North Central Province">North Central Province</MenuItem>
                                        <MenuItem value="Western Province">Western Province</MenuItem>
                                        <MenuItem value="Uva Province">Uva Province</MenuItem>
                                        <MenuItem value="Northern Province">Northern Province</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <TextField 
                                    label="BASE ECO-SCORE (0-100)" 
                                    type="number"
                                    fullWidth
                                    value={newGuideData.ecoScore}
                                    onChange={(e) => setNewGuideData({ ...newGuideData, ecoScore: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField 
                                    label="EXPERIENCE (YEARS)" 
                                    type="number"
                                    fullWidth
                                    value={newGuideData.experience}
                                    onChange={(e) => setNewGuideData({ ...newGuideData, experience: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                            </Grid>
                        </Grid>
                        <TextField 
                            label="EMAIL ADDRESS" 
                            type="email"
                            fullWidth
                            value={newGuideData.email}
                            onChange={(e) => setNewGuideData({ ...newGuideData, email: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <TextField 
                            label="PHONE NUMBER" 
                            fullWidth
                            value={newGuideData.phone}
                            onChange={(e) => setNewGuideData({ ...newGuideData, phone: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenOnboardDialog(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
                    <Button onClick={handleOnboardSubmit} variant="contained" sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2 }}>Onboard Guide</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Toast Alert */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
}
