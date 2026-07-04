import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Typography, Box, Chip, Paper, Tooltip, Avatar, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField, Snackbar, Alert, IconButton
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function Users() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            setRows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (id, banned) => {
        try {
            await updateDoc(doc(db, "users", id), { isBanned: banned });
        } catch (error) {
            console.error("Error updating user status: ", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this user?")) {
            try {
                await deleteDoc(doc(db, "users", id));
            } catch (error) {
                console.error("Error deleting user: ", error);
            }
        }
    };

    const handleApproveDriver = async (driverId) => {
        try {
            await updateDoc(doc(db, 'drivers', driverId), {
                status: 'approved',
                approvedAt: serverTimestamp(),
                rejectionReason: '',
            });
            await updateDoc(doc(db, 'users', driverId), {
                role: 'driver_active',
                status: 'approved',
            });
            setSnackbar({ open: true, message: 'Driver approved!', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Error: ' + error.message, severity: 'error' });
        }
    };

    const handleRejectDriver = async () => {
        if (!rejectionReason.trim()) return;
        try {
            await updateDoc(doc(db, 'drivers', selectedDriverId), {
                status: 'rejected',
                rejectionReason: rejectionReason,
                rejectedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', selectedDriverId), {
                role: 'driver_rejected',
                status: 'rejected',
            });
            setSnackbar({ open: true, message: 'Driver rejected.', severity: 'info' });
            setRejectDialogOpen(false);
            setRejectionReason('');
            setSelectedDriverId(null);
        } catch (error) {
            setSnackbar({ open: true, message: 'Error: ' + error.message, severity: 'error' });
        }
    };

    const columns = [
        { field: 'name', headerName: 'User / Business', width: 250, renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: '#e0f2f1', color: '#00695c' }}>
                    <PersonIcon />
                </Avatar>
                <Box>
                    <Typography variant="body2" fontWeight={700}>
                        {params.row.businessName ? `${params.row.businessName} (${params.value})` : (params.value || 'Anonymous')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                        {params.row.email}
                    </Typography>
                    {(params.row.phone || params.row.contact) && (
                        <Typography variant="caption" sx={{ color: '#00695c', fontWeight: 600 }}>
                            {params.row.phone || params.row.contact}
                        </Typography>
                    )}
                </Box>
            </Box>
        )},
        {
            field: 'role',
            headerName: 'System Role',
            width: 150,
            renderCell: (params) => {
                const isAdmin = params.value === 'admin';
                return (
                    <Chip
                        icon={isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                        label={(params.value || 'User').toUpperCase()}
                        color={isAdmin ? 'secondary' : 'primary'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                    />
                );
            }
        },
        { 
            field: 'isBanned', 
            headerName: 'Status', 
            width: 120,
            renderCell: (params) => (
                <Chip 
                    label={params.value ? 'BANNED' : 'ACTIVE'} 
                    color={params.value ? 'error' : 'success'} 
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 800 }}
                />
            )
        },
        { 
            field: 'createdAt', 
            headerName: 'Joined Date', 
            width: 120,
            valueGetter: (value, row) => {
                if (!row.createdAt) return 'N/A';
                const date = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);
                return date.toLocaleDateString();
            }
        },
        {
            field: 'actions',
            headerName: 'Management',
            width: 220,
            sortable: false,
            renderCell: (params) => {
                const isDriverPending = params.row.role === 'driver_pending';
                const isDriverActive = params.row.role === 'driver_active';
                const isDriverRejected = params.row.role === 'driver_rejected';

                if (isDriverPending) {
                    return (
                        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                            <Button size="small" variant="contained" color="success" 
                                onClick={() => handleApproveDriver(params.row.id)}>
                                Approve
                            </Button>
                            <Button size="small" variant="contained" color="error" 
                                onClick={() => { setSelectedDriverId(params.row.id); setRejectDialogOpen(true); }}>
                                Reject
                            </Button>
                        </Stack>
                    );
                }

                if (isDriverActive) {
                    return (
                        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                            <Chip label="Approved" color="success" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                    );
                }

                if (isDriverRejected) {
                    return (
                        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                            <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                    );
                }

                return (
                    <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                        <IconButton
                            onClick={() => handleUpdateStatus(params.id, !params.row.isBanned)}
                            color={params.row.isBanned ? 'success' : 'error'}
                            size="small"
                        >
                            <Tooltip title={params.row.isBanned ? "Unban User" : "Ban User"}><BlockIcon /></Tooltip>
                        </IconButton>
                        <IconButton
                            onClick={() => handleDelete(params.id)}
                            color="inherit"
                            size="small"
                        >
                            <Tooltip title="Delete Account"><DeleteIcon /></Tooltip>
                        </IconButton>
                    </Stack>
                );
            }
        }
    ];

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    User Control Panel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage global user access, monitor account status, and enforce community guidelines.
                </Typography>
            </Box>

            <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    autoHeight
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 10 },
                        },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    disableSelectionOnClick
                    loading={loading}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: '#f8fbfc',
                            borderBottom: '1px solid #eee'
                        }
                    }}
                />
            </Paper>

            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle>Reject Driver Application</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Provide a reason for rejection. The driver will see this message.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rejection Reason"
                        fullWidth
                        multiline
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleRejectDriver}
                        color="error"
                        variant="contained"
                        disabled={!rejectionReason.trim()}
                    >
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>

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

export default Users;
