import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Paper, LinearProgress,
    Stack, Chip, List, ListItem, ListItemText, ListItemIcon,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanIcon from '@mui/icons-material/Lan';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BACKEND_URL } from '../config';

const HealthMetric = ({ label, value, status, icon, progressVal }) => (
    <Paper sx={{ p: 3, borderRadius: 1.25, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f0f4f8', color: '#00695c', mr: 2 }}>
                {icon}
            </Box>
            <Typography variant="body2" fontWeight={600} color="text.secondary">{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>{value}</Typography>
        <Chip
            label={status.toUpperCase()}
            size="small"
            color={status === 'operational' ? 'success' : 'warning'}
            sx={{ fontWeight: 600, fontSize: '0.6rem' }}
        />
        <Box sx={{ mt: 2 }}>
            <LinearProgress
                variant="determinate"
                value={progressVal || (status === 'operational' ? 95 : 40)}
                sx={{ height: 4, borderRadius: 1, bgcolor: '#eee' }}
            />
        </Box>
    </Paper>
);

function SystemHealth() {
    const [dbLatency, setDbLatency] = useState(24);
    const [inferenceTime, setInferenceTime] = useState(null);
    // Share of health checks the backend answered since this page was opened
    const [checks, setChecks] = useState({ ok: 0, total: 0 });
    const uptime = checks.total ? (checks.ok / checks.total) * 100 : null;
    const [aiEngineStatus, setAiEngineStatus] = useState('operational');
    // Share of timed recommendation requests that succeeded since this page was opened
    const [apiCalls, setApiCalls] = useState({ ok: 0, total: 0 });
    const apiSuccess = apiCalls.total ? (apiCalls.ok / apiCalls.total) * 100 : null;
    const [models, setModels] = useState(null);


    const services = [
        // Only services this page actually checks
        { name: 'Firestore database', status: dbLatency >= 0 && dbLatency != null ? 'operational' : 'degraded', version: dbLatency >= 0 && dbLatency != null ? `${dbLatency} ms read` : 'unreachable' },
        { name: 'CEYLO backend and trained models', status: aiEngineStatus, version: BACKEND_URL.replace(/^https?:\/\//, '') },
    ];

    useEffect(() => {
        const checkLatency = async () => {
            try {
                const start = performance.now();
                // Perform a quick read on the destinations collection with limit 1
                await getDocs(query(collection(db, "destinations"), limit(1)));
                const end = performance.now();
                setDbLatency(Math.max(5, Math.round(end - start)));
            } catch (e) {
                console.error("Firestore health ping failed:", e);
                setDbLatency(-1); // offline or blocked
            }
        };

        const checkBackendHealth = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/health`);
                setChecks(c => ({ ok: c.ok + (res.ok ? 1 : 0), total: c.total + 1 }));
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'operational') {
                        setAiEngineStatus('operational');
                    }
                } else {
                    setAiEngineStatus('degraded');
                }
            } catch {
                setChecks(c => ({ ok: c.ok, total: c.total + 1 }));
                setAiEngineStatus('degraded');
            }
        };

        checkLatency();
        checkBackendHealth();
        const latencyInterval = setInterval(() => {
            checkLatency();
            checkBackendHealth();
        }, 8000);

        // Time a real recommendation request (NFR-001 target: under 3 s)
        const checkInference = async () => {
            try {
                const start = performance.now();
                const res = await fetch(`${BACKEND_URL}/api/recommend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mood: 'eco', days: 5 }),
                });
                if (res.ok) setInferenceTime(Math.round(performance.now() - start));
                setApiCalls(c => ({ ok: c.ok + (res.ok ? 1 : 0), total: c.total + 1 }));
            } catch {
                setInferenceTime(null);
                setApiCalls(c => ({ ok: c.ok, total: c.total + 1 }));
            }
            try {
                const res = await fetch(`${BACKEND_URL}/api/models`);
                if (res.ok) setModels(await res.json());
            } catch {
                setModels(null);
            }
        };
        checkInference();
        const statsInterval = setInterval(checkInference, 30000);

        return () => {
            clearInterval(latencyInterval);
            clearInterval(statsInterval);
        };
    }, []);

    const getLatencyStatus = () => {
        if (dbLatency === -1) return { text: 'offline', progress: 0, color: 'error' };
        if (dbLatency < 80) return { text: 'operational', progress: 95 };
        return { text: 'degraded', progress: 50 };
    };

    const latencyStatus = getLatencyStatus();

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>System health</Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HealthMetric
                        label="Global Uptime"
                        value={uptime == null ? 'Checking…' : `${uptime.toFixed(1)}%`}
                        status={uptime == null || uptime >= 95 ? 'operational' : 'degraded'}
                        icon={<SpeedIcon />}
                        progressVal={uptime ?? 0}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HealthMetric
                        label="DB Latency (Live)"
                        value={dbLatency === -1 ? 'Timed Out' : `${dbLatency}ms`}
                        status={latencyStatus.text}
                        icon={<StorageIcon />}
                        progressVal={latencyStatus.progress}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HealthMetric
                        label="API Success"
                        value={apiSuccess == null ? 'Checking…' : `${apiSuccess.toFixed(1)}%`}
                        status={apiSuccess == null || apiSuccess >= 95 ? 'operational' : 'degraded'}
                        icon={<LanIcon />}
                        progressVal={apiSuccess ?? 0}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HealthMetric
                        label="AI Inference"
                        value={inferenceTime == null ? 'Unavailable' : `${inferenceTime}ms`}
                        status={inferenceTime == null || inferenceTime > 3000 ? "performance_degrade" : "operational"}
                        icon={<CloudQueueIcon />}
                        progressVal={inferenceTime == null ? 0 : Math.max(5, 100 - Math.round(inferenceTime / 30))}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{ borderRadius: 1.25, overflow: 'hidden' }}>
                        <Box sx={{ px: 3, py: 2, bgcolor: '#f8fbfc', borderBottom: '1px solid #eee' }}>
                            <Typography variant="subtitle1" fontWeight={600}>Microservices Status</Typography>
                        </Box>
                        <List sx={{ p: 0 }}>
                            {services.map((service, idx) => {
                                const isOperational = service.status === 'operational';
                                return (
                                    <ListItem key={idx} sx={{ px: 3, py: 2, borderBottom: idx < services.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                        <ListItemIcon sx={{ minWidth: 40, color: isOperational ? 'success.main' : 'warning.main' }}>
                                            <CheckCircleIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Typography fontWeight={600}>{service.name}</Typography>}
                                            secondary={service.version}
                                        />
                                        <Chip
                                            label={isOperational ? 'ACTIVE' : 'DEGRADED'}
                                            size="small"
                                            color={isOperational ? 'success' : 'warning'}
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 1.25, bgcolor: '#00695c', color: '#fff', height: '100%' }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                            <SecurityIcon sx={{ mr: 1 }} /> Security Hardening
                        </Typography>
                        <Stack spacing={2}>
                            {[
                                ['Database access', 'Firestore and Storage security rules (59 emulator tests)'],
                                ['Backend rate limit', '60 requests/min, chatbot 20/min per IP'],
                                ['Broadcast push', 'Staff-only, verified Firebase ID token'],
                                ['AI services', 'Trained in-house models, no third-party AI keys'],
                            ].map(([label, value]) => (
                                <Box key={label}>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>{label}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{value}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Trained models served by the backend */}
            <Paper sx={{ borderRadius: 1.25, overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, bgcolor: '#f8fbfc', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PsychologyIcon sx={{ color: '#00695c' }} />
                    <Typography variant="subtitle1" fontWeight={600}>Trained AI Models</Typography>
                </Box>
                {!models ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>Model metrics unavailable: the backend could not be reached.</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Evaluation</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Trained</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Avg latency</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(models.models).map(([key, m]) => (
                                    <TableRow key={key}>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{m.algorithm}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {m.accuracy != null && `Accuracy ${(m.accuracy * 100).toFixed(1)}%`}
                                                {m.r2 != null && `R² ${m.r2} · MAE ${m.mae}`}
                                                {m.mape != null && `MAPE ${m.mape}% · MAE ${m.mae}`}
                                                {m.precisionAt5 != null && `Precision@5 ${m.precisionAt5} · NDCG@5 ${m.ndcgAt5}`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">{m.metric}</Typography>
                                        </TableCell>
                                        <TableCell>{m.trained}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                                            {models.latency?.[key] ? `${models.latency[key].avgMs} ms` : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}

export default SystemHealth;
