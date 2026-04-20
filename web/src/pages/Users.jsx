import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Typography, Box, Chip, Paper, Tooltip, Avatar } from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function Users() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            setRows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    const columns = [
        { field: 'name', headerName: 'User', width: 220, renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: '#e0f2f1', color: '#00695c' }}>
                    <PersonIcon fontSize="small" />
                </Avatar>
                <Box>
                    <Typography variant="body2" fontWeight={700}>{params.value || 'Anonymous'}</Typography>
                    <Typography variant="caption" color="text.secondary">{params.row.email}</Typography>
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
            width: 180,
            valueGetter: (params) => {
                if (!params.row.createdAt) return 'N/A';
                const date = params.row.createdAt.toDate ? params.row.createdAt.toDate() : new Date(params.row.createdAt);
                return date.toLocaleDateString();
            }
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Management',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<Tooltip title={params.row.isBanned ? "Unban User" : "Ban User"}><BlockIcon /></Tooltip>}
                    label="Toggle Ban"
                    onClick={() => handleUpdateStatus(params.id, !params.row.isBanned)}
                    color={params.row.isBanned ? 'success' : 'error'}
                />,
                <GridActionsCellItem
                    icon={<Tooltip title="Delete Account"><DeleteIcon /></Tooltip>}
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
                    pageSize={10}
                    rowsPerPageOptions={[10]}
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
        </Box>
    );
}

export default Users;
