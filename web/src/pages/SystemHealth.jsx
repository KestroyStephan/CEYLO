import React from 'react';
import { 
    Box, Typography, Grid, Paper, LinearProgress, 
    Stack, Chip, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanIcon from '@mui/icons-material/Lan';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';

const HealthMetric = ({ label, value, status, icon }) => (
    <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f0f4f8', color: '#00695c', mr: 2 }}>
                {icon}
            </Box>
            <Typography variant="body2" fontWeight={700} color="text.secondary">{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{value}</Typography>
        <Chip 
            label={status.toUpperCase()} 
            size="small" 
            color={status === 'operational' ? 'success' : 'warning'} 
            sx={{ fontWeight: 700, fontSize: '0.6rem' }} 
        />
        <Box sx={{ mt: 2 }}>
            <LinearProgress 
                variant="determinate" 
                value={status === 'operational' ? 95 : 40} 
                sx={{ height: 4, borderRadius: 1, bgcolor: '#eee' }} 
            />
        </Box>
    </Paper>
);

function SystemHealth() {
    const services = [
        { name: 'Firebase Alpha (Auth/DB)', status: 'operational', version: 'v12.9.0' },
        { name: 'SOS Real-time WebSocket', status: 'operational', version: 'v2.4.1' },
        { name: 'Google Maps API Core', status: 'operational', version: 'v3.54' },
        { name: 'AI Analysis Engine', status: 'performance_degrade', version: 'v1.0.5-beta' },
        { name: 'Notification Service', status: 'operational', version: 'v3.0.0' },
    ];

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Platform System Health
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Monitor global service status, API latencies, and backend infrastructure performance.
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <HealthMetric label="Global Uptime" value="99.982%" status="operational" icon={<SpeedIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <HealthMetric label="DB Latency" value="24ms" status="operational" icon={<StorageIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <HealthMetric label="API Success" value="99.99%" status="operational" icon={<LanIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <HealthMetric label="Inference Time" value="482ms" status="performance_degrade" icon={<CloudQueueIcon />} />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ px: 3, py: 2, bgcolor: '#f8fbfc', borderBottom: '1px solid #eee' }}>
                            <Typography variant="subtitle1" fontWeight={800}>Microservices Status</Typography>
                        </Box>
                        <List sx={{ p: 0 }}>
                            {services.map((service, idx) => (
                                <ListItem key={idx} sx={{ px: 3, py: 2, borderBottom: idx < services.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                    <ListItemIcon sx={{ minWidth: 40, color: service.status === 'operational' ? 'success.main' : 'warning.main' }}>
                                        <CheckCircleIcon />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={<Typography fontWeight={600}>{service.name}</Typography>}
                                        secondary={service.version}
                                    />
                                    <Chip 
                                        label={service.status === 'operational' ? 'ACTIVE' : 'DEGRADED'} 
                                        size="small" 
                                        color={service.status === 'operational' ? 'success' : 'warning'} 
                                        variant="outlined"
                                        sx={{ fontWeight: 800 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#00695c', color: '#fff' }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <SecurityIcon sx={{ mr: 1 }} /> Security Hardening
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>Firewall Status</Typography>
                                <Typography variant="body1" fontWeight={700}>SHIELD ACTIVE</Typography>
                                <LinearProgress variant="determinate" value={100} sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fff' } }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>Failed Auth Attempts (24h)</Typography>
                                <Typography variant="body1" fontWeight={700}>1,402 Blocks</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>SSL Certificate</Typography>
                                <Typography variant="body1" fontWeight={700}>Expires in 284 days</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default SystemHealth;
