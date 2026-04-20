import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Typography, Box, Chip, Paper, IconButton, Tooltip, Stack } from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
        const unsubscribe = onSnapshot(collection(db, "vendors"), (snapshot) => {
            setRows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            await updateDoc(doc(db, "vendors", id), { status });
        } catch (error) {
            console.error("Error updating vendor status: ", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this vendor?")) {
            try {
                await deleteDoc(doc(db, "vendors", id));
            } catch (error) {
                console.error("Error deleting vendor: ", error);
            }
        }
    };

    const columns = [
        { field: 'name', headerName: 'Vendor Name', width: 200, renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StoreIcon sx={{ mr: 1, color: '#00695c' }} />
                <Typography fontWeight={600}>{params.value}</Typography>
            </Box>
        )},
        { field: 'email', headerName: 'Email Address', width: 220 },
        { field: 'service', headerName: 'Category', width: 150, renderCell: (params) => (
            <Chip label={params.value || 'General'} size="small" variant="outlined" />
        )},
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
            valueGetter: (params) => params.row.ecoScore || 0,
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
                    pageSize={10}
                    rowsPerPageOptions={[10]}
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
