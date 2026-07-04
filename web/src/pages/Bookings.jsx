import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { 
    Typography, Box, Chip, Paper, Grid, Card, CardContent, 
    Tabs, Tab, Stack, IconButton, Tooltip, Snackbar, Alert 
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';

function Bookings() {
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRows(bookings);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to bookings: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (tab === 'all') {
            setFilteredRows(rows);
        } else {
            setFilteredRows(rows.filter(row => row.status === tab));
        }
    }, [rows, tab]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "bookings", id), { status: newStatus });
            setSnackbar({
                open: true,
                message: `Booking status updated to ${newStatus}!`,
                severity: 'success'
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Failed to update status: ' + error.message,
                severity: 'error'
            });
        }
    };

    const columns = [
        { field: 'id', headerName: 'Booking ID', width: 220 },
        { field: 'userName', headerName: 'Tourist Name', width: 180, renderCell: (params) => (
            <Typography variant="body2" fontWeight={600}>{params.value || 'Tourist'}</Typography>
        )},
        { field: 'vendorName', headerName: 'Vendor / Partner', width: 180 },
        { field: 'service', headerName: 'Service Reserved', width: 200, valueGetter: (value, row) => row.service || row.serviceName || 'Standard Service' },
        { 
            field: 'date', 
            headerName: 'Booking Date', 
            width: 150,
            valueGetter: (value, row) => {
                if (!row.date) return 'N/A';
                if (row.date.toDate) return row.date.toDate().toLocaleDateString();
                return new Date(row.date).toLocaleDateString();
            }
        },
        {
            field: 'price',
            headerName: 'Price (LKR)',
            width: 130,
            valueGetter: (value, row) => {
                const p = row.price || row.cost || 0;
                return p.toLocaleString();
            },
            renderCell: (params) => (
                <Typography variant="body2" fontWeight={700} color="#00695c">{params.value}</Typography>
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => {
                let color = 'default';
                let label = params.value ? params.value.toUpperCase() : 'PENDING';
                if (params.value === 'confirmed') color = 'success';
                if (params.value === 'pending') color = 'warning';
                if (params.value === 'cancelled') color = 'error';
                return <Chip label={label} color={color} size="small" sx={{ fontWeight: 800 }} />;
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                    {params.row.status !== 'confirmed' && (
                        <Tooltip title="Approve Booking">
                            <IconButton 
                                color="success" 
                                size="small" 
                                onClick={() => handleUpdateStatus(params.row.id, 'confirmed')}
                            >
                                <CheckCircleIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {params.row.status !== 'cancelled' && (
                        <Tooltip title="Cancel Booking">
                            <IconButton 
                                color="error" 
                                size="small" 
                                onClick={() => handleUpdateStatus(params.row.id, 'cancelled')}
                            >
                                <CancelIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )
        }
    ];

    // Compute Metrics
    const totalBookings = rows.length;
    const pendingBookings = rows.filter(r => r.status === 'pending' || !r.status).length;
    const confirmedBookings = rows.filter(r => r.status === 'confirmed').length;
    const totalRevenue = rows
        .filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + (parseFloat(r.price) || parseFloat(r.cost) || 0), 0);

    const StatCard = ({ title, value, icon, color }) => (
        <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={900}>
                        {value}
                    </Typography>
                </Box>
                <Box sx={{ bgcolor: `${color}15`, p: 2, borderRadius: 3, display: 'flex', color }}>
                    {icon}
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Booking Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Review and verify tourist reservations across accommodation, transport, and guide service providers.
                </Typography>
            </Box>

            {/* Metrics cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title="Total Reservations" 
                        value={totalBookings.toLocaleString()} 
                        icon={<BookOnlineIcon fontSize="large" />} 
                        color="#00695c" 
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title="Awaiting Review" 
                        value={pendingBookings.toLocaleString()} 
                        icon={<PendingActionsIcon fontSize="large" />} 
                        color="#ef6c00" 
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title="Confirmed Orders" 
                        value={confirmedBookings.toLocaleString()} 
                        icon={<CheckCircleOutlineIcon fontSize="large" />} 
                        color="#2e7d32" 
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title="Total Revenue (LKR)" 
                        value={`Rs. ${totalRevenue.toLocaleString()}`} 
                        icon={<BlockIcon fontSize="large" sx={{ transform: 'rotate(135deg)' }} />} 
                        color="#0288d1" 
                    />
                </Grid>
            </Grid>

            {/* Table layout */}
            <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <Tabs 
                    value={tab} 
                    onChange={(e, val) => setTab(val)} 
                    sx={{ bgcolor: '#f8fbfc', borderBottom: '1px solid #eee', px: 2 }}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="All Bookings" value="all" sx={{ fontWeight: 700 }} />
                    <Tab label="Pending" value="pending" sx={{ fontWeight: 700 }} />
                    <Tab label="Confirmed" value="confirmed" sx={{ fontWeight: 700 }} />
                    <Tab label="Cancelled" value="cancelled" sx={{ fontWeight: 700 }} />
                </Tabs>
                
                <Box sx={{ p: 2 }}>
                    <DataGrid
                        rows={filteredRows}
                        columns={columns}
                        autoHeight
                        initialState={{
                            pagination: {
                                paginationModel: { pageSize: 10 },
                            },
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        loading={loading}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': {
                                bgcolor: '#f8fbfc',
                                borderBottom: '1px solid #eee'
                            }
                        }}
                    />
                </Box>
            </Paper>

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

export default Bookings;
