import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Typography, Box, Chip, Paper, IconButton, Tooltip, Stack, Avatar } from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import StoreIcon from '@mui/icons-material/Store';

function Vendors() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all users and filter for service providers in JS for better matching
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filteredVendors = allUsers.filter(user => {
                const r = (user.role || '').toLowerCase();
                return r.includes('vendor') || 
                       r.includes('accommodation') || 
                       r.includes('tour_provider') || 
                       r.includes('driver') || 
                       r.includes('guide');
            });
            setRows(filteredVendors);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching vendors: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            // Update the document in the 'users' collection
            await updateDoc(doc(db, "users", id), { 
                status: status,
                // If approving, we might want to ensure their role reflects an active vendor
                role: status === 'approved' ? 'vendor' : undefined 
            });
        } catch (error) {
            console.error("Error updating vendor status: ", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this partner?")) {
            try {
                // Delete the document from the 'users' collection
                await deleteDoc(doc(db, "users", id));
            } catch (error) {
                console.error("Error deleting vendor: ", error);
            }
        }
    };

    const columns = [
        { field: 'businessName', headerName: 'Business / Owner', width: 250, renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                <Avatar sx={{ bgcolor: '#e0f2f1', color: '#00695c', mr: 2 }}>
                    <StoreIcon />
                </Avatar>
                <Box>
                    <Typography variant="body2" fontWeight={700}>{params.value || 'Unnamed Business'}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Owner: {params.row.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#00695c', fontWeight: 600 }}>
                        {params.row.contact}
                    </Typography>
                </Box>
            </Box>
        )},
        { field: 'email', headerName: 'Email Address', width: 220 },
        { field: 'category', headerName: 'Category', width: 150, 
            valueGetter: (value, row) => row.category || row.service || row.role || 'Partner',
            renderCell: (params) => (
                <Chip label={(params.value).toUpperCase()} size="small" variant="outlined" />
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 150,
            renderCell: (params) => {
                const status = params.value || 'pending';
                const colors = {
                    approved: 'success',
                    pending: 'warning',
                    rejected: 'error'
                };
                return (
                    <Chip 
                        label={status.toUpperCase()} 
                        color={colors[status] || 'default'} 
                        size="small" 
                        sx={{ fontWeight: 700 }}
                    />
                );
            }
        },
        {
            field: 'performance',
            headerName: 'Eco Score',
            width: 120,
            valueGetter: (value, row) => row.ecoScore || 0,
            renderCell: (params) => (
                <Typography color={params.value > 80 ? 'success.main' : 'warning.main'} fontWeight={700}>
                    {params.value}%
                </Typography>
            )
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Review Actions',
            width: 180,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<Tooltip title="Approve Application"><CheckCircleIcon /></Tooltip>}
                    label="Approve"
                    onClick={() => handleUpdateStatus(params.id, 'approved')}
                    disabled={params.row.status === 'approved'}
                    color="success"
                />,
                <GridActionsCellItem
                    icon={<Tooltip title="Reject Application"><CancelIcon /></Tooltip>}
                    label="Reject"
                    onClick={() => handleUpdateStatus(params.id, 'rejected')}
                    disabled={params.row.status === 'rejected'}
                    color="error"
                />,
                <GridActionsCellItem
                    icon={<Tooltip title="Remove Vendor"><DeleteIcon /></Tooltip>}
                    label="Delete"
                    onClick={() => handleDelete(params.id)}
                    color="inherit"
                />,
            ],
        }
    ];

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Vendor Partner Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Review service provider applications and monitor sustainability compliance scores.
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
                        },
                        '& .MuiDataGrid-row:hover': {
                            bgcolor: '#f5f5f5'
                        }
                    }}
                />
            </Paper>
        </Box>
    );
}

export default Vendors;
