import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Grid, Paper, Chip, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Switch, FormControlLabel, Avatar, Stack
} from '@mui/material';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AnalyticsIcon from '@mui/icons-material/Analytics';

export default function AICenter() {
    const [destinations, setDestinations] = useState([]);
    const [logs, setLogs] = useState([]);

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
        try { await updateDoc(doc(db, 'destinations', id), { aiBlocked: !currentStatus }); } 
        catch (error) { console.error("Error toggling AI block:", error); }
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} color="#0F172A" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PsychologyIcon sx={{ mr: 1, fontSize: 32, color: '#0F172A' }} /> AI Control Center
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Monitor AI recommendation logs, XAI rationales, and enforce global safety guardrails.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8F9FA' }}>
                            <Typography variant="subtitle2" fontWeight={600} color="#0F172A" sx={{ display: 'flex', alignItems: 'center' }}>
                                <AnalyticsIcon sx={{ mr: 1, fontSize: 18 }} /> Recommendation Audits (XAI)
                            </Typography>
                        </Box>
                        
                        <TableContainer sx={{ flexGrow: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User & Query</TableCell>
                                        <TableCell>AI Decision</TableCell>
                                        <TableCell>Confidence</TableCell>
                                        <TableCell>XAI Rationale</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} hover>
                                            <TableCell sx={{ py: 2 }}>
                                                <Typography variant="body2" fontWeight={600} color="#0F172A">{log.user}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>"{log.query}"</Typography>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{log.result}</Typography></TableCell>
                                            <TableCell>
                                                <Chip label={`${log.confidence}%`} size="small" sx={{ fontWeight: 600, bgcolor: log.confidence > 90 ? '#D1FAE5' : '#FEF3C7', color: log.confidence > 90 ? '#059669' : '#D97706' }} />
                                            </TableCell>
                                            <TableCell><Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 280, lineHeight: 1.4 }}>{log.reason}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, border: '1px solid #FEE2E2', bgcolor: '#FEF2F2', height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', color: '#DC2626' }}>
                            <WarningAmberIcon sx={{ mr: 1, fontSize: 18 }} /> Safety Guardrails
                        </Typography>
                        <Typography variant="body2" color="#7F1D1D" sx={{ mb: 3 }}>
                            Instantly block destinations from the AI recommendation pool during regional emergencies or disasters.
                        </Typography>

                        <Stack spacing={1.5}>
                            {destinations.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">Loading destinations...</Typography>
                            ) : (
                                destinations.slice(0, 8).map(dest => (
                                    <Box key={dest.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#FFF', borderRadius: 2, border: '1px solid #FECACA' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar src={dest.imageUrl} variant="rounded" sx={{ width: 32, height: 32 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={600} color={dest.aiBlocked ? '#DC2626' : '#0F172A'}>{dest.name}</Typography>
                                            </Box>
                                        </Box>
                                        <FormControlLabel
                                            control={<Switch size="small" checked={!!dest.aiBlocked} onChange={() => toggleSafetyBlock(dest.id, !!dest.aiBlocked)} color="error" />}
                                            label={<Typography variant="caption" fontWeight={700} color={dest.aiBlocked ? 'error' : 'text.secondary'}>{dest.aiBlocked ? 'HALTED' : 'ACTIVE'}</Typography>}
                                            labelPlacement="start" sx={{ m: 0 }}
                                        />
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
