import React, { useEffect, useState } from 'react';
import { 
    Grid, Paper, Typography, Box, Chip, Button, 
    Divider, Stack, Avatar, List, ListItem, ListItemIcon, ListItemText,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Snackbar, Alert
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MapIcon from '@mui/icons-material/Map';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/KPICard';
import { bookingStage, bookingAmount } from '../utils/bookings';

export default function Dashboard() {
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    const [revenueToday, setRevenueToday] = useState(0);
    const [activeSosCount, setActiveSosCount] = useState(0);
    const [pendingVendors, setPendingVendors] = useState([]);
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const [liveActivities, setLiveActivities] = useState([]);
    
    // Filter States
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    const navigate = useNavigate();
    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    useEffect(() => {
        const sosQuery = query(collection(db, "sos_alerts"), where("status", "in", ["active", "acknowledged", "dispatched", "investigating"]));
        const unsubSos = onSnapshot(sosQuery, (snap) => setActiveSosCount(snap.size), () => setActiveSosCount(0));

        const vendorQuery = query(collection(db, "vendors"), where("verificationStatus", "==", "pending"));
        const unsubVendors = onSnapshot(vendorQuery, (snap) => {
            const vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingVendors(vendors);
        }, () => setPendingVendors([]));

        const driverQuery = query(collection(db, "drivers"), where("status", "==", "pending_verification"));
        const unsubDrivers = onSnapshot(driverQuery, (snap) => {
            const drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingDrivers(drivers);
        }, () => setPendingDrivers([]));

        const fetchActivities = async () => {
            try {
                const bookingsSnap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(4)));
                const bookings = bookingsSnap.docs.map(doc => ({
                    id: doc.id, type: 'booking',
                    title: `New Booking: ${doc.data().service || 'Service'}`,
                    subtitle: `ID: CE-${doc.id.substring(0,5).toUpperCase()}`,
                    timeText: 'Recent', icon: <ShoppingCartIcon sx={{ color: '#0F172A', fontSize: 18 }} />,
                    bgColor: '#F1F8F6', timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
                }));

                const emergencySnap = await getDocs(query(collection(db, "EmergencyLogs"), orderBy("resolvedAt", "desc"), limit(3)));
                const emergencies = emergencySnap.docs.map(doc => ({
                    id: doc.id, type: 'sos',
                    title: `SOS Resolved: ${doc.data().userName || 'Tourist'}`,
                    subtitle: 'Case closed successfully',
                    timeText: 'Recent', icon: <CheckCircleIcon sx={{ color: '#006A3B', fontSize: 18 }} />,
                    bgColor: '#E8F5E9', timestamp: doc.data().resolvedAt?.toDate ? doc.data().resolvedAt.toDate() : new Date()
                }));

                const combined = [...emergencies, ...bookings].sort((a,b) => b.timestamp - a.timestamp).slice(0, 6);
                setLiveActivities(combined);
            } catch (err) { console.error("Activities load failed:", err); }
        };

        const fetchStats = async () => {
            try {
                const snapUsers = await getDocs(collection(db, "users"));
                setActiveUsersCount(snapUsers.size);
                
                // Rupee revenue from confirmed and completed rides and orders, whatever case the app wrote
                const snapBookings = await getDocs(collection(db, "bookings"));
                const total = snapBookings.docs.map(d => d.data())
                    .filter(b => b.type !== 'guide' && ['confirmed', 'completed'].includes(bookingStage(b.status)))
                    .reduce((sum, b) => sum + bookingAmount(b), 0);
                setRevenueToday(total);
            } catch (err) {}
        };

        fetchStats();
        fetchActivities();

        return () => { unsubSos(); unsubVendors(); unsubDrivers(); };
    }, []);

    const operationalQueue = [
        ...pendingDrivers.map(d => ({
            id: d.id,
            title: d.name || 'Unknown Driver',
            subtitle: `${d.phone ? d.phone + ' • ' : ''}${d.vehicleType || 'Vehicle'}${d.licensePlate ? ' (' + d.licensePlate + ')' : ''}`,
            type: 'driver',
            typeLabel: 'Driver Approval',
            typeBg: '#EFF6FF',
            typeColor: '#1D4ED8',
            submitted: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent',
            route: '/drivers'
        })),
        ...pendingVendors.map(vendor => ({
            id: vendor.id,
            title: vendor.businessName || 'Unknown Vendor',
            subtitle: vendor.email || '',
            type: 'vendor',
            typeLabel: 'Vendor Approval',
            typeBg: '#FEF3C7',
            typeColor: '#D97706',
            submitted: vendor.createdAt?.toDate ? vendor.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent',
            route: '/vendors'
        }))
    ];

    return (
        <Box>
            {/* Operations Header with Filters */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 2 }}>
                <Box>
                    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Dashboard</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>{todayDate}</Typography>
                </Box>
                
            </Box>

            {/* High-value KPI Blocks */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KPICard title="Active Travelers" value={activeUsersCount.toLocaleString()} icon={<PeopleIcon fontSize="small" />} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KPICard title="Platform Revenue" value={`LKR ${revenueToday.toLocaleString()}`} icon={<CurrencyLkrIcon fontSize="small" />} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KPICard 
                        title="Pending Drivers" value={pendingDrivers.length} 
                        icon={<DirectionsCarIcon fontSize="small" />} iconBgColor="#EFF6FF" iconColor="#1D4ED8" 
                        onClick={() => navigate('/drivers')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KPICard 
                        title="Pending Vendors" value={pendingVendors.length} 
                        icon={<StoreIcon fontSize="small" />} iconBgColor="#FEF3C7" iconColor="#D97706" 
                        onClick={() => navigate('/vendors')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
                                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EBEFE8', bgcolor: '#F4F7F6' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <ErrorOutlineIcon sx={{ color: '#F57C00' }} />
                                        <Typography variant="h6" color="#181D19">
                                            Needs Attention {operationalQueue.length > 0 ? `(${operationalQueue.length})` : ''}
                                        </Typography>
                                    </Box>
                                    <Button 
                                        size="small" 
                                        endIcon={<ArrowForwardIcon />} 
                                        onClick={() => navigate(pendingDrivers.length > 0 ? '/drivers' : '/vendors')} 
                                        sx={{ color: '#006A3B' }}
                                    >
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
                                            {operationalQueue.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#5C6E64' }}>
                                                        Nothing waiting for review.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                operationalQueue.slice(0, 6).map(item => (
                                                    <TableRow key={item.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={600} color="#181D19">
                                                                {item.title}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.subtitle}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip 
                                                                label={item.typeLabel} 
                                                                size="small" 
                                                                sx={{ bgcolor: item.typeBg, color: item.typeColor, fontWeight: 600 }} 
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ color: '#5C6E64' }}>{item.submitted}</TableCell>
                                                        <TableCell align="right">
                                                            <Button 
                                                                size="small" 
                                                                variant="outlined" 
                                                                onClick={() => navigate(item.route)}
                                                                sx={{ borderColor: '#EBEFE8', color: '#006A3B', minWidth: 60 }}
                                                            >
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

                </Grid>

                {/* Right Column: Recent Activity & Quick Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    
                    {/* Quick Actions (Moved to Top) */}
                    <Paper sx={{ p: 3, mb: 4, bgcolor: '#FFFFFF' }}>
                        <Typography variant="subtitle2" fontWeight={600} color="#006A3B" sx={{ mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Quick Actions
                        </Typography>
                        <Stack spacing={1.5}>
                            <Button 
                                variant="outlined" 
                                fullWidth 
                                startIcon={<MapIcon sx={{ color: '#006A3B' }}/>}
                                onClick={() => navigate('/destinations')}
                                sx={{ 
                                    justifyContent: 'flex-start', 
                                    color: '#181D19', 
                                    borderColor: '#EBEFE8', 
                                    py: 1.5, px: 2,
                                    bgcolor: '#FFF',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { borderColor: '#006A3B', bgcolor: '#F1F8F6', boxShadow: 'none' }
                                }}
                            >
                                Add New Destination
                            </Button>
                            <Button 
                                variant="outlined" 
                                fullWidth 
                                startIcon={<WarningIcon sx={{ color: '#F57C00' }}/>}
                                onClick={() => navigate('/sos')}
                                sx={{ 
                                    justifyContent: 'flex-start', 
                                    color: '#181D19', 
                                    borderColor: '#EBEFE8', 
                                    py: 1.5, px: 2,
                                    bgcolor: '#FFF',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { borderColor: '#F57C00', bgcolor: '#FFF3E0', boxShadow: '0 4px 12px rgba(245,124,0,0.05)' }
                                }}
                            >
                                Broadcast Emergency
                            </Button>
                            <Button 
                                variant="outlined" 
                                fullWidth 
                                startIcon={<AssessmentIcon sx={{ color: '#1976D2' }}/>}
                                onClick={() => navigate('/reports')}
                                sx={{ 
                                    justifyContent: 'flex-start', 
                                    color: '#181D19', 
                                    borderColor: '#EBEFE8', 
                                    py: 1.5, px: 2,
                                    bgcolor: '#FFF',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { borderColor: '#1976D2', bgcolor: '#E3F2FD', boxShadow: '0 4px 12px rgba(25,118,210,0.05)' }
                                }}
                            >
                                Generate KPI Report
                            </Button>
                        </Stack>
                    </Paper>

                    {/* SECTION 4: Recent Activity */}
                    <Paper sx={{ mb: 4, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #EBEFE8', bgcolor: '#F4F7F6' }}>
                            <Typography variant="h6" color="#181D19">Activity Feed</Typography>
                        </Box>
                        
                        <List sx={{ p: 0 }}>
                            {liveActivities.length === 0 && (
                                <Typography sx={{ p: 2.5, fontSize: 13, color: 'text.secondary' }}>No activity yet.</Typography>
                            )}
                            {liveActivities.map((act, index) => (
                                <Box key={act.id}>
                                    <ListItem sx={{ py: 2, px: 2.5 }}>
                                        <ListItemIcon sx={{ minWidth: 44 }}>
                                            <Avatar sx={{ bgcolor: act.bgColor, width: 34, height: 34 }}>
                                                {act.icon}
                                            </Avatar>
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={<Typography variant="body2" fontWeight={600} color="#181D19">{act.title}</Typography>}
                                            secondary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">{act.subtitle}</Typography>
                                                    <Typography variant="caption" color="#5C6E64" fontWeight={600}>{act.timeText}</Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < liveActivities.length - 1 && <Divider component="li" />}
                                </Box>
                            ))}
                        </List>
                    </Paper>

                </Grid>
            </Grid>

            {/* Snackbar for interactions */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="success" sx={{ width: '100%', borderRadius: 2 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
