import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function Dashboard() {
    const [stats, setStats] = useState({
        users: 0,
        vendors: 0,
        bookings: 0,
        sos: 0
    });

    useEffect(() => {
        async function fetchStats() {
            try {
                // Note: getCountFromServer is efficient for counting
                // Ensure you have these collections in Firestore or this will return 0
                const usersColl = collection(db, "users");
                const vendorsColl = collection(db, "vendors");
                const bookingsColl = collection(db, "bookings");
                const sosColl = collection(db, "sos_alerts");

                const [usersSnap, vendorsSnap, bookingsSnap, sosSnap] = await Promise.all([
                    getCountFromServer(usersColl),
                    getCountFromServer(vendorsColl),
                    getCountFromServer(bookingsColl),
                    getCountFromServer(sosColl)
                ]);

                setStats({
                    users: usersSnap.data().count,
                    vendors: vendorsSnap.data().count,
                    bookings: bookingsSnap.data().count,
                    sos: sosSnap.data().count
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        }

        fetchStats();
    }, []);

    const StatCard = ({ title, value, color }) => (
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
            <Typography component="h2" variant="h6" color={color} gutterBottom>
                {title}
            </Typography>
            <Typography component="p" variant="h3">
                {value}
            </Typography>
        </Paper>
    );

    return (
        <Box>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4, fontWeight: 'bold', color: '#00695c' }}>
                Dashboard
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <StatCard title="Total Users" value={stats.users} color="primary" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Active Vendors" value={stats.vendors} color="secondary" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="Total Bookings" value={stats.bookings} color="success.main" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard title="SOS Alerts" value={stats.sos} color="error" />
                </Grid>
            </Grid>
        </Box>
    );
}

export default Dashboard;
