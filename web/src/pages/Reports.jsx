import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Grid, TextField, Chip, IconButton, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Menu, MenuItem,
    InputAdornment, Stack, Snackbar, Alert
} from '@mui/material';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import KPICard from '../components/KPICard';

import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterListIcon from '@mui/icons-material/FilterList';


export default function Reports() {
    const [revenue, setRevenue] = useState(0);
    const [bookingsCount, setBookingsCount] = useState(0);
    const [ledger, setLedger] = useState([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // UI State
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        // Guide bookings use lower-case statuses, rides use capitalised ones
        const PAID = ['confirmed', 'accepted', 'completed', 'Confirmed', 'Arrived', 'InProgress', 'Completed'];
        const qBookings = query(collection(db, "bookings"), where("status", "in", PAID));
        const unsubBookings = onSnapshot(qBookings, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => { total += parseFloat(doc.data().price || doc.data().totalPrice || doc.data().cost || 0) || 0; });
            setRevenue(total);
            setBookingsCount(snapshot.docs.length);
        }, (err) => console.error("Bookings listen error:", err));

        const unsubPayouts = onSnapshot(collection(db, "payouts"), (snapshot) => {
            {
                const realPayouts = snapshot.docs.map(doc => {
                    const d = doc.data();
                    const gross = parseFloat(d.gross || d.amount || 0);
                    const fees = gross * 0.15;
                    return {
                        id: doc.id,
                        name: d.name || d.partnerName || 'Partner',
                        role: d.role || d.type || 'Vendor',
                        period: d.period || (d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()),
                        gross, fees, net: gross - fees,
                        status: d.status || 'Pending'
                    };
                });
                setLedger(realPayouts);
            }
        });

        return () => { unsubBookings(); unsubPayouts(); };
    }, []);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text('CEYLO PLATFORM FINANCIAL STATEMENT', 14, 15);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);
        doc.text(`Total Gross Revenue: LKR ${revenue.toFixed(2)}`, 14, 31);
        doc.text(`Platform Fees Collected (15%): LKR ${(revenue * 0.15).toFixed(2)}`, 14, 39);

        doc.autoTable({
            startY: 47,
            head: [['Partner/Vendor', 'Role', 'Period', 'Gross (LKR)', 'Fee (LKR)', 'Net (LKR)', 'Status']],
            body: ledger.map(item => [item.name, item.role, item.period, item.gross.toFixed(2), item.fees.toFixed(2), item.net.toFixed(2), item.status]),
            theme: 'grid', headStyles: { fillColor: [0, 106, 59] } // Ceylo Green
        });
        doc.save(`Ceylo_Financial_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        setSnackbar({ open: true, message: 'PDF Report downloaded successfully!', severity: 'success' });
    };

    const handleMenuOpen = (e, id) => {
        setAnchorEl(e.currentTarget);
        setSelectedRowId(id);
    };

    const handleApprovePayout = () => {
        if (selectedRowId) {
            setLedger(ledger.map(item => item.id === selectedRowId ? { ...item, status: 'Cleared' } : item));
            setSnackbar({ open: true, message: 'Payout approved and funds scheduled for transfer.', severity: 'success' });
        }
        setAnchorEl(null);
    };

    const filteredLedger = ledger.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'All' || item.status.includes(statusFilter);
        return matchSearch && matchStatus;
    });

    const platformFee = revenue * 0.15;

    const getStatusChip = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s.includes('clear') || s.includes('paid')) return <Chip label="Cleared" size="small" sx={{ bgcolor: '#E8F5E9', color: '#006A3B', fontWeight: 800 }} />;
        if (s.includes('process')) return <Chip label="Processing" size="small" sx={{ bgcolor: '#E3F2FD', color: '#1976D2', fontWeight: 800 }} />;
        return <Chip label="Pending Approval" size="small" sx={{ bgcolor: '#FFF8E1', color: '#F57F17', fontWeight: 800, border: '1px solid #FFECB3' }} />;
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#006A3B" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Financial Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Enterprise ledger, automated platform fees, and partner disbursement controls.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={handleExportPDF}
                    startIcon={<FileDownloadIcon />}
                    sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 8, px: 4, py: 1.2, textTransform: 'none' }}
                >
                    Export Statement
                </Button>
            </Box>

            {/* Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: '#F6FBF3', color: '#006A3B', border: '1px solid #EBEFE8' }}>
                            <LocalAtmIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" fontWeight={800} color="text.secondary">GROSS VOLUME (LKR)</Typography>
                            <Typography variant="h5" fontWeight={900} color="#181D19">{revenue.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: '#E8F5E9', color: '#006A3B' }}>
                            <AccountBalanceWalletIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" fontWeight={800} color="text.secondary">PLATFORM FEES YIELD (15%)</Typography>
                            <Typography variant="h5" fontWeight={900} color="#006A3B">+{platformFee.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: '#E3F2FD', color: '#1976D2' }}>
                            <AssessmentIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="caption" fontWeight={800} color="text.secondary">TOTAL TRANSACTIONS</Typography>
                            <Typography variant="h5" fontWeight={900} color="#181D19">{bookingsCount.toLocaleString()}</Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Modern Controls Section */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Segmented Control for Status */}
                    <Box sx={{ display: 'flex', bgcolor: '#EBEFE8', p: 0.5, borderRadius: '50px' }}>
                        {['All', 'Cleared', 'Pending'].map((status) => (
                            <Button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                sx={{
                                    borderRadius: '50px', px: 3, py: 0.8, textTransform: 'none', fontWeight: 800,
                                    bgcolor: statusFilter === status ? '#FFF' : 'transparent',
                                    color: statusFilter === status ? '#006A3B' : '#5C6E64',
                                    boxShadow: statusFilter === status ? '0 2px 8px rgba(0,106,59,0.1)' : 'none',
                                    '&:hover': { bgcolor: statusFilter === status ? '#FFF' : 'rgba(0,0,0,0.02)' }
                                }}
                            >
                                {status}
                            </Button>
                        ))}
                    </Box>

                    <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ color: '#3F4941', borderColor: '#BECABE', fontWeight: 800, borderRadius: 8, px: 3, py: 1, textTransform: 'none' }}>
                        More Filters
                    </Button>
                </Box>

                <TextField
                    placeholder="Search partner or vendor..."
                    size="small"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    sx={{ width: 320, bgcolor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 8 } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                />
            </Box>

            {/* Data Table */}
            <Paper sx={{ borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }}>Partner / Entity</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }}>Entity Type</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }}>Period</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }} align="right">Gross (LKR)</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }} align="right">Platform Fee (15%)</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }} align="right">Net Payout</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', fontWeight: 900, color: '#3F4941', py: 2 }}>Payout Status</TableCell>
                                <TableCell sx={{ bgcolor: '#F4F7F6', py: 2 }} align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLedger.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: '#777', fontWeight: 600 }}>No matching ledger entries found.</TableCell></TableRow>
                            ) : filteredLedger.map((row) => (
                                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ py: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ width: 36, height: 36, bgcolor: '#EBEFE8', color: '#006A3B', fontSize: '1rem', fontWeight: 900 }}>
                                                {row.name.substring(0, 2).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight={800} color="#181D19">{row.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600} color="#5C6E64">{row.role}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600} color="#5C6E64">{row.period}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="#5C6E64">{row.gross.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography></TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'inline-flex', bgcolor: 'rgba(220, 38, 38, 0.08)', px: 1, py: 0.2, borderRadius: 1 }}>
                                            <Typography variant="caption" fontWeight={800} color="#DC2626">-{row.fees.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={900} color="#181D19">{row.net.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography></TableCell>
                                    <TableCell>{getStatusChip(row.status)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, row.id)}><MoreVertIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { minWidth: 180, borderRadius: 3, border: '1px solid #EBEFE8', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } }}
            >
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: '0.875rem', fontWeight: 600, py: 1.5 }}>View Invoice Document</MenuItem>
                <MenuItem onClick={handleApprovePayout} sx={{ fontSize: '0.875rem', fontWeight: 800, color: '#006A3B', py: 1.5 }}>Approve Payout Transfer</MenuItem>
            </Menu>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ fontWeight: 700, borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
