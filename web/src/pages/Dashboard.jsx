import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, Divider, Chip } from '@mui/material';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GrassIcon from '@mui/icons-material/Grass';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const data = [
    { name: 'Jan', adoption: 4000, targets: 2400 },
    { name: 'Feb', adoption: 3000, targets: 1398 },
    { name: 'Mar', adoption: 2000, targets: 9800 },
    { name: 'Apr', adoption: 2780, targets: 3908 },
    { name: 'May', adoption: 1890, targets: 4800 },
    { name: 'Jun', adoption: 2390, targets: 3800 },
    { name: 'Jul', adoption: 3490, targets: 4300 },
];

const ecoData = [
    { name: 'Low', value: 400, color: '#ff7043' },
    { name: 'Medium', value: 300, color: '#ffb74d' },
    { name: 'High', value: 300, color: '#81c784' },
    { name: 'Perfect', value: 200, color: '#4caf50' },
];

import { useTranslation } from 'react-i18next';

function Dashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        users: 0,
        vendors: 0,
        bookings: 0,
        sos: 0
    });

    useEffect(() => {
        async function fetchStats() {
            try {
                const [usersSnap, vendorsSnap, bookingsSnap, sosSnap] = await Promise.all([
                    getCountFromServer(collection(db, "users")),
                    getCountFromServer(collection(db, "vendors")),
                    getCountFromServer(collection(db, "bookings")),
                    getCountFromServer(collection(db, "sos_alerts"))
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

    const StatCard = ({ title, value, icon, color, trend }) => (
        <Card sx={{ height: '100%', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                {React.cloneElement(icon, { sx: { fontSize: 80, color } })}
            </Box>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: `${color}15`, p: 1, borderRadius: 2, display: 'flex', mr: 2 }}>
                        {React.cloneElement(icon, { sx: { color } })}
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                        {title}
                    </Typography>
                </Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    {value.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'success.main', fontWeight: 700 }}>
                    <TrendingUpIcon sx={{ fontSize: 14, mr: 0.5 }} /> {trend} since last month
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#37474f">
                        Real-Time Monitor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('welcome')}
                    </Typography>
                </Box>
                <Chip 
                    label="System Live" 
                    color="success" 
                    variant="outlined" 
                    icon={<Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%', mr: 1 }} />}
                    sx={{ fontWeight: 700 }}
                />
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Active Users" 
                        value={stats.users} 
                        icon={<PeopleIcon />} 
                        color="#00695c" 
                        trend="+12%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Registered Vendors" 
                        value={stats.vendors} 
                        icon={<GrassIcon />} 
                        color="#ef6c00" 
                        trend="+5%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Success Bookings" 
                        value={stats.bookings} 
                        icon={<TrendingUpIcon />} 
                        color="#2e7d32" 
                        trend="+18%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Urgent SOS" 
                        value={stats.sos} 
                        icon={<WarningAmberIcon />} 
                        color="#d32f2f" 
                        trend="-2%"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, borderRadius: 4 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                            Sustainability Adoption Trends
                        </Typography>
                        <Box sx={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorAdoption" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00695c" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#00695c" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="adoption" stroke="#00695c" fillOpacity={1} fill="url(#colorAdoption)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                            Eco Score Distribution
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ecoData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {ecoData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="text.secondary">
                            Last synchronization: {new Date().toLocaleTimeString()}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Dashboard;
