import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Stack } from '@mui/material';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const COLORS = ['#00695c', '#ef6c00', '#2e7d32', '#d32f2f'];

function Analytics() {
    const [flowData, setFlowData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [ecoRate, setEcoRate] = useState(0);

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            let totalScore = 0;
            let validScores = 0;
            
            // Map for flow data (by day of week)
            const days = { 'Mon': { locals: 0, tourists: 0 }, 'Tue': { locals: 0, tourists: 0 }, 'Wed': { locals: 0, tourists: 0 }, 'Thu': { locals: 0, tourists: 0 }, 'Fri': { locals: 0, tourists: 0 }, 'Sat': { locals: 0, tourists: 0 }, 'Sun': { locals: 0, tourists: 0 } };

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.ecoScore) {
                    totalScore += Number(data.ecoScore);
                    validScores++;
                }

                if (data.createdAt) {
                    const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    if (days[dayName]) {
                        if (data.role === 'tourist') days[dayName].tourists++;
                        else days[dayName].locals++;
                    }
                }
            });

            if (validScores > 0) setEcoRate((totalScore / validScores).toFixed(1));
            
            const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            setFlowData(orderedDays.map(d => ({ name: d, locals: days[d].locals, tourists: days[d].tourists })));
        });

        const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            let spots = 0;
            let events = 0;
            let tours = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const price = parseFloat(data.price) || parseFloat(data.cost) || 0;
                const service = (data.service || data.serviceName || '').toLowerCase();
                
                if (service.includes('event') || service.includes('festival')) events += price;
                else if (service.includes('tour') || service.includes('safari')) tours += price;
                else spots += price;
            });
            
            setPieData([
                { name: 'Eco Spots', value: spots },
                { name: 'Events', value: events },
                { name: 'Tours', value: tours }
            ]);
        });

        return () => {
            unsubUsers();
            unsubBookings();
        };
    }, []);

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Analytics</Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 1.25 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Weekly Tourist Flow</Typography>
                        <Box sx={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={flowData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="tourists" stackId="1" stroke="#00695c" fill="#00695c" fillOpacity={0.6} />
                                    <Area type="monotone" dataKey="locals" stackId="1" stroke="#ef6c00" fill="#ef6c00" fillOpacity={0.6} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <Card sx={{ borderRadius: 1.25, bgcolor: '#e0f2f1' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={600} color="#00695c">ECO ADOPTION RATE</Typography>
                                    <Typography variant="h3" fontWeight={600} sx={{ my: 1 }}>{ecoRate}%</Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TrendingUpIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Average eco score across travellers
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, borderRadius: 1.25, height: '100%' }}>
                                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Category Revenue</Typography>
                                <Box sx={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {COLORS.map((color, index) => (
                                                    <Cell key={`cell-${index}`} fill={color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
                                    {['Spots', 'Events', 'Tours'].map((label, idx) => (
                                        <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[idx], mr: 1 }} />
                                            <Typography variant="caption">{label}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Analytics;
