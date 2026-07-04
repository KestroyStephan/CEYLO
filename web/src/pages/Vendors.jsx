import React, { useState, useEffect } from 'react';
import {
    Grid, Paper, Typography, Box, Chip, Button, 
    TextField, Snackbar, Alert, Stack, Avatar, List,
    Link, Divider
} from '@mui/material';
import {
    collection, query, onSnapshot, orderBy,
    doc, updateDoc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CategoryIcon from '@mui/icons-material/Category';

// Realistic fallback/mock data matching the screenshot
const defaultVendors = [
    {
        id: 'mock-vendor-1',
        businessName: 'Ranatunga Arts',
        businessType: 'Handicrafts & Art',
        description: 'Traditional Sri Lankan handicrafts and hand-woven textiles from the Galle region.',
        email: 'info@ranatungaarts.lk',
        phone: '+94 91 224 4567',
        status: 'pending_verification', // under review
        createdAt: { toDate: () => new Date() },
        nicFrontUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', // mock NIC front
        businessCertUrl: 'https://images.unsplash.com/photo-1588598116174-279585913220', // mock cert
        bankAccount: '**** 9082',
        licenseNumber: 'BR-98421',
        subStatus: 'UNDER REVIEW',
        kycStatus: 'KYC Documents Uploaded'
    },
    {
        id: 'mock-vendor-2',
        businessName: 'Ceylon Spice Co',
        businessType: 'Organic Spices & Teas',
        description: 'Premium organic spices sourced directly from smallholder farms in Kandy and Matale.',
        email: 'sales@ceylonspice.com',
        phone: '+94 81 223 3445',
        status: 'pending_verification', // pending
        createdAt: { toDate: () => new Date() },
        bankAccount: '**** 1124',
        licenseNumber: 'BR-84920',
        subStatus: 'PENDING',
        kycStatus: 'Awaiting initial check'
    },
    {
        id: 'mock-vendor-3',
        businessName: 'Lanka Gems & Jewelry',
        businessType: 'Precious Stones',
        description: 'Ethically mined sapphires, rubies, and handcrafted silver jewelry from Ratnapura.',
        email: 'contact@lankagems.lk',
        phone: '+94 45 222 1234',
        status: 'flagged',
        rejectionReason: 'Mismatch in Tax ID',
        createdAt: { toDate: () => new Date() },
        bankAccount: '**** 5566',
        licenseNumber: 'BR-33211',
        subStatus: 'FLAGGED',
        kycStatus: 'Mismatch in Tax ID'
    },
    {
        id: 'mock-vendor-4',
        businessName: 'Eco-Trek Tours',
        businessType: 'Adventure Travel',
        description: 'Guided hiking, camping, and wildlife safaris in Knuckles and Sinharaja forest reserves.',
        email: 'bookings@ecotrektours.com',
        phone: '+94 77 987 6543',
        status: 'pending_verification',
        createdAt: { toDate: () => new Date() },
        bankAccount: '**** 7788',
        licenseNumber: 'BR-44912',
        subStatus: 'PENDING',
        kycStatus: 'Awaiting initial check'
    }
];

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const q = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseVendors = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    bankAccount: data.bankAccount || '**** ' + Math.floor(1000 + Math.random() * 9000),
                    subStatus: data.status === 'pending_verification' ? 'PENDING' : data.status?.toUpperCase(),
                    kycStatus: data.status === 'pending_verification' ? 'KYC Documents Uploaded' : 'Verification Complete'
                };
            });

            // Merge Firebase vendors with mock data
            let merged = [...firebaseVendors];
            defaultVendors.forEach(mock => {
                if (!merged.some(v => v.id === mock.id || v.businessName === mock.businessName)) {
                    merged.push(mock);
                }
            });

            setVendors(merged);
            setLoading(false);
        }, (error) => {
            console.error('Vendors fetch error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Set first vendor as selected on load
    useEffect(() => {
        if (vendors.length > 0 && !selectedVendor) {
            setSelectedVendor(vendors[0]);
        }
    }, [vendors, selectedVendor]);

    const handleApprove = async () => {
        if (!selectedVendor) return;

        try {
            if (!selectedVendor.id.startsWith('mock-')) {
                await updateDoc(doc(db, 'vendors', selectedVendor.id), {
                    status: 'approved',
                    approvedAt: serverTimestamp(),
                    rejectionReason: '',
                });

                await updateDoc(doc(db, 'users', selectedVendor.id), {
                    role: 'vendor_active',
                    status: 'approved',
                });
            }

            setSnackbar({
                open: true,
                message: `${selectedVendor.businessName} has been approved!`,
                severity: 'success',
            });
            // Update local state copy to immediately reflect change
            setSelectedVendor(prev => ({ ...prev, status: 'approved', subStatus: 'APPROVED' }));
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error approving vendor: ' + error.message,
                severity: 'error',
            });
        }
    };

    const handleReject = async () => {
        if (!selectedVendor) return;
        if (!rejectionReason.trim()) {
            setSnackbar({ open: true, message: 'Please provide a reason for rejection.', severity: 'warning' });
            return;
        }

        try {
            if (!selectedVendor.id.startsWith('mock-')) {
                await updateDoc(doc(db, 'vendors', selectedVendor.id), {
                    status: 'rejected',
                    rejectionReason: rejectionReason,
                    rejectedAt: serverTimestamp(),
                });

                await updateDoc(doc(db, 'users', selectedVendor.id), {
                    role: 'vendor_rejected',
                    status: 'rejected',
                });
            }

            setSnackbar({
                open: true,
                message: `${selectedVendor.businessName} registration rejected.`,
                severity: 'info',
            });
            setSelectedVendor(prev => ({ ...prev, status: 'rejected', subStatus: 'REJECTED', rejectionReason: rejectionReason }));
            setRejectionReason('');
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error rejecting vendor: ' + error.message,
                severity: 'error',
            });
        }
    };

    const pendingCount = vendors.filter(v => v.status === 'pending_verification').length;

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header info */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight={950} color="#006A3B">
                        Partner Verification
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Audit business registrations and verify legal KYC documents for partner sign-ups.
                    </Typography>
                </Box>
                <Chip 
                    label="KYC Compliance" 
                    color="primary" 
                    sx={{ fontWeight: 800, bgcolor: '#006A6A', color: '#FFF' }}
                />
            </Box>

            <Grid container spacing={3}>
                
                {/* Column 1: Vendor Queue List */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" fontWeight={900} color="#181D19" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Vendor Queue 
                            <Chip label={`${pendingCount} Pending`} size="small" sx={{ fontWeight: 800, bgcolor: '#FFEBEB', color: '#BA1A1A' }} />
                        </Typography>

                        <List sx={{ p: 0 }}>
                            {vendors.map((vendor) => {
                                const isSelected = selectedVendor?.id === vendor.id;
                                const isPending = vendor.status === 'pending_verification';
                                const isFlagged = vendor.status === 'flagged';
                                const isApproved = vendor.status === 'approved';

                                // Color definitions matching mockup
                                let statusLabel = "PENDING";
                                let tagBg = "#f5f5f5";
                                let tagColor = "#555";
                                if (isPending) {
                                    statusLabel = vendor.subStatus || "PENDING";
                                    tagBg = isSelected ? '#EBEFE8' : '#FFFDE7';
                                    tagColor = '#735C00';
                                } else if (isFlagged) {
                                    statusLabel = "FLAGGED";
                                    tagBg = '#FFEBEB';
                                    tagColor = '#BA1A1A';
                                } else if (isApproved) {
                                    statusLabel = "APPROVED";
                                    tagBg = '#E8F5E9';
                                    tagColor = '#2E7D32';
                                }

                                return (
                                    <Paper
                                        key={vendor.id}
                                        onClick={() => setSelectedVendor(vendor)}
                                        sx={{
                                            p: 2,
                                            mb: 2,
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                            border: isSelected ? '2px solid #006A3B' : '1px solid #BECABE',
                                            bgcolor: isSelected ? '#EBEFE8' : '#FFF',
                                            boxShadow: 'none',
                                            '&:hover': { border: '2px solid #006A3B' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Chip 
                                                label={statusLabel} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 900, 
                                                    fontSize: '0.65rem',
                                                    color: tagColor, 
                                                    bgcolor: tagBg 
                                                }} 
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                2h ago
                                            </Typography>
                                        </Box>

                                        <Typography variant="body2" fontWeight={800} color="#181D19">
                                            {vendor.businessName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            {vendor.businessType}
                                        </Typography>

                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Box sx={{ width: 6, height: 6, bgcolor: isApproved ? 'success.main' : isFlagged ? 'error.main' : 'warning.main', borderRadius: '50%' }} />
                                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                                                {vendor.kycStatus}
                                            </Typography>
                                        </Stack>
                                    </Paper>
                                );
                            })}
                        </List>
                    </Paper>
                </Grid>

                {/* Column 2: Document Viewers & Verification forms */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', minHeight: 600 }}>
                        {selectedVendor ? (
                            <Stack spacing={3.5}>
                                
                                {/* Top document viewers row */}
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 6 }}>
                                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #BECABE', bgcolor: '#FFF', boxShadow: 'none' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="subtitle2" fontWeight={800} color="#3F4941">
                                                    NIC / Identity Card
                                                </Typography>
                                                {selectedVendor.nicFrontUrl && (
                                                    <Link href={selectedVendor.nicFrontUrl} target="_blank" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', color: '#006A3B' }}>
                                                        <FullscreenIcon fontSize="small" /> Fullscreen
                                                    </Link>
                                                )}
                                            </Box>
                                            <Box sx={{ height: 180, bgcolor: '#f5f5f5', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedVendor.nicFrontUrl ? (
                                                    <img src={selectedVendor.nicFrontUrl} alt="NIC front preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <StoreIcon sx={{ fontSize: 60, color: '#ccc' }} />
                                                )}
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    <Grid size={{ xs: 6 }}>
                                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #BECABE', bgcolor: '#FFF', boxShadow: 'none' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="subtitle2" fontWeight={800} color="#3F4941">
                                                    Business Registration
                                                </Typography>
                                                {selectedVendor.businessCertUrl && (
                                                    <Link href={selectedVendor.businessCertUrl} target="_blank" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', color: '#006A3B' }}>
                                                        <FullscreenIcon fontSize="small" /> Fullscreen
                                                    </Link>
                                                )}
                                            </Box>
                                            <Box sx={{ height: 180, bgcolor: '#f5f5f5', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedVendor.businessCertUrl ? (
                                                    <img src={selectedVendor.businessCertUrl} alt="Registration cert preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <StoreIcon sx={{ fontSize: 60, color: '#ccc' }} />
                                                )}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <Divider />

                                {/* Details & Actions Block */}
                                <Grid container spacing={4}>
                                    
                                    {/* Left: Info details */}
                                    <Grid size={{ xs: 12, md: 7 }}>
                                        <Typography variant="h5" fontWeight={900} color="#181D19" gutterBottom>
                                            {selectedVendor.businessName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            {selectedVendor.description || 'No description uploaded.'}
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 6 }}>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <CategoryIcon fontSize="inherit" /> BUSINESS CATEGORY
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={750} color="#006A3B">
                                                        {selectedVendor.businessType}
                                                    </Typography>
                                                </Stack>
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <Stack spacing={0.5}>
                                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <AccountBalanceIcon fontSize="inherit" /> BANK ACCOUNT (BOC)
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={750} color="#006A3B">
                                                        {selectedVendor.bankAccount}
                                                    </Typography>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    {/* Right: Decision management form */}
                                    <Grid size={{ xs: 12, md: 5 }}>
                                        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #BECABE', bgcolor: '#FFF', boxShadow: 'none' }}>
                                            <Typography variant="caption" fontWeight={900} color="#3F4941" sx={{ display: 'block', mb: 2 }}>
                                                DECISION MANAGEMENT
                                            </Typography>
                                            
                                            <TextField
                                                placeholder="Reason for rejection (Required if rejecting)..."
                                                multiline
                                                rows={3}
                                                fullWidth
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                sx={{ mb: 2.5 }}
                                                inputProps={{ style: { fontSize: '0.85rem' } }}
                                            />

                                            <Stack spacing={1.5}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={handleApprove}
                                                    sx={{ 
                                                        bgcolor: '#006A3B', 
                                                        '&:hover': { bgcolor: '#004D2C' },
                                                        py: 1.5, 
                                                        borderRadius: 2, 
                                                        fontWeight: 800,
                                                        textTransform: 'none'
                                                    }}
                                                >
                                                    Approve Application
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<HighlightOffIcon />}
                                                    onClick={handleReject}
                                                    sx={{ 
                                                        color: '#BA1A1A', 
                                                        borderColor: '#BA1A1A',
                                                        '&:hover': { bgcolor: '#FFEBEE', borderColor: '#BA1A1A' },
                                                        py: 1.5, 
                                                        borderRadius: 2, 
                                                        fontWeight: 800,
                                                        textTransform: 'none'
                                                    }}
                                                >
                                                    Reject Application
                                                </Button>
                                            </Stack>
                                        </Paper>
                                    </Grid>

                                </Grid>

                            </Stack>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center', my: 'auto' }}>
                                <Typography variant="h6" color="text.secondary">
                                    Select a partner application to view files
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
