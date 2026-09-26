import React, { useEffect, useState } from 'react';
import { 
    Typography, Box, Chip, Paper, Grid, Tabs, Tab, Stack, IconButton, 
    Snackbar, Alert, Drawer, Avatar, TextField, InputAdornment, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Menu, MenuItem, Divider, Button
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import KPICard from '../components/KPICard';

import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function Bookings() {
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [tab, setTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI State
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuBooking, setMenuBooking] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRows(bookings);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let result = rows;
        if (tab !== 'all') result = result.filter(r => (r.status || 'pending') === tab);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => 
                (r.userName || '').toLowerCase().includes(q) || 
                (r.vendorName || '').toLowerCase().includes(q) ||
                (r.id || '').toLowerCase().includes(q)
            );
        }
        setFilteredRows(result);
    }, [rows, tab, searchQuery]);

    const handleMenuClick = (event, booking) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setMenuBooking(booking);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuBooking(null);
    };

    const openDrawer = (booking) => {
        setSelectedBooking(booking);
        setDrawerOpen(true);
        handleMenuClose();
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "bookings", id), { status: newStatus });
            setSnackbar({ open: true, message: `Booking marked as ${newStatus}.`, severity: 'success' });
            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking(prev => ({ ...prev, status: newStatus }));
            }
            handleMenuClose();
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to update status.', severity: 'error' });
        }
    };

    const getStatusChip = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s === 'confirmed') return <Chip label="Confirmed" size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 600 }} />;
        if (s === 'cancelled') return <Chip label="Cancelled" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }} />;
        return <Chip label="Pending" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600 }} />;
    };

    const totalRevenue = rows.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + (parseFloat(r.price) || parseFloat(r.cost) || 0), 0);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} color="#0F172A">Bookings</Typography>
                </Box>
                <Button variant="outlined" startIcon={<FileDownloadIcon />} sx={{ borderColor: '#E2E8F0', color: '#0F172A' }}>Export Data</Button>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Total Bookings" value={rows.length.toLocaleString()} icon={<BookOnlineIcon fontSize="small"/>} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Pending Review" value={rows.filter(r => (r.status || 'pending') === 'pending').length} icon={<PendingActionsIcon fontSize="small"/>} iconBgColor="#FEF3C7" iconColor="#D97706" /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Confirmed" value={rows.filter(r => r.status === 'confirmed').length} icon={<CheckCircleOutlineIcon fontSize="small"/>} iconBgColor="#D1FAE5" iconColor="#059669" /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Revenue (LKR)" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={<ShowChartIcon fontSize="small"/>} iconBgColor="#DBEAFE" iconColor="#2563EB" /></Grid>
            </Grid>

            {/* Controls */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Tabs value={tab} onChange={(e, val) => setTab(val)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600, color: '#64748B' }, '& .Mui-selected': { color: '#0F172A' } }}>
                    <Tab label="All" value="all" />
                    <Tab label="Pending" value="pending" />
                    <Tab label="Confirmed" value="confirmed" />
                    <Tab label="Cancelled" value="cancelled" />
                </Tabs>
                <TextField placeholder="Search by ID or Name..." size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    sx={{ width: 280, bgcolor: '#FFF' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Box>

            {/* High Density Table */}
            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Booking ID</TableCell>
                                <TableCell>Tourist</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRows.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748B' }}>No bookings found.</TableCell></TableRow>
                            ) : filteredRows.map((row) => (
                                <TableRow key={row.id} hover onClick={() => openDrawer(row)} sx={{ cursor: 'pointer' }}>
                                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748B' }}>{row.id.substring(0,8).toUpperCase()}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600} color="#0F172A">{row.userName || 'Guest'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.vendorName || 'Direct'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.service || row.serviceName}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.date?.toDate ? row.date.toDate().toLocaleDateString() : new Date(row.date).toLocaleDateString()}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={600} color="#0F172A">LKR {(row.price || row.cost || 0).toLocaleString()}</Typography></TableCell>
                                    <TableCell>{getStatusChip(row.status)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => handleMenuClick(e, row)}><MoreVertIcon fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Action Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { minWidth: 140, borderRadius: 2, border: '1px solid #E2E8F0' } }}>
                <MenuItem onClick={() => openDrawer(menuBooking)} sx={{ fontSize: '0.8125rem' }}>View Details</MenuItem>
                <Divider sx={{ my: 0.5 }} />
                {(menuBooking?.status || 'pending') !== 'confirmed' && <MenuItem onClick={() => handleUpdateStatus(menuBooking.id, 'confirmed')} sx={{ fontSize: '0.8125rem', color: 'success.main' }}>Confirm Booking</MenuItem>}
                {(menuBooking?.status || 'pending') !== 'cancelled' && <MenuItem onClick={() => handleUpdateStatus(menuBooking.id, 'cancelled')} sx={{ fontSize: '0.8125rem', color: 'error.main' }}>Cancel Booking</MenuItem>}
            </Menu>

            {/* Side Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
                {selectedBooking && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700} color="#0F172A">Booking Details</Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748B' }}>ID: {selectedBooking.id}</Typography>
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
                        </Box>

                        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                            <Box sx={{ p: 2, mb: 4, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8F9FA', display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getStatusChip(selectedBooking.status)}
                                <Typography variant="caption" color="text.secondary">
                                    Total: LKR {(selectedBooking.price || selectedBooking.cost || 0).toLocaleString()}
                                </Typography>
                            </Box>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tourist Information</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Avatar sx={{ width: 40, height: 40, bgcolor: '#F1F5F9', color: '#0F172A' }}>{selectedBooking.userName ? selectedBooking.userName.charAt(0).toUpperCase() : '?'}</Avatar>
                                <Box>
                                    <Typography variant="body2" fontWeight={600} color="#0F172A">{selectedBooking.userName || 'Guest'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Tourist Profile</Typography>
                                </Box>
                            </Box>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Details</Typography>
                            <Stack spacing={2} sx={{ mb: 4 }}>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Provider</Typography><Typography variant="body2" fontWeight={500}>{selectedBooking.vendorName || 'Direct Booking'}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Service / Item</Typography><Typography variant="body2" fontWeight={500}>{selectedBooking.service || selectedBooking.serviceName}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Date</Typography><Typography variant="body2" fontWeight={500}>{selectedBooking.date?.toDate ? selectedBooking.date.toDate().toLocaleDateString() : new Date(selectedBooking.date).toLocaleDateString()}</Typography></Box>
                            </Stack>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financials</Typography>
                            <Box sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                    <Typography variant="body2" fontWeight={500}>LKR {(selectedBooking.price || selectedBooking.cost || 0).toLocaleString()}</Typography>
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" fontWeight={700} color="#0F172A">Total Paid</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0F172A">LKR {(selectedBooking.price || selectedBooking.cost || 0).toLocaleString()}</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8F9FA', display: 'flex', gap: 2 }}>
                            {(selectedBooking.status || 'pending') !== 'confirmed' && <Button variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }} fullWidth onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}>Confirm</Button>}
                            {(selectedBooking.status || 'pending') !== 'cancelled' && <Button variant="outlined" color="error" fullWidth onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}>Cancel</Button>}
                        </Box>
                    </Box>
                )}
            </Drawer>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

export default Bookings;
