import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Snackbar, Alert, Stack, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Drawer, Divider, InputAdornment, Menu, MenuItem
} from '@mui/material';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import StoreIcon from '@mui/icons-material/Store';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuVendor, setMenuVendor] = useState(null);

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
                role: status === 'approved' ? 'vendor_active' : 'vendor_pending',
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

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="#0F172A">Vendors</Typography>
                <Button variant="contained" sx={{ bgcolor: '#0F172A', color: '#FFF' }}>+ Add Vendor</Button>
            </Box>

            {/* Filter Bar */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    placeholder="Search vendors..."
                    size="small"
                    sx={{ width: 300, bgcolor: '#FFF' }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    }}
                />
                <Button variant="outlined" size="small" sx={{ borderColor: '#E2E8F0', color: '#64748B' }}>Filter by Status</Button>
            </Box>

            {/* High Density Table */}
            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Business</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vendors.map((v) => (
                                <TableRow key={v.id} hover onClick={() => openDrawer(v)} sx={{ cursor: 'pointer' }}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#F1F5F9', color: '#64748B' }}><StoreIcon fontSize="small" /></Avatar>
                                            <Typography variant="body2" fontWeight={600} color="#0F172A">
                                                {v.businessName || 'Unnamed Vendor'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{v.businessType || 'General'}</Typography></TableCell>
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
