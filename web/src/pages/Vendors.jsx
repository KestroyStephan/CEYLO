import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Snackbar, Alert, Stack, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Drawer, Divider, InputAdornment, Menu, MenuItem, Grid
} from '@mui/material';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import StoreIcon from '@mui/icons-material/Store';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuVendor, setMenuVendor] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const q = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVendors(data);
        });
        return () => unsubscribe();
    }, []);

    const handleMenuClick = (event, vendor) => {
        setAnchorEl(event.currentTarget);
        setMenuVendor(vendor);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuVendor(null);
    };

    const openDrawer = (vendor) => {
        setSelectedVendor(vendor);
        setRejectionReason(vendor.rejectionReason || '');
        setDrawerOpen(true);
        handleMenuClose();
    };

    const handleAction = async (status) => {
        if (!selectedVendor) return;
        if (status === 'rejected' && !rejectionReason.trim()) {
            setSnackbar({ open: true, message: 'Please provide a rejection reason.', severity: 'warning' });
            return;
        }

        try {
            await updateDoc(doc(db, 'vendors', selectedVendor.id), {
                verificationStatus: status,
                status: status, // some fields in the DB might use status instead of verificationStatus
                ...(status === 'rejected' ? { rejectionReason, rejectedAt: serverTimestamp() } : { rejectionReason: '', approvedAt: serverTimestamp() })
            });

            await updateDoc(doc(db, 'users', selectedVendor.id), {
                // A rejected vendor can correct their documents and resubmit from the app
                role: status === 'approved' ? 'vendor_active' : status === 'rejected' ? 'vendor_rejected' : 'vendor_pending',
                status: status
            });

            setSnackbar({ open: true, message: `Vendor ${status} successfully.`, severity: 'success' });
            setDrawerOpen(false);
        } catch (error) {
            setSnackbar({ open: true, message: 'Error processing action.', severity: 'error' });
        }
    };

    const getStatusChip = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s.includes('approve')) return <Chip label="Approved" size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 600 }} />;
        if (s.includes('reject')) return <Chip label="Rejected" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }} />;
        return <Chip label="Pending" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600 }} />;
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.setTextColor(0, 106, 59); // Ceylo Green
            doc.text('Ceylon Tourism - Vendors Registry', 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
            
            const tableColumn = ["Business", "Category", "Email", "Location", "Status"];
            const tableRows = [];

            filteredVendors.forEach(v => {
                const vendorData = [
                    v.businessName || 'Unnamed Vendor',
                    v.businessType || 'General',
                    v.email || '-',
                    v.address || 'Not provided',
                    v.verificationStatus || v.status || 'Pending'
                ];
                tableRows.push(vendorData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [0, 106, 59] }
            });

            doc.save('Ceylon_Tourism_Vendors_Registry.pdf');
            setSnackbar({ open: true, message: 'Registry exported as PDF successfully!', severity: 'success' });
        } catch (err) {
            console.error("Export failed:", err);
            setSnackbar({ open: true, message: 'Failed to generate PDF.', severity: 'error' });
        }
    };

    const pendingVendorsCount = vendors.filter(v => v.verificationStatus === 'pending' || v.status === 'pending').length;
    const activeVendorsCount = vendors.filter(v => v.verificationStatus === 'approved' || v.status === 'approved').length;

    const filteredVendors = vendors.filter(v => {
        const status = v.verificationStatus || v.status || 'pending';
        const matchesStatus = filterStatus === 'All' || status.toLowerCase().includes(filterStatus.toLowerCase());
        const matchesSearch = (v.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (v.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            {/* Header segment */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#006A3B" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        CMS: Vendors Registry
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Supervise, verify, and monitor business partners across the island.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                        variant="outlined" 
                        onClick={handleExportPDF}
                        startIcon={<FileDownloadIcon />} 
                        sx={{ color: '#006A3B', borderColor: '#006A3B', fontWeight: 800, borderRadius: 8, px: 3, py: 1, textTransform: 'none' }}
                    >
                        Export Registry
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 8, px: 3, py: 1, textTransform: 'none' }}
                    >
                        Add Vendor
                    </Button>
                </Box>
            </Box>

            {/* KPI Banners */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary">TOTAL ACTIVE VENDORS</Typography>
                        <Typography variant="h4" fontWeight={950} color="#006A3B">{activeVendorsCount}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={750}>Verified Businesses</Typography>
                    </Paper>
                </Grid>
                
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #FFCDD2', bgcolor: '#FFF5F5', boxShadow: 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="caption" fontWeight={900} color="#BA1A1A">NEW APPLICATIONS</Typography>
                                <Typography variant="h4" fontWeight={950} color="#BA1A1A">{pendingVendorsCount}</Typography>
                                <Typography variant="caption" color="#BA1A1A" fontWeight={750}>Awaiting Verification</Typography>
                            </Box>
                            <ErrorOutlineIcon sx={{ color: '#BA1A1A' }} />
                        </Box>
                    </Paper>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%', display: 'flex', alignItems: 'center' }}>
                         <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontStyle: 'italic' }}>
                            "Partner verification is essential for maintaining trust. Ensure all provided documents (business registration, IDs) are thoroughly reviewed within 48 hours."
                         </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Premium Controls Toolbar */}
            <Paper sx={{ mb: 3, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', bgcolor: '#FFF' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                        <FilterListIcon sx={{ color: '#006A3B' }} />
                        <Typography variant="body2" fontWeight={900} color="#006A3B">FILTERS</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    <TextField
                        select
                        size="small"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    >
                        <MenuItem value="All" sx={{ fontWeight: 700 }}>All Statuses</MenuItem>
                        <MenuItem value="Approved" sx={{ fontWeight: 700, color: '#006A3B' }}>Approved</MenuItem>
                        <MenuItem value="Pending" sx={{ fontWeight: 700, color: '#BA1A1A' }}>Pending</MenuItem>
                        <MenuItem value="Rejected" sx={{ fontWeight: 700, color: '#777' }}>Rejected</MenuItem>
                    </TextField>
                </Box>
                <TextField 
                    placeholder="Search businesses, emails..." 
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                />
            </Paper>

            {/* High Density Table */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>BUSINESS</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>CATEGORY</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>EMAIL</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>LOCATION</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>STATUS</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#3F4941' }}>ACTIONS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredVendors.map((v) => (
                                        <TableRow key={v.id} hover onClick={() => openDrawer(v)} sx={{ cursor: 'pointer' }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0f2f1', color: '#004d40' }}><StoreIcon fontSize="small" /></Avatar>
                                                    <Typography variant="body2" fontWeight={800} color="#0F172A">
                                                        {v.businessName || 'Unnamed Vendor'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary" fontWeight={600}>{v.businessType || 'General'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{v.email}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{v.address || 'Not provided'}</Typography></TableCell>
                                            <TableCell>{getStatusChip(v.verificationStatus || v.status)}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuClick(e, v); }}>
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* 3-Dot Action Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} elevation={2} PaperProps={{ sx: { minWidth: 150, borderRadius: 2, border: '1px solid #E2E8F0' } }}>
                <MenuItem onClick={() => openDrawer(menuVendor)} sx={{ fontSize: '0.8125rem' }}>View Details</MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem sx={{ fontSize: '0.8125rem', color: 'error.main' }}>Suspend Vendor</MenuItem>
            </Menu>

            {/* Sliding Detail Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 450 } } }}>
                {selectedVendor && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        
                        {/* Drawer Header */}
                        <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h5" fontWeight={700} color="#0F172A">{selectedVendor.businessName}</Typography>
                                <Typography variant="body2" color="text.secondary">{selectedVendor.email}</Typography>
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
                        </Box>

                        {/* Drawer Content */}
                        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                            
                            {/* Status Banner */}
                            <Box sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8F9FA', display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getStatusChip(selectedVendor.verificationStatus || selectedVendor.status)}
                                <Typography variant="caption" color="text.secondary">
                                    Submitted: {selectedVendor.createdAt?.toDate ? selectedVendor.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                </Typography>
                            </Box>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Details</Typography>
                            
                            <Stack spacing={2} sx={{ mb: 4 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Business Type</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedVendor.businessType}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Phone</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedVendor.phone}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Address</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedVendor.address}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Bank Account</Typography>
                                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{selectedVendor.bankAccount || '**** **** ****'}</Typography>
                                </Box>
                            </Stack>

                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KYC Documents</Typography>
                            <Button variant="outlined" fullWidth startIcon={<DescriptionIcon />} sx={{ justifyContent: 'flex-start', mb: 1, color: '#0F172A', borderColor: '#E2E8F0' }}>
                                Business_Registration.pdf
                            </Button>
                            <Button variant="outlined" fullWidth startIcon={<DescriptionIcon />} sx={{ justifyContent: 'flex-start', mb: 3, color: '#0F172A', borderColor: '#E2E8F0' }}>
                                Owner_ID.jpg
                            </Button>

                            {/* Rejection Field */}
                            {(selectedVendor.verificationStatus === 'pending' || selectedVendor.status === 'pending_verification') && (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Rejection Reason (if applicable)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                            )}
                        </Box>

                        {/* Drawer Actions */}
                        <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 2, bgcolor: '#F8F9FA' }}>
                            {(selectedVendor.verificationStatus === 'pending' || selectedVendor.status === 'pending_verification') ? (
                                <>
                                    <Button variant="outlined" color="error" fullWidth onClick={() => handleAction('rejected')}>Reject</Button>
                                    <Button variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }} fullWidth onClick={() => handleAction('approved')}>Approve</Button>
                                </>
                            ) : (
                                <Button variant="outlined" fullWidth onClick={() => setDrawerOpen(false)} sx={{ color: '#0F172A', borderColor: '#E2E8F0' }}>Close</Button>
                            )}
                        </Box>

                    </Box>
                )}
            </Drawer>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
