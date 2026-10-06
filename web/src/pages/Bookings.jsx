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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterListIcon from '@mui/icons-material/FilterList';

import { bookingStage, bookingAmount, formatBookingAmount } from '../utils/bookings';


function Bookings() {
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [tab, setTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10));
    
    // UI State
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuBooking, setMenuBooking] = useState(null);
    const [filterAnchor, setFilterAnchor] = useState(null);
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
        if (tab !== 'all') result = result.filter(r => bookingStage(r.status) === tab || (tab === 'confirmed' && bookingStage(r.status) === 'completed'));
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
        const s = bookingStage(status);
        if (s === 'completed') return <Chip label="Completed" size="small" sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 600 }} />;
        if (s === 'confirmed') return <Chip label="Confirmed" size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 600 }} />;
        if (s === 'cancelled') return <Chip label="Cancelled" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }} />;
        return <Chip label="Pending" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600 }} />;
    };

    // Rupee revenue from confirmed and completed rides and orders (guide tours are priced in US$)
    const totalRevenue = rows
        .filter(r => r.type !== 'guide' && ['confirmed', 'completed'].includes(bookingStage(r.status)))
        .reduce((sum, r) => sum + bookingAmount(r), 0);

    const handleExportData = () => {
        if (filteredRows.length === 0) {
            setSnackbar({ open: true, message: 'No data to export', severity: 'warning' });
            return;
        }

        let csvContent = "Booking ID,Tourist,Provider,Service,Date,Amount (LKR),Status\n";
        
        filteredRows.forEach(row => {
            const id = row.id.substring(0,8).toUpperCase();
            const tourist = (row.userName || 'Guest').replace(/,/g, '');
            const provider = (row.vendorName || 'Direct').replace(/,/g, '');
            const service = (row.service || row.serviceName || 'Unknown').replace(/,/g, '');
            const date = formatDate(row.date);
            const amount = formatBookingAmount(row);
            const status = (row.status || 'pending').toUpperCase();
            
            csvContent += `"${id}","${tourist}","${provider}","${service}","${date}","${amount}","${status}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `CEYLO_Bookings_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setSnackbar({ open: true, message: 'Bookings exported successfully to CSV!', severity: 'success' });
    };

    const formatDate = (date) => {
        if (!date) return 'Not Scheduled';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            return isNaN(d) ? 'Pending Schedule' : d.toLocaleDateString('en-GB');
        } catch (e) {
            return 'Pending Schedule';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="#006A3B">Bookings Center</Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>Manage and review all platform reservations</Typography>
                </Box>
                
                {/* Filter Controls */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField 
                        type="date" 
                        size="small" 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        sx={{ 
                            bgcolor: '#FFF', 
                            minWidth: 160, 
                            '& .MuiOutlinedInput-root': { 
                                borderRadius: 8, 
                                '& fieldset': { borderColor: '#EBEFE8' },
                                '&:hover fieldset': { borderColor: '#006A3B' }
                            } 
                        }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><CalendarMonthIcon sx={{ fontSize: 18, color: '#006A3B' }}/></InputAdornment>
                        }}
                    />
                    <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<FilterListIcon />} 
                        onClick={(e) => setFilterAnchor(e.currentTarget)}
                        sx={{ 
                            borderColor: '#EBEFE8', 
                            color: '#181D19', 
                            bgcolor: '#FFF',
                            borderRadius: 8,
                            px: 2,
                            fontWeight: 600,
                            '&:hover': { borderColor: '#006A3B', bgcolor: '#F1F8F6' }
                        }}
                    >
                        More Filters
                    </Button>
                    <Menu
                        anchorEl={filterAnchor}
                        open={Boolean(filterAnchor)}
                        onClose={() => setFilterAnchor(null)}
                        PaperProps={{
                            sx: { mt: 1, borderRadius: 3, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #EBEFE8' }
                        }}
                    >
                        <MenuItem onClick={() => setFilterAnchor(null)}><Typography variant="body2" fontWeight={600}>Service Type: Safari</Typography></MenuItem>
                        <MenuItem onClick={() => setFilterAnchor(null)}><Typography variant="body2" fontWeight={600}>Service Type: Transport</Typography></MenuItem>
                        <Divider />
                        <MenuItem onClick={() => setFilterAnchor(null)}><Typography variant="body2" fontWeight={600}>High Value (&gt; LKR 10k)</Typography></MenuItem>
                        <MenuItem onClick={() => setFilterAnchor(null)}><Typography variant="body2" color="error" fontWeight={600}>Clear Filters</Typography></MenuItem>
                    </Menu>

                    <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<FileDownloadIcon />} 
                        onClick={handleExportData}
                        sx={{ 
                            bgcolor: '#006A3B', 
                            color: '#FFF',
                            borderRadius: 8,
                            px: 2,
                            fontWeight: 600,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: '0 4px 12px rgba(0, 106, 59, 0.2)' }
                        }}
                    >
                        Export Data
                    </Button>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Total Bookings" value={rows.length.toLocaleString()} icon={<BookOnlineIcon fontSize="small"/>} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Pending Review" value={rows.filter(r => bookingStage(r.status) === 'pending').length} icon={<PendingActionsIcon fontSize="small"/>} iconBgColor="#FEF3C7" iconColor="#D97706" /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Confirmed" value={rows.filter(r => ['confirmed', 'completed'].includes(bookingStage(r.status))).length} icon={<CheckCircleOutlineIcon fontSize="small"/>} iconBgColor="#D1FAE5" iconColor="#059669" /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><KPICard title="Revenue (LKR)" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={<ShowChartIcon fontSize="small"/>} iconBgColor="#DBEAFE" iconColor="#2563EB" /></Grid>
            </Grid>

            {/* Modern Controls Section */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
                
                {/* Segmented Control Pill Tabs */}
                <Box sx={{ p: 0.5, bgcolor: '#EBEFE8', borderRadius: 2.5, display: 'inline-flex' }}>
                    <Tabs 
                        value={tab} 
                        onChange={(e, val) => setTab(val)} 
                        TabIndicatorProps={{ sx: { display: 'none' } }}
                        sx={{
                            minHeight: 36,
                            '& .MuiTab-root': {
                                minHeight: 36,
                                py: 0.5, px: 3,
                                textTransform: 'none',
                                fontWeight: 700,
                                color: '#5C6E64',
                                borderRadius: 2,
                                transition: 'all 0.2s ease',
                                '&:hover': { color: '#006A3B' }
                            },
                            '& .Mui-selected': {
                                color: '#006A3B !important',
                                bgcolor: '#FFFFFF',
                                boxShadow: '0 2px 8px rgba(0, 106, 59, 0.08)'
                            }
                        }}
                    >
                        <Tab label="All Bookings" value="all" />
                        <Tab label="Pending" value="pending" />
                        <Tab label="Confirmed" value="confirmed" />
                        <Tab label="Cancelled" value="cancelled" />
                    </Tabs>
                </Box>

                {/* Premium Search Bar */}
                <TextField 
                    placeholder="Search by Booking ID or Tourist Name..." 
                    size="small" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    sx={{ 
                        width: { xs: '100%', md: 320 }, 
                        '& .MuiOutlinedInput-root': { 
                            bgcolor: '#FFFFFF', 
                            borderRadius: 2.5,
                            transition: 'all 0.3s',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            '&:hover': { boxShadow: '0 4px 12px rgba(0, 106, 59, 0.05)' },
                            '&.Mui-focused': { boxShadow: '0 4px 12px rgba(0, 106, 59, 0.1)' }
                        }
                    }} 
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#006A3B', fontSize: 20 }} /></InputAdornment> 
                    }}
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
                                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#5C6E64', fontWeight: 700 }}>{row.id.substring(0,8).toUpperCase()}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={800} color="#181D19">{row.userName || 'Guest'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary" fontWeight={600}>{row.vendorName || 'Direct'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.service || row.serviceName}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{formatDate(row.date)}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={600} color="#0F172A">{formatBookingAmount(row)}</Typography></TableCell>
                                    <TableCell>
                                        {getStatusChip(row.status)}
                                        {row.paymentStatus === 'paid' && <Chip label="Paid online" size="small" sx={{ ml: 0.5, bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 600 }} />}
                                    </TableCell>
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
                {bookingStage(menuBooking?.status) === 'pending' && <MenuItem onClick={() => handleUpdateStatus(menuBooking.id, 'confirmed')} sx={{ fontSize: '0.8125rem', color: 'success.main' }}>Confirm Booking</MenuItem>}
                {!['cancelled', 'completed'].includes(bookingStage(menuBooking?.status)) && <MenuItem onClick={() => handleUpdateStatus(menuBooking.id, 'cancelled')} sx={{ fontSize: '0.8125rem', color: 'error.main' }}>Cancel Booking</MenuItem>}
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
                                    Total: {formatBookingAmount(selectedBooking)}
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
                                <Box><Typography variant="caption" color="text.secondary" display="block">Date</Typography><Typography variant="body2" fontWeight={500}>{selectedBooking.date?.toDate ? selectedBooking.date.toDate().toLocaleDateString('en-GB') : new Date(selectedBooking.date).toLocaleDateString('en-GB')}</Typography></Box>
                            </Stack>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financials</Typography>
                            <Box sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                    <Typography variant="body2" fontWeight={500}>{formatBookingAmount(selectedBooking)}</Typography>
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" fontWeight={700} color="#0F172A">Total Paid</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0F172A">{formatBookingAmount(selectedBooking)}</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8F9FA', display: 'flex', gap: 2 }}>
                            {bookingStage(selectedBooking.status) === 'pending' && <Button variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }} fullWidth onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}>Confirm</Button>}
                            {!['cancelled', 'completed'].includes(bookingStage(selectedBooking.status)) && <Button variant="outlined" color="error" fullWidth onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}>Cancel</Button>}
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
