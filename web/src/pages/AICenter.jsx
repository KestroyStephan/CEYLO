import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Paper, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Switch, FormControlLabel, Avatar, Stack,
    TextField, Button, MenuItem, CircularProgress
} from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { collection, onSnapshot, updateDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BACKEND_URL } from '../config';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import EcoIcon from '@mui/icons-material/Park';
import TimelineIcon from '@mui/icons-material/Timeline';
import ChatIcon from '@mui/icons-material/Chat';

const MOODS = [
    ['eco', 'Eco Explorer'], ['culture', 'Culture Seeker'], ['adventurer', 'Adventurer'],
    ['family', 'Family'], ['spiritual', 'Spiritual'], ['relaxed', 'Relaxed'],
];

const STRATEGY_OPTIONS = [
    ['balanced', 'Balanced'], ['mood', 'Mood-based'], ['location', 'Location-based'], ['seasonal', 'Seasonal'],
];

const BASELINE_LABEL = { ncf: 'Two-tower NCF (old)', rule: 'Eco score + popularity rule', popularity: 'Popularity' };

// Usage statistics per strategy from the logged recommendation records (RQ3, NFR-001)
function recordStats(records) {
    const by = {};
    for (const r of records) {
        const key = r.strategy || 'unknown';
        (by[key] = by[key] || []).push(r);
    }
    return Object.entries(by).map(([strategy, rows]) => {
        const lat = rows.map(r => r.latencyMs).filter(Number.isFinite).sort((a, b) => a - b);
        return {
            strategy,
            count: rows.length,
            offline: rows.filter(r => r.source === 'on-device').length,
            avgMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
            p95Ms: lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : null,
            under3s: lat.length ? lat.filter(x => x < 3000).length / lat.length : null,
        };
    }).sort((a, b) => b.count - a.count);
}

const ECO_FIELDS = [
    ['carbon_footprint_index', 'Carbon footprint (0-100)', 30],
    ['wildlife_disturbance_risk', 'Wildlife disturbance (0-100)', 20],
    ['plastic_pollution_risk', 'Plastic pollution risk (0-100)', 40],
    ['community_benefit_score', 'Community benefit (0-100)', 70],
];

const card = { p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' };

async function api(path, body) {
    const res = await fetch(`${BACKEND_URL}${path}`, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : undefined);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    return res.json();
}

function Kpi({ label, value, caption, color, icon }) {
    return (
        <Paper sx={card}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" fontWeight={900} color="text.secondary">{label}</Typography>
                    <Typography variant="h4" fontWeight={950} color={color}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{caption}</Typography>
                </Box>
                {icon}
            </Box>
        </Paper>
    );
}

export default function AICenter() {
    const [destinations, setDestinations] = useState([]);
    const [models, setModels] = useState(null);
    const [online, setOnline] = useState(null);
    const [forecast, setForecast] = useState([]);

    const [mood, setMood] = useState('eco');
    const [place, setPlace] = useState('');
    const [strategy, setStrategy] = useState('balanced');
    const [avoidCrowds, setAvoidCrowds] = useState(false);
    const [records, setRecords] = useState([]);
    const [recs, setRecs] = useState(null);
    const [recsLoading, setRecsLoading] = useState(false);

    const [message, setMessage] = useState('How do I get from Colombo to Kandy?');
    const [intents, setIntents] = useState(null);

    const [eco, setEco] = useState({ ...Object.fromEntries(ECO_FIELDS.map(([k, , v]) => [k, v])), carrying_capacity_adherence: true });
    const [ecoScore, setEcoScore] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubDestinations = onSnapshot(collection(db, 'destinations'), (snapshot) => {
            setDestinations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Most recent generated itineraries (staff can read every record)
        const unsubRecords = onSnapshot(
            query(collection(db, 'recommendation_records'), orderBy('createdAt', 'desc'), limit(500)),
            (snap) => setRecords(snap.docs.map(d => d.data())),
            (e) => console.error('Recommendation records unavailable:', e),
        );

        const loadModels = () => api('/api/models').then(m => { setModels(m); setOnline(true); }).catch(() => setOnline(false));
        loadModels();
        const interval = setInterval(loadModels, 30000);

        api('/api/forecast?days=14').then(({ history, forecast: f }) => {
            setForecast([
                ...history.slice(-30).map(h => ({ date: h.date.slice(5), actual: h.bookings })),
                ...f.map(p => ({ date: p.date.slice(5), forecast: p.bookings })),
            ]);
        }).catch(() => setForecast([]));

        return () => { unsubDestinations(); unsubRecords(); clearInterval(interval); };
    }, []);

    const toggleSafetyBlock = async (id, currentStatus) => {
        try { await updateDoc(doc(db, 'destinations', id), { aiBlocked: !currentStatus }); }
        catch (e) { console.error('Error toggling AI block:', e); }
    };

    const runRecommender = async () => {
        setRecsLoading(true); setError('');
        try { setRecs(await api('/api/recommend', { mood, days: 5, destination: place || undefined, strategy, avoidCrowds })); }
        catch (e) { setError(`Recommender: ${e.message}`); }
        finally { setRecsLoading(false); }
    };

    const runIntent = async () => {
        setError('');
        try { setIntents((await api('/api/models/intent', { message })).ranked); }
        catch (e) { setError(`Intent classifier: ${e.message}`); }
    };

    const runEco = async () => {
        setError('');
        try { setEcoScore((await api('/api/eco-score', eco)).ecoScore); }
        catch (e) { setError(`Eco model: ${e.message}`); }
    };

    const m = models?.models;
    const avgLatency = models?.latency && Object.values(models.latency).length
        ? (Object.values(models.latency).reduce((s, l) => s + l.avgMs, 0) / Object.values(models.latency).length).toFixed(1)
        : null;

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#006A3B" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        AI Model Monitor
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        CEYLO's own trained models: evaluation results, live latency, and tools to test each prediction.
                    </Typography>
                </Box>
                <Chip
                    icon={online === false ? <ErrorIcon /> : <CheckCircleIcon />}
                    label={online === null ? 'Model engine: checking…' : online ? 'Model engine: ONLINE' : 'Model engine: OFFLINE'}
                    sx={{ bgcolor: online === false ? '#FEE2E2' : '#D1FAE5', color: online === false ? '#DC2626' : '#059669', fontWeight: 800, borderRadius: 2, px: 1, py: 2.5 }}
                />
            </Box>

            {error && <Paper sx={{ ...card, mb: 3, bgcolor: '#FEF2F2', borderColor: '#FECACA' }}><Typography color="error" fontWeight={700}>{error}</Typography></Paper>}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Kpi label="CHATBOT INTENT ACCURACY" color="#006A3B" icon={<ChatIcon sx={{ color: '#006A3B', fontSize: 28 }} />}
                        value={m ? `${(m.chatbot.accuracy * 100).toFixed(1)}%` : '—'}
                        caption={m ? `${m.chatbot.intents} intents, ${m.chatbot.metric}` : 'Loading…'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Kpi label="RECOMMENDER NDCG@5" color="#0F172A" icon={<AnalyticsIcon sx={{ color: '#0F172A', fontSize: 28 }} />}
                        value={m?.recommender?.ndcgAt5 != null ? m.recommender.ndcgAt5.toFixed(3) : '—'}
                        caption={m?.recommender ? `Precision@5 ${m.recommender.precisionAt5}, content-based model` : 'Loading…'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Kpi label="ECO MODEL R²" color="#059669" icon={<EcoIcon sx={{ color: '#059669', fontSize: 28 }} />}
                        value={m ? m.eco.r2.toFixed(3) : '—'}
                        caption={m ? `MAE ${m.eco.mae} eco points` : 'Loading…'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Kpi label="AVG INFERENCE LATENCY" color="#D97706" icon={<SpeedIcon sx={{ color: '#D97706', fontSize: 28 }} />}
                        value={avgLatency ? `${avgLatency}ms` : '—'}
                        caption={avgLatency ? 'Measured on the backend since last restart' : 'No requests yet'} />
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Recommender with explanations */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ ...card, p: 0, overflow: 'hidden', height: '100%' }}>
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #EBEFE8' }}>
                            <Typography variant="subtitle2" fontWeight={800} color="#0F172A" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PsychologyIcon sx={{ mr: 1, fontSize: 20 }} /> Recommendation audit (explainable)
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField select size="small" label="Mood" value={mood} onChange={e => setMood(e.target.value)} sx={{ minWidth: 170 }}>
                                    {MOODS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                                </TextField>
                                <TextField size="small" label="Place (optional)" placeholder="Kandy, the south…" value={place} onChange={e => setPlace(e.target.value)} />
                                <TextField select size="small" label="Strategy" value={strategy} onChange={e => setStrategy(e.target.value)} sx={{ minWidth: 150 }}>
                                    {STRATEGY_OPTIONS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                                </TextField>
                                <FormControlLabel control={<Switch checked={avoidCrowds} onChange={e => setAvoidCrowds(e.target.checked)} />}
                                    label={<Typography variant="body2">Fewer crowds</Typography>} />
                                <Button variant="contained" onClick={runRecommender} disabled={recsLoading} sx={{ bgcolor: '#006A3B', fontWeight: 800 }}>
                                    {recsLoading ? <CircularProgress size={20} color="inherit" /> : 'Run model'}
                                </Button>
                            </Stack>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>DESTINATION</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>SCORES</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>WHY</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recs?.weather && (
                                        <TableRow><TableCell colSpan={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Weather for {place}: rain likely on {Math.round(recs.weather.rainyShare * 100)}% of the trip days; outdoor places are down-ranked accordingly. Model {recs.modelVersion}.
                                            </Typography>
                                        </TableCell></TableRow>
                                    )}
                                    {!recs && (
                                        <TableRow><TableCell colSpan={3}><Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Pick a mood and run the recommender to see its ranked picks.</Typography></TableCell></TableRow>
                                    )}
                                    {recs?.top_matches.map(r => (
                                        <TableRow key={r.id} hover>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" fontWeight={800}>{r.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{r.category} · {r.province}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.5}>
                                                    <Chip label={`Match ${r.matchScore}`} size="small" sx={{ fontWeight: 800, bgcolor: '#D1FAE5', color: '#059669' }} />
                                                    <Chip label={`Eco ${r.ecoScore}`} size="small" sx={{ fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }} />
                                                </Stack>
                                            </TableCell>
                                            <TableCell><Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 320 }}>{r.reason}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Safety guardrails: paused destinations are skipped by the recommender */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #FEE2E2', bgcolor: '#FEF2F2', height: '100%', boxShadow: 'none' }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', color: '#DC2626', textTransform: 'uppercase' }}>
                            <WarningAmberIcon sx={{ mr: 1, fontSize: 20 }} /> Safety Guardrails
                        </Typography>
                        <Typography variant="body2" color="#7F1D1D" fontWeight={500} sx={{ mb: 3 }}>
                            Pause a destination during emergencies or disasters. The recommender stops suggesting it within 5 minutes.
                        </Typography>
                        <Stack spacing={2}>
                            {destinations.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">No destinations in the database yet.</Typography>
                            ) : (
                                destinations.slice(0, 6).map(dest => (
                                    <Box key={dest.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#FFF', borderRadius: 3, border: '1px solid #FECACA' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar src={dest.imageUrl} variant="rounded" sx={{ width: 36, height: 36, borderRadius: 2 }} />
                                            <Typography variant="body2" fontWeight={800} color={dest.aiBlocked ? '#DC2626' : '#0F172A'}>{dest.name}</Typography>
                                        </Box>
                                        <FormControlLabel
                                            control={<Switch size="small" checked={!!dest.aiBlocked} onChange={() => toggleSafetyBlock(dest.id, !!dest.aiBlocked)} color="error" />}
                                            label={<Typography variant="caption" fontWeight={800} color={dest.aiBlocked ? 'error' : 'text.secondary'}>{dest.aiBlocked ? 'PAUSED' : 'ACTIVE'}</Typography>}
                                            labelPlacement="start" sx={{ m: 0 }}
                                        />
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Offline evaluation against baselines */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ ...card, height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Recommender vs baselines</Typography>
                        <Typography variant="caption" color="text.secondary">{m?.recommender?.metric || 'Loading…'}</Typography>
                        <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800 }}>Ranker</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }} align="right">Precision@5</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }} align="right">NDCG@5</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }} align="right">Hit@5</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {m?.recommender && [['Content-based model (live)', m.recommender], ...Object.entries(m.recommender.baselines || {}).map(([k, v]) => [BASELINE_LABEL[k] || k, v])].map(([label, v], i) => (
                                    <TableRow key={label}>
                                        <TableCell sx={{ fontWeight: i === 0 ? 800 : 500 }}>{label}</TableCell>
                                        <TableCell align="right">{v.precisionAt5.toFixed(3)}</TableCell>
                                        <TableCell align="right">{v.ndcgAt5.toFixed(3)}</TableCell>
                                        <TableCell align="right">{v.hitRateAt5.toFixed(3)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                {/* Live usage by strategy */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ ...card, height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Generated itineraries by strategy</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Last {records.length} itineraries from recommendation_records. NFR-001 target: 95% under 3 s.
                        </Typography>
                        {records.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No itineraries generated yet.</Typography>
                        ) : (
                            <Table size="small" sx={{ mt: 1 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>Strategy</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">Itineraries</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">Offline</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">p95</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">Under 3 s</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recordStats(records).map(r => (
                                        <TableRow key={r.strategy}>
                                            <TableCell sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.strategy}</TableCell>
                                            <TableCell align="right">{r.count}</TableCell>
                                            <TableCell align="right">{r.offline}</TableCell>
                                            <TableCell align="right">{r.p95Ms != null ? `${(r.p95Ms / 1000).toFixed(1)} s` : '—'}</TableCell>
                                            <TableCell align="right">
                                                {r.under3s != null && (
                                                    <Chip size="small" label={`${Math.round(r.under3s * 100)}%`}
                                                        sx={{ fontWeight: 800, bgcolor: r.under3s >= 0.95 ? '#D1FAE5' : '#FEF3C7', color: r.under3s >= 0.95 ? '#059669' : '#D97706' }} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Demand forecast */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ ...card, height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <TimelineIcon sx={{ mr: 1, fontSize: 20 }} /> Booking demand forecast (LSTM)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {m ? `Last 30 days of the training series and the next 14 days. Hold-out MAPE ${m.demand.mape}%.` : 'Loading…'}
                        </Typography>
                        <Box sx={{ height: 260, mt: 2 }}>
                            {forecast.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">Forecast unavailable.</Typography>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={forecast}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#EBEFE8" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={6} />
                                        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="actual" name="Bookings" stroke="#006A3B" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#D97706" dot={false} strokeWidth={2} strokeDasharray="5 4" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Intent classifier + eco scorer */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <Paper sx={card}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <ChatIcon sx={{ mr: 1, fontSize: 20 }} /> Test the chatbot intent classifier
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField size="small" fullWidth value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && runIntent()} />
                                <Button variant="outlined" onClick={runIntent} sx={{ fontWeight: 800 }}>Classify</Button>
                            </Stack>
                            {intents && (
                                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                                    {intents.map((i, idx) => (
                                        <Chip key={i.intent} label={`${i.intent} ${(i.confidence * 100).toFixed(1)}%`}
                                            sx={{ fontWeight: 800, bgcolor: idx === 0 ? '#D1FAE5' : '#F1F5F9', color: idx === 0 ? '#059669' : '#475569' }} />
                                    ))}
                                </Stack>
                            )}
                        </Paper>

                        <Paper sx={card}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <EcoIcon sx={{ mr: 1, fontSize: 20 }} /> Score a new place with the eco model
                            </Typography>
                            <Grid container spacing={1.5}>
                                {ECO_FIELDS.map(([key, label]) => (
                                    <Grid key={key} size={{ xs: 6 }}>
                                        <TextField size="small" fullWidth type="number" label={label} value={eco[key]}
                                            inputProps={{ min: 0, max: 100 }}
                                            onChange={e => setEco({ ...eco, [key]: e.target.value })} />
                                    </Grid>
                                ))}
                            </Grid>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                <FormControlLabel
                                    control={<Switch checked={eco.carrying_capacity_adherence} onChange={e => setEco({ ...eco, carrying_capacity_adherence: e.target.checked })} />}
                                    label={<Typography variant="body2">Respects carrying capacity</Typography>}
                                />
                                <Stack direction="row" spacing={2} alignItems="center">
                                    {ecoScore != null && <Typography variant="h5" fontWeight={900} color="#059669">{ecoScore}</Typography>}
                                    <Button variant="contained" onClick={runEco} sx={{ bgcolor: '#059669', fontWeight: 800 }}>Predict</Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}
