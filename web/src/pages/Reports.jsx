import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, TextField, Chip, IconButton, Avatar, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Menu, MenuItem, Divider, InputAdornment, Stack
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

export default function Reports() {
    const [revenue, setRevenue] = useState(0);
    const [bookingsCount, setBookingsCount] = useState(0);
    const [ledger, setLedger] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        const qBookings = query(collection(db, "bookings"), where("status", "==", "confirmed"));
        const unsubBookings = onSnapshot(qBookings, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => { total += parseFloat(doc.data().price || doc.data().cost || 0); });
            setRevenue(total);
            setBookingsCount(snapshot.docs.length);
        });

        const unsubPayouts = onSnapshot(collection(db, "payouts"), (snapshot) => {
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
            theme: 'grid', headStyles: { fillColor: [15, 23, 42] }
        });
        doc.save(`Ceylo_Financial_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const filteredLedger = ledger.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const platformFee = revenue * 0.15;
    const netPayouts = revenue - platformFee;

    const getStatusChip = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s.includes('approv') || s.includes('paid') || s.includes('cleared')) return <Chip label={status} size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 600 }} />;
        if (s.includes('reject') || s.includes('fail')) return <Chip label={status} size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }} />;
        return <Chip label={status} size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600 }} />;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} color="#0F172A" gutterBottom>Financial Reports</Typography>
                    <Typography variant="body2" color="text.secondary">Ledger, platform fees, and partner disbursements.</Typography>
                </Box>
                <Button variant="contained" onClick={handleExportPDF} startIcon={<FileDownloadIcon />} sx={{ bgcolor: '#0F172A', color: '#FFF' }}>
                    Export PDF Report
                </Button>
            </Box>

            {/* Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}><KPICard title="Gross Volume (LKR)" value={revenue.toLocaleString(undefined, {minimumFractionDigits:2})} icon={<LocalAtmIcon fontSize="small"/>} /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><KPICard title="Platform Fees (15%)" value={platformFee.toLocaleString(undefined, {minimumFractionDigits:2})} icon={<AccountBalanceWalletIcon fontSize="small"/>} iconBgColor="#D1FAE5" iconColor="#059669" /></Grid>
                <Grid size={{ xs: 12, md: 4 }}><KPICard title="Total Transactions" value={bookingsCount.toLocaleString()} icon={<AssessmentIcon fontSize="small"/>} iconBgColor="#DBEAFE" iconColor="#2563EB" /></Grid>
            </Grid>

            <Box sx={{ mb: 3, display: 'flex' }}>
                <TextField placeholder="Search ledger by partner name..." size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    sx={{ width: 320, bgcolor: '#FFF' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Box>

            <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8F9FA' }}>
                    <Typography variant="subtitle2" fontWeight={600} color="#0F172A">Partner Disbursement Ledger</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Partner / Entity</TableCell>
                                <TableCell>Entity Type</TableCell>
                                <TableCell>Period / Date</TableCell>
                                <TableCell align="right">Gross (LKR)</TableCell>
                                <TableCell align="right">Ceylo Fee (15%)</TableCell>
                                <TableCell align="right">Net Payout</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLedger.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748B' }}>No ledger entries found.</TableCell></TableRow>
                            ) : filteredLedger.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#F1F5F9', color: '#0F172A', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {row.name.substring(0, 2).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight={600} color="#0F172A">{row.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.role}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{row.period}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" color="text.secondary">{row.gross.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" color="error.main">-{row.fees.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={600} color="#0F172A">{row.net.toLocaleString(undefined, {minimumFractionDigits:2})}</Typography></TableCell>
                                    <TableCell>{getStatusChip(row.status)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { minWidth: 150, borderRadius: 2, border: '1px solid #E2E8F0' } }}>
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: '0.8125rem' }}>View Invoice</MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ fontSize: '0.8125rem' }}>Approve Payout</MenuItem>
            </Menu>
        </Box>
    );
}
