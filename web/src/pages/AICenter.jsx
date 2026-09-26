import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Grid, Paper, Stack, Chip, Divider, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip, Switch, FormControlLabel, Avatar
} from '@mui/material';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function AICenter() {
    const [destinations, setDestinations] = useState([]);
    const [logs, setLogs] = useState([]);

    // Mock logs since backend AI service might not be fully wired to Firestore yet
    useEffect(() => {
        setLogs([
            { id: 1, user: 'John Doe', query: 'Looking for a quiet safari with eco-lodges.', result: 'Yala Safari', confidence: 94, reason: 'High keyword match: Safari (90%), Eco (85%). Previous user rating synergy.' },
            { id: 2, user: 'Sarah Smith', query: 'Cultural heritage sites near the beach.', result: 'Galle Fort', confidence: 88, reason: 'Geo-proximity to coast + UNESCO heritage tag match.' },
            { id: 3, user: 'Michael K.', query: 'Extreme hiking trails.', result: 'Knuckles Range', confidence: 97, reason: 'NLP extracted "extreme hiking". Destination tags matched 100%.' },
            { id: 4, user: 'Emily R.', query: 'Local village cooking experience.', result: 'Hiriwadunna', confidence: 82, reason: 'Contextual semantic search matched "village cooking".' }
        ]);

        const unsubDestinations = onSnapshot(collection(db, 'destinations'), (snapshot) => {
            const dests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDestinations(dests);
        });

        return () => unsubDestinations();
    }, []);

    const toggleSafetyBlock = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, 'destinations', id), {
                aiBlocked: !currentStatus
            });
        } catch (error) {
            console.error("Error toggling AI block:", error);
        }
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            <Box sx={{ mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Typography variant="h4" fontWeight={900} color="#006A3B" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PsychologyIcon sx={{ mr: 1, fontSize: 32 }} /> CEYLO AI Control Center
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Monitor AI recommendation logs, explainable AI rationales, and enforce safety guardrails.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Explainable AI Logs */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', height: '100%' }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 3, display: 'flex', alignItems: 'center', color: '#181D19' }}>
                            <AnalyticsIcon sx={{ mr: 1, color: '#006A3B' }} /> Recommendation Audits & Explainability
                        </Typography>
                        
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#F1F8F6' }}>
                                        <TableCell sx={{ fontWeight: 800 }}>Tourist Query</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>AI Decision</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Confidence</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>XAI Rationale (Why?)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography variant="caption" fontWeight={700} color="#006A3B" sx={{ display: 'block' }}>{log.user}</Typography>
                                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{log.query}"</Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>{log.result}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={`${log.confidence}%`} 
                                                    size="small" 
                                                    sx={{ 
                                                        fontWeight: 900, 
                                                        bgcolor: log.confidence > 90 ? '#E8F5E9' : '#FFF3E0', 
                                                        color: log.confidence > 90 ? '#2E7D32' : '#E65100' 
                                                    }} 
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250 }}>
                                                    {log.reason}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Safety Guardrails (Kill Switches) */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid #FFEBEE', bgcolor: '#FFFAFA', boxShadow: 'none', height: '100%' }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', color: '#B71C1C' }}>
                            <WarningAmberIcon sx={{ mr: 1 }} /> Safety Guardrails
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Block destinations from appearing in AI recommendations during natural disasters or emergencies.
                        </Typography>

                        <Stack spacing={2}>
                            {destinations.slice(0, 8).map(dest => (
                                <Box key={dest.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #FFCDD2' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar src={dest.imageUrl} variant="rounded" sx={{ width: 40, height: 40 }} />
                                        <Box>
                                            <Typography variant="body2" fontWeight={800} color={dest.aiBlocked ? '#B71C1C' : '#181D19'}>
                                                {dest.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {dest.province}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <FormControlLabel
                                        control={
                                            <Switch 
                                                checked={!!dest.aiBlocked} 
                                                onChange={() => toggleSafetyBlock(dest.id, !!dest.aiBlocked)}
                                                color="error"
                                            />
                                        }
                                        label={<Typography variant="caption" fontWeight={800} color={dest.aiBlocked ? 'error' : 'text.secondary'}>{dest.aiBlocked ? 'BLOCKED' : 'ACTIVE'}</Typography>}
                                        labelPlacement="start"
                                    />
                                </Box>
                            ))}
                            {destinations.length === 0 && (
                                <Typography variant="caption" color="text.secondary" align="center">No destinations loaded.</Typography>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
