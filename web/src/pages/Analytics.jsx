import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Stack } from '@mui/material';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const flowData = [
    { name: 'Mon', locals: 400, tourists: 240 },
    { name: 'Tue', locals: 300, tourists: 139 },
    { name: 'Wed', locals: 200, tourists: 980 },
    { name: 'Thu', locals: 278, tourists: 390 },
    { name: 'Fri', locals: 189, tourists: 480 },
    { name: 'Sat', locals: 239, tourists: 380 },
    { name: 'Sun', locals: 349, tourists: 430 },
];

const COLORS = ['#00695c', '#ef6c00', '#2e7d32', '#d32f2f'];

function Analytics() {
    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Advanced Platform Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    In-depth analysis of tourist behavior, eco-adoption rates, and vendor performance metrics.
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, borderRadius: 4 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Weekly Tourist Flow</Typography>
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
                <Grid item xs={12} lg={4}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Card sx={{ borderRadius: 4, bgcolor: '#e0f2f1' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={800} color="#00695c">ECO ADOPTION RATE</Typography>
                                    <Typography variant="h3" fontWeight={900} sx={{ my: 1 }}>74.2%</Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TrendingUpIcon fontSize="inherit" sx={{ mr: 0.5 }} /> +8.4% from last period
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Category Revenue</Typography>
                                <Box sx={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Eco Spots', value: 400 },
                                                    { name: 'Events', value: 300 },
                                                    { name: 'Tours', value: 300 },
                                                ]}
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
