import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Typography, Box, Badge, IconButton, Tooltip } from '@mui/material';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';

function SOSAlerts() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time updates for SOS alerts are crucial
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "sos_alerts"), (snapshot) => {
            const alerts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by status (active first) and timestamp (newest first)
            alerts.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return b.timestamp?.seconds - a.timestamp?.seconds;
            });
            setRows(alerts);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to SOS alerts: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleResolve = async (id) => {
        try {
            await updateDoc(doc(db, "sos_alerts", id), { status: 'resolved' });
        } catch (error) {
            console.error("Error resolving alert: ", error);
        }
    };

    const openMap = (location) => {
        if (location && location.latitude && location.longitude) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`, '_blank');
        } else {
            alert("Location data missing");
        }
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'userName', headerName: 'User', width: 150 },
        { field: 'phone', headerName: 'Phone', width: 150 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Badge
                    color={params.value === 'active' ? 'error' : 'success'}
                    badgeContent={params.value === 'active' ? '!' : null}
                    sx={{ '& .MuiBadge-badge': { right: -15, top: 10 } }}
                >
                    <Box sx={{ color: params.value === 'active' ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                        {params.value ? params.value.toUpperCase() : 'UNKNOWN'}
                    </Box>
                </Badge>
            )
        },
        {
            field: 'timestamp',
            headerName: 'Time',
            width: 200,
            valueGetter: (params) => {
                if (!params.row.timestamp) return '';
                // Handle Firestore Timestamp or standard Date
                const date = params.row.timestamp.toDate ? params.row.timestamp.toDate() : new Date(params.row.timestamp);
                return date.toLocaleString();
            }
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 150,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<Tooltip title="View Location"><MapIcon /></Tooltip>}
                    label="Location"
                    onClick={() => openMap(params.row.location)}
                    color="primary"
                />,
                <GridActionsCellItem
                    icon={<Tooltip title="Mark Resolved"><CheckCircleIcon /></Tooltip>}
                    label="Resolve"
                    onClick={() => handleResolve(params.id)}
                    showInMenu={false}
                    disabled={params.row.status === 'resolved'}
                    color="success"
                />,
            ],
        }
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2, fontWeight: 'bold', color: '#d32f2f' }}>
                SOS Alerts Monitoring
            </Typography>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10]}
                disableSelectionOnClick
                loading={loading}
                sx={{
                    '& .MuiDataGrid-row.active-alert': {
                        bgcolor: '#ffebee',
                    }
                }}
                getRowClassName={(params) => `alert-row-${params.row.status}`}
            />
        </Box>
    );
}

export default SOSAlerts;
