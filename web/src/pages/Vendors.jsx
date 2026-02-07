import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Typography, Box, Badge } from '@mui/material';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function Vendors() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "vendors"));
                const vendors = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRows(vendors);
            } catch (error) {
                console.error("Error fetching vendors: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "vendors", id));
            setRows(rows.filter(row => row.id !== id));
        } catch (error) {
            console.error("Error deleting vendor: ", error);
        }
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'service', headerName: 'Service', width: 120 },
        {
            field: 'status', headerName: 'Status', width: 120, renderCell: params => (
                <Badge color="success" bg='green'>
                    {params.value || 'Pending'}
                </Badge>
            )
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: ({ id }) => {
                return [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        className="textPrimary"
                        onClick={() => console.log('Edit', id)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={() => handleDelete(id)}
                        color="inherit"
                    />,
                ];
            },
        }
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
                Vendor Management
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

export default Vendors;
