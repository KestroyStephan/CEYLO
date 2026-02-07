import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, Box, Chip } from '@mui/material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function Users() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const users = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRows(users);
            } catch (error) {
                console.error("Error fetching users: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleRoleChange = async (id, newRole) => {
        const userRef = doc(db, "users", id);
        await updateDoc(userRef, { role: newRole });
        // Update local state
        setRows(rows.map(row => row.id === id ? { ...row, role: newRole } : row));
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        {
            field: 'role',
            headerName: 'Role',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value || 'User'}
                    color={params.value === 'admin' ? 'secondary' : 'primary'}
                    variant={params.value === 'admin' ? 'filled' : 'outlined'}
                />
            )
        },
        { field: 'createdAt', headerName: 'Created At', width: 160 },
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
                User Management
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

export default Users;
