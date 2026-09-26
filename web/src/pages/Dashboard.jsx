import React, { useEffect, useState } from 'react';
import { 
    Grid, Paper, Typography, Box, Chip, Button, 
    Divider, Stack, Avatar, List, ListItem, ListItemIcon, ListItemText, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { collection, onSnapshot, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PeopleIcon from '@mui/icons-material/People';
import CurrencyLkrIcon from '@mui/icons-material/MonetizationOn';
import WarningIcon from '@mui/icons-material/Warning';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/KPICard';

export default function Dashboard() {
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    const [revenueToday, setRevenueToday] = useState(0);
    const [activeSosCount, setActiveSosCount] = useState(0);
    const [pendingVendors, setPendingVendors] = useState([]);
    const [liveActivities, setLiveActivities] = useState([]);
    const navigate = useNavigate();

    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        const sosQuery = query(collection(db, "sos_alerts"), where("status", "in", ["active", "investigating"]));
        const unsubSos = onSnapshot(sosQuery, (snap) => setActiveSosCount(snap.size), () => setActiveSosCount(0));

        const vendorQuery = query(collection(db, "vendors"), where("verificationStatus", "==", "pending"));
        const unsubVendors = onSnapshot(vendorQuery, (snap) => {
            const vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingVendors(vendors);
        }, () => setPendingVendors([]));

        const fetchActivities = async () => {
            try {
                const bookingsSnap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(4)));
                const bookings = bookingsSnap.docs.map(doc => ({
                    id: doc.id, type: 'booking',
                    title: `New Booking: ${doc.data().service || 'Service'}`,
                    subtitle: `ID: CE-${doc.id.substring(0,5).toUpperCase()}`,
                    timeText: 'Recent', icon: <ShoppingCartIcon sx={{ color: '#0F172A', fontSize: 18 }} />,
                    bgColor: '#F1F5F9', timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
                }));

                const emergencySnap = await getDocs(query(collection(db, "EmergencyLogs"), orderBy("resolvedAt", "desc"), limit(3)));
                const emergencies = emergencySnap.docs.map(doc => ({
                    id: doc.id, type: 'sos',
                    title: `SOS Resolved: ${doc.data().userName || 'Tourist'}`,
                    subtitle: 'Case closed successfully',
                    timeText: 'Recent', icon: <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18 }} />,
                    bgColor: '#D1FAE5', timestamp: doc.data().resolvedAt?.toDate ? doc.data().resolvedAt.toDate() : new Date()
                }));

                const combined = [...emergencies, ...bookings].sort((a,b) => b.timestamp - a.timestamp).slice(0, 6);
                setLiveActivities(combined);
            } catch (err) { console.error("Activities load failed:", err); }
        };

        const fetchStats = async () => {
            try {
                const snapUsers = await getDocs(collection(db, "users"));
                setActiveUsersCount(snapUsers.size);
                
                const qBookings = query(collection(db, "bookings"), where("status", "==", "confirmed"));
                const snapBookings = await getDocs(qBookings);
                const total = snapBookings.docs.reduce((sum, doc) => sum + (parseFloat(doc.data().price) || 0), 0);
                setRevenueToday(total);
            } catch (err) {}
        };

        fetchStats();
        fetchActivities();

        return () => { unsubSos(); unsubVendors(); };
    }, []);

    return (
        <Box>
            {/* Operations Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} color="#0F172A" gutterBottom>
                        CEYLO Operations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {todayDate} — Control Center
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" size="small" sx={{ borderColor: '#E2E8F0', color: '#0F172A', '&:hover': { borderColor: '#CBD5E1' } }}>
                        Export Report
                    </Button>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}>
                        New Action
                    </Button>
                </Stack>
            </Box>

            {/* High-value KPI Blocks */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard title="Active Travelers" value={activeUsersCount.toLocaleString()} icon={<PeopleIcon fontSize="small" />} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard title="Platform Revenue" value={`$${revenueToday.toLocaleString()}`} icon={<CurrencyLkrIcon fontSize="small" />} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard 
                        title="Pending Vendors" value={pendingVendors.length} 
                        icon={<StoreIcon fontSize="small" />} iconBgColor="#FEF3C7" iconColor="#D97706" 
                        onClick={() => navigate('/vendors')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard 
                        title="Open SOS Cases" value={activeSosCount} 
                        icon={<WarningIcon fontSize="small" />} iconBgColor="#FEE2E2" iconColor="#DC2626" 
                        onClick={() => navigate('/sos')}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                {/* Left Column: Needs Attention & Analytics */}
                <Grid size={{ xs: 12, md: 8 }}>
                    
                    {/* SECTION 2: Needs Attention (Operational Queue) */}
                    <Paper sx={{ mb: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <ErrorOutlineIcon sx={{ color: '#F59E0B' }} />
                                <Typography variant="h6" color="#0F172A">Needs Attention</Typography>
                            </Box>
                            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/vendors')} sx={{ color: '#3B82F6' }}>
                                View Queue
                            </Button>
                        </Box>
                        
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Priority Item</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Submitted</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingVendors.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#64748B' }}>
                                                Queue is clear. Excellent work.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingVendors.slice(0, 5).map(vendor => (
                                            <TableRow key={vendor.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600} color="#0F172A">
                                                        {vendor.businessName || 'Unknown Vendor'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {vendor.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell><Chip label="Vendor Approval" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706' }} /></TableCell>
                                                <TableCell sx={{ color: '#64748B' }}>Recent</TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" variant="outlined" sx={{ borderColor: '#E2E8F0', color: '#0F172A', minWidth: 60 }}>
                                                        Review
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Quick Analytics / Map Stub */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" color="#0F172A" sx={{ mb: 2 }}>Geographic Activity</Typography>
                        <Box sx={{ width: '100%', height: 280, bgcolor: '#F8F9FA', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                            <Typography variant="body2" color="#94A3B8">Live Map Visualization (Active)</Typography>
                        </Box>
                    </Paper>

                </Grid>

                {/* Right Column: Recent Activity & Quick Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    
                    {/* SECTION 4: Recent Activity */}
                    <Paper sx={{ mb: 4, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #E2E8F0' }}>
                            <Typography variant="h6" color="#0F172A">Activity Feed</Typography>
                        </Box>
                        
                        <List sx={{ p: 0 }}>
                            {liveActivities.map((act, index) => (
                                <Box key={act.id}>
                                    <ListItem sx={{ py: 2, px: 2.5 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <Avatar sx={{ bgcolor: act.bgColor, width: 32, height: 32 }}>
                                                {act.icon}
                                            </Avatar>
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={<Typography variant="body2" fontWeight={600} color="#0F172A">{act.title}</Typography>}
                                            secondary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">{act.subtitle}</Typography>
                                                    <Typography variant="caption" color="#94A3B8">{act.timeText}</Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < liveActivities.length - 1 && <Divider component="li" />}
                                </Box>
                            ))}
                        </List>
                    </Paper>

                    {/* Quick Actions */}
                    <Paper sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" fontWeight={600} color="#64748B" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Quick Actions
                        </Typography>
                        <Stack spacing={1}>
                            <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', color: '#0F172A', borderColor: '#E2E8F0' }}>
                                + Add Destination
                            </Button>
                            <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', color: '#0F172A', borderColor: '#E2E8F0' }}>
                                + Broadcast Announcement
                            </Button>
                            <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start', color: '#0F172A', borderColor: '#E2E8F0' }}>
                                + Generate Report
                            </Button>
                        </Stack>
                    </Paper>

                </Grid>
            </Grid>
        </Box>
    );
}
