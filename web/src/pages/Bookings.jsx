import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, Box, Chip } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function Bookings() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "bookings"));
                const bookings = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRows(bookings);
            } catch (error) {
                console.error("Error fetching bookings: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'userName', headerName: 'User', width: 150 },
        { field: 'vendorName', headerName: 'Vendor', width: 150 },
        { field: 'service', headerName: 'Service', width: 150 },
        { field: 'date', headerName: 'Date', width: 150 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                let color = 'default';
                if (params.value === 'confirmed') color = 'success';
                if (params.value === 'pending') color = 'warning';
                if (params.value === 'cancelled') color = 'error';
                return <Chip label={params.value} color={color} variant="outlined" />;
            }
        },
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
                Booking Management
            </Typography>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10]}
                checkboxSelection
                disableSelectionOnClick
                loading={loading}
            />
        </Box>
    );
}

export default Bookings;
