import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    TextField, Chip, IconButton, Tooltip, Avatar, List, ListItem,
    Divider, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert, Pagination, LinearProgress
} from '@mui/material';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Icons
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


export default function Reports() {
    const [revenue, setRevenue] = useState(142850.00);
    const [bookingsCount, setBookingsCount] = useState(42);
    const [ledger, setLedger] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        // Query confirmed bookings for real-time revenue aggregates
        const q = query(collection(db, "bookings"), where("status", "==", "confirmed"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const price = parseFloat(data.price || data.totalPrice || data.amount || 0);
                total += price;
            });

            if (total > 0) {
                setRevenue(total);
                setBookingsCount(snapshot.docs.length);
            }
        }, (err) => {
            console.error("Revenue aggregator error:", err);
        });

        // Listen to real payouts from Firestore
        const payoutsUnsub = onSnapshot(collection(db, "payouts"), (snapshot) => {
            const realPayouts = snapshot.docs.map(doc => {
                const d = doc.data();
                const gross = parseFloat(d.gross || d.amount || 0);
                const fees = parseFloat(d.fees || gross * 0.15);
                return {
                    id: doc.id,
                    name: d.name || d.partnerName || 'Partner',
                    role: d.role || d.type || 'Vendor',
                    period: d.period || (d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : 'N/A'),
                    gross,
                    fees,
                    net: gross - fees,
                    status: d.status || 'Pending Approval'
                };
            });
            setLedger(realPayouts);
        }, (err) => {
            console.error("Payouts listener error:", err);
            setLedger([]);
        });

        return () => {
            setTimeout(() => {
                if (typeof unsubscribe === 'function') unsubscribe();
                if (typeof payoutsUnsub === 'function') payoutsUnsub();
            }, 0);
        };
    }, []);

    // Export PDF Report function using jspdf-autotable
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            doc.text('CEYLO PLATFORM FINANCIAL STATEMENT', 14, 15);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 23);
            doc.text(`Total Aggregated Revenue: $${revenue.toFixed(2)}`, 14, 31);
            doc.text(`Platform Fees Collected (15%): $${(revenue * 0.15).toFixed(2)}`, 14, 39);
            
            doc.autoTable({
                startY: 47,
                head: [['Partner/Vendor', 'Role', 'Period', 'Gross Revenue', 'Platform Fee (15%)', 'Net Disbursed', 'Status']],
                body: ledger.map(item => [
                    item.name,
                    item.role,
                    item.period,
                    `$${item.gross.toFixed(2)}`,
                    `-$${item.fees.toFixed(2)}`,
                    `$${item.net.toFixed(2)}`,
                    item.status
                ]),
            });
            doc.save('CEYLO_Financial_Report.pdf');
            setSnackbar({ open: true, message: 'PDF report downloaded successfully!', severity: 'success' });
        } catch (e) {
            console.error("PDF generation failed:", e);
            setSnackbar({ open: true, message: 'Export failed: ' + e.message, severity: 'error' });
        }
    };

    // Export CSV Report function
    const handleExportCSV = () => {
        try {
            const headers = ['Partner Name', 'Role', 'Payout Period', 'Gross Amount', 'Platform Fee (15%)', 'Net Payout', 'Payout Status'];
            const rows = ledger.map(item => [
                item.name,
                item.role,
                item.period,
                item.gross,
                item.fees,
                item.net,
                item.status
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'CEYLO_Payout_Registry.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setSnackbar({ open: true, message: 'CSV ledger exported successfully!', severity: 'success' });
        } catch (e) {
            console.error("CSV generation failed:", e);
            setSnackbar({ open: true, message: 'Export failed: ' + e.message, severity: 'error' });
        }
    };

    // Filter Ledger Rows
    const filteredLedger = ledger.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header section matching screenshot */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={950} color="#006A3B">
                        Financial Reports & Payouts
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField 
                        placeholder="Search transactions..." 
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ bgcolor: '#FFF', width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportPDF}
                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                    >
                        Export Report
                    </Button>
                </Box>
            </Box>

            {/* Metrics cards row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                
                {/* Total Revenue */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={900} color="text.secondary">TOTAL REVENUE</Typography>
                            <Avatar variant="rounded" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', width: 32, height: 32 }}><LocalAtmIcon fontSize="small" /></Avatar>
                        </Stack>
                        <Typography variant="h5" fontWeight={950} color="#181D19" gutterBottom>
                            ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={850}>
                            📈 +12.5% from last month
                        </Typography>
                    </Paper>
                </Grid>

                {/* Platform Fees */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={900} color="text.secondary">PLATFORM FEES</Typography>
                            <Avatar variant="rounded" sx={{ bgcolor: '#E0F7FA', color: '#00838F', width: 32, height: 32 }}><AccountBalanceWalletIcon fontSize="small" /></Avatar>
                        </Stack>
                        <Typography variant="h5" fontWeight={950} color="#181D19" gutterBottom>
                            ${(revenue * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={850}>
                            Fixed 15% across all vendors
                        </Typography>
                    </Paper>
                </Grid>

                {/* Pending Payouts */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={900} color="text.secondary">PENDING PAYOUTS</Typography>
                            <Avatar variant="rounded" sx={{ bgcolor: '#FFF3E0', color: '#E65100', width: 32, height: 32 }}><PendingActionsIcon fontSize="small" /></Avatar>
                        </Stack>
                        <Typography variant="h5" fontWeight={950} color="#181D19" gutterBottom>
                            $34,120.00
                        </Typography>
                        <Typography variant="caption" color="#E65100" fontWeight={850}>
                            14 transactions awaiting approval
                        </Typography>
                    </Paper>
                </Grid>

                {/* Completed Payouts */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={900} color="text.secondary">COMPLETED PAYOUTS</Typography>
                            <Avatar variant="rounded" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', width: 32, height: 32 }}><CheckCircleOutlineIcon fontSize="small" /></Avatar>
                        </Stack>
                        <Typography variant="h5" fontWeight={950} color="#181D19" gutterBottom>
                            $87,302.50
                        </Typography>
                        <Typography variant="caption" color="#2E7D32" fontWeight={850}>
                            Disbursed to {bookingsCount} partners
                        </Typography>
                    </Paper>
                </Grid>

            </Grid>

            {/* Split row: Revenue Trends & Payout Split */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                
                {/* Revenue trends Chart */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                            <Typography variant="subtitle1" fontWeight={900}>
                                Revenue Trends
                            </Typography>
                            <Chip label="Last 6 Months" size="small" sx={{ fontWeight: 800, bgcolor: '#F5F5F5' }} />
                        </Box>
                        
                        {/* Custom SVG/CSS Bar Chart representing Jan-Jun */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, px: 2, pt: 2 }}>
                            {[
                                { m: 'JAN', h: '35%' },
                                { m: 'FEB', h: '55%' },
                                { m: 'MAR', h: '40%' },
                                { m: 'APR', h: '75%' },
                                { m: 'MAY', h: '85%' },
                                { m: 'JUN', h: '95%' }
                            ].map((bar, idx) => (
                                <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%', height: '100%', justifyContent: 'flex-end' }}>
                                    <Box sx={{ 
                                        width: '100%', 
                                        height: bar.h, 
                                        bgcolor: '#E0EAE2', 
                                        borderRadius: '6px 6px 0 0',
                                        '&:hover': { bgcolor: '#006A3B' },
                                        transition: 'background-color 0.2s ease-in-out'
                                    }} />
                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ mt: 1.5, fontSize: '0.65rem' }}>
                                        {bar.m}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Payout Split indicators */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 3 }}>
                                Payout Split
                            </Typography>
                            <Stack spacing={2}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={850}>Luxury Hotels</Typography>
                                        <Typography variant="caption" fontWeight={900}>62%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={62} sx={{ height: 6, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />
                                </Box>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={850}>Field Guides</Typography>
                                        <Typography variant="caption" fontWeight={900}>28%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={28} sx={{ height: 6, borderRadius: 2, bgcolor: '#E0F7FA', '& .MuiLinearProgress-bar': { bgcolor: '#00838F' } }} />
                                </Box>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={850}>Transport</Typography>
                                        <Typography variant="caption" fontWeight={900}>10%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={10} sx={{ height: 6, borderRadius: 2, bgcolor: '#FFF3E0', '& .MuiLinearProgress-bar': { bgcolor: '#E65100' } }} />
                                </Box>
                            </Stack>
                        </Box>

                        <Box sx={{ bgcolor: '#F8F9FA', p: 1.5, borderRadius: 3, border: '1px solid #EBEFE8', mt: 3 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', lineHeight: 1.4 }}>
                                Average net margin for Ceylo Ecosystem is currently 14.8%, aligned with Q3 sustainability targets.
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

            </Grid>

            {/* Payout ledger table panel */}
            <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', mb: 4 }}>
                
                {/* Ledger control header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={900}>
                        Payout Ledger
                    </Typography>
                    <Stack direction="row" spacing={1.5}>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<FilterListIcon />}
                            sx={{ borderColor: '#BECABE', color: '#181D19', fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                        >
                            Filters
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<CalendarMonthIcon />}
                            sx={{ borderColor: '#BECABE', color: '#181D19', fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                        >
                            Date Range
                        </Button>
                    </Stack>
                </Box>

                {/* Ledger Table */}
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>VENDOR / GUIDE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ROLE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>PERIOD</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>GROSS</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>FEES (15%)</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>NET PAYOUT</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>STATUS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLedger.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <Typography color="text.secondary" fontWeight={700}>
                                            No payout records found. Payouts will appear here once processed.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredLedger.map((item) => (
                                <TableRow key={item.id} hover>
                                    
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#E0F2F1', color: '#004D40', fontWeight: 800 }}>
                                                {item.name.split(' ').map(n => n[0]).join('')}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={800}>{item.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.role}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Chip 
                                            label={item.role.toUpperCase()} 
                                            size="small"
                                            sx={{ 
                                                fontWeight: 900, fontSize: '0.65rem',
                                                bgcolor: item.role.includes('Guide') ? '#E8F5E9' : item.role.includes('Resort') ? '#F3E5F5' : '#E0F7FA',
                                                color: item.role.includes('Guide') ? '#2E7D32' : item.role.includes('Resort') ? '#7B1FA2' : '#00838F'
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell sx={{ fontWeight: 650, color: '#555' }}>{item.period}</TableCell>
                                    
                                    <TableCell sx={{ fontWeight: 700 }}>${item.gross.toFixed(2)}</TableCell>
                                    
                                    <TableCell sx={{ fontWeight: 700, color: '#BA1A1A' }}>-${item.fees.toFixed(2)}</TableCell>
                                    
                                    <TableCell sx={{ fontWeight: 800, color: '#2E7D32' }}>${item.net.toFixed(2)}</TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ 
                                                width: 8, height: 8, borderRadius: '50%',
                                                bgcolor: item.status === 'Completed' ? '#2E7D32' : item.status === 'Processing' ? '#F57C00' : '#777' 
                                            }} />
                                            <Typography variant="caption" fontWeight={850} color={item.status === 'Completed' ? '#2E7D32' : item.status === 'Processing' ? '#F57C00' : '#777'}>
                                                {item.status.toUpperCase()}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                </TableRow>
                            ))}

                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Showing {filteredLedger.length} of 58 payout records
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <IconButton disabled size="small"><ArrowForwardIosIcon fontSize="inherit" sx={{ transform: 'rotate(180deg)' }} /></IconButton>
                        <IconButton size="small"><ArrowForwardIosIcon fontSize="inherit" /></IconButton>
                    </Stack>
                </Box>

            </Paper>

            {/* Bottom Section splits: Financial Documents & Emergency Support */}
            <Grid container spacing={3} sx={{ mb: 2 }}>
                
                {/* Financial Documents */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
                            <AssessmentIcon sx={{ color: '#006A3B' }} />
                            <Typography variant="subtitle1" fontWeight={900}>
                                Financial Documents
                            </Typography>
                        </Box>

                        <Stack spacing={2} sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F8F9FA', p: 2, borderRadius: 3, border: '1px solid #EBEFE8' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={800}>September 2023 Tax Summary</Typography>
                                    <Typography variant="caption" color="text.secondary">VAT & TOURISM LEVY COMPLIANCE</Typography>
                                </Box>
                                <IconButton onClick={handleExportPDF}><FileDownloadIcon /></IconButton>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F8F9FA', p: 2, borderRadius: 3, border: '1px solid #EBEFE8' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={800}>Vendor Payout History Q3</Typography>
                                    <Typography variant="caption" color="text.secondary">CSV EXPORT - RECONCILIATION READY</Typography>
                                </Box>
                                <IconButton onClick={handleExportCSV}><FileDownloadIcon /></IconButton>
                            </Box>
                        </Stack>

                        <Button 
                            variant="outlined" 
                            fullWidth
                            sx={{ borderStyle: 'dashed', borderRadius: 3, py: 1.5, borderColor: '#BECABE', color: '#181D19', fontWeight: 800, textTransform: 'none' }}
                        >
                            Request Custom Audit Report
                        </Button>
                    </Paper>
                </Grid>

                {/* Emergency Support Hub */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }}>*</Avatar>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={900}>Emergency Support Hub</Typography>
                                    <Typography variant="caption" color="text.secondary">Direct line for financial discrepancies & urgent vendor payouts.</Typography>
                                </Box>
                            </Box>

                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 6 }}>
                                    <Button 
                                        fullWidth 
                                        variant="outlined" 
                                        startIcon={<PhoneInTalkIcon />}
                                        sx={{ borderRadius: 3, py: 1.5, fontWeight: 800, textTransform: 'none', borderColor: '#BECABE', color: '#181D19' }}
                                    >
                                        Direct Support
                                    </Button>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Button 
                                        fullWidth 
                                        variant="outlined" 
                                        startIcon={<ChatBubbleOutlineIcon />}
                                        sx={{ borderRadius: 3, py: 1.5, fontWeight: 800, textTransform: 'none', borderColor: '#BECABE', color: '#181D19' }}
                                    >
                                        Dispute Center
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>

                        <Box sx={{ bgcolor: '#FFF', p: 2, borderRadius: 3, border: '1px solid #EBEFE8', mt: 3 }}>
                            <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1 }}>SYSTEM STATUS</Typography>
                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2E7D32' }} />
                                    <Typography variant="caption" fontWeight={800} color="text.secondary">Payout Processing Engine: Operational</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2E7D32' }} />
                                    <Typography variant="caption" fontWeight={800} color="text.secondary">External Bank API: 12ms Latency</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Paper>
                </Grid>

            </Grid>

            {/* Custom Toast Alert */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Floating Action Button (orange button with ledger-plus icon) */}
            <Tooltip title="Create Payout Request">
                <Button 
                    onClick={() => setSnackbar({ open: true, message: 'Initiating new vendor payout cycle...', severity: 'info' })}
                    sx={{ 
                        position: 'fixed', bottom: 24, right: 24, 
                        width: 56, height: 56, borderRadius: '50%', 
                        bgcolor: '#FF7043', '&:hover': { bgcolor: '#F4511E' },
                        boxShadow: 3, minWidth: 0, color: '#FFF'
                    }}
                >
                    <ReceiptLongIcon />
                </Button>
            </Tooltip>

        </Box>
    );
}
