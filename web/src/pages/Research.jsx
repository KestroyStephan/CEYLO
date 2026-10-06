import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent, Button, Stack, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, CircularProgress, Alert,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Research dashboard (Sprint 4): live evaluation data for RQ1-RQ6 and Objectives 4-6.
// Everything here is computed from what the mobile app records; nothing is estimated.

const COLLECTIONS = ['recommendation_records', 'usage_events', 'feedback', 'sus_responses'];
const STRATEGIES = ['mood', 'location', 'seasonal', 'balanced'];

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '-' : Number(v).toFixed(d));
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(0)}%` : '-');

// Bangor, Kortum and Miller (2009) adjective ratings for SUS scores
function susGrade(score) {
    if (score == null) return '-';
    if (score >= 85) return 'Excellent';
    if (score >= 72) return 'Good';
    if (score >= 68) return 'Above average';
    if (score >= 51) return 'OK';
    return 'Poor';
}

function toCsv(rows) {
    const flat = rows.map(r => {
        const o = {};
        for (const [k, v] of Object.entries(r)) {
            const d = v?.toDate ? v.toDate().toISOString() : v;
            o[k] = d !== null && typeof d === 'object' ? JSON.stringify(d) : d;
        }
        return o;
    });
    const cols = [...new Set(flat.flatMap(Object.keys))];
    const cell = (v) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(','), ...flat.map(r => cols.map(c => cell(r[c])).join(','))].join('\n');
}

function download(name, rows) {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ceylo_${name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function Stat({ label, value, sub, tone = '#00695c' }) {
    return (
        <Card sx={{ borderRadius: 1.25, height: '100%' }}>
            <CardContent>
                <Typography variant="subtitle2" fontWeight={600} color={tone} sx={{ letterSpacing: '0.04em' }}>{label}</Typography>
                <Typography variant="h4" fontWeight={600} sx={{ my: 0.5 }}>{value}</Typography>
                {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
            </CardContent>
        </Card>
    );
}

export default function Research() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const snaps = await Promise.all(COLLECTIONS.map(c => getDocs(collection(db, c))));
            const next = {};
            COLLECTIONS.forEach((c, i) => { next[c] = snaps[i].docs.map(d => ({ id: d.id, ...d.data() })); });
            setData(next);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const m = useMemo(() => {
        if (!data) return null;
        const records = data.recommendation_records;
        const events = data.usage_events;
        const feedback = data.feedback;
        const sus = data.sus_responses;

        // RQ3: compare strategy groups
        const byStrategy = STRATEGIES.map(s => {
            const recs = records.filter(r => (r.strategy || 'balanced') === s);
            const ids = new Set(recs.map(r => r.itineraryId));
            const users = new Set(recs.map(r => r.userId));
            const evs = events.filter(e => e.strategy === s);
            const opened = new Set(evs.filter(e => e.type === 'itinerary_opened' && ids.has(e.data?.itineraryId)).map(e => e.data.itineraryId));
            const edited = new Set(evs.filter(e => e.type === 'itinerary_edited').map(e => e.data?.itineraryId));
            const bookers = new Set(evs.filter(e => e.type === 'booking_made').map(e => e.userId));
            const fb = feedback.filter(f => f.strategy === s);
            const stops = recs.flatMap(r => r.results || []);
            return {
                strategy: s,
                itineraries: recs.length,
                users: users.size,
                openRate: pct(opened.size, recs.length),
                editRate: pct(edited.size, recs.length),
                conversion: pct([...bookers].filter(u => users.has(u)).length, users.size),
                rating: fmt(mean(fb.map(f => f.rating).filter(Number.isFinite))),
                relevance: fmt(mean(fb.map(f => f.relevance).filter(Number.isFinite))),
                hiddenShare: pct(stops.filter(x => x.hiddenGem).length, stops.length),
                avgEco: fmt(mean(stops.map(x => x.eco).filter(Number.isFinite)), 0),
            };
        }).filter(r => r.itineraries > 0 || r.users > 0);

        // NFR-001: recommendation latency
        const latencies = records.map(r => r.latencyMs).filter(Number.isFinite);
        const under3s = latencies.filter(l => l < 3000).length;

        // RQ5 / Objective 6: hidden gems vs famous places in what travellers actually engage with
        const engage = (type) => {
            const evs = events.filter(e => e.type === type);
            return { total: evs.length, hidden: evs.filter(e => e.data?.hiddenGem).length };
        };
        const viewed = engage('destination_viewed');
        const saved = engage('place_saved');
        const visited = engage('place_checked_in');
        const recStops = records.flatMap(r => r.results || []);

        // RQ4: alerts and events
        const count = (t) => events.filter(e => e.type === t).length;

        // Objective 4: usability
        const susScores = sus.map(s => s.susScore).filter(Number.isFinite);
        const susMean = mean(susScores);
        const paired = sus.filter(s => Number.isFinite(s.ecoAwarenessBefore) && Number.isFinite(s.ecoAwarenessAfter));

        const typeCounts = Object.entries(events.reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] || 0) + 1 }), {}))
            .map(([type, n]) => ({ type, n }))
            .sort((a, b) => b.n - a.n);

        const participants = new Set([...events.map(e => e.userId), ...records.map(r => r.userId)]);
        const firstSeen = [...events, ...records].map(x => toDate(x.createdAt)).filter(Boolean).sort((a, b) => a - b)[0];

        return {
            byStrategy, typeCounts,
            participants: participants.size,
            since: firstSeen ? firstSeen.toLocaleDateString('en-GB') : null,
            itineraries: records.length,
            latencyMean: mean(latencies), under3s: pct(under3s, latencies.length),
            recHidden: pct(recStops.filter(x => x.hiddenGem).length, recStops.length),
            viewed, saved, visited,
            alertsOpened: count('alert_opened'), eventsViewed: count('event_viewed'),
            vendorContacts: count('vendor_contacted'), bookings: count('booking_made'), sos: count('sos_used'),
            susN: susScores.length, susMean, susMin: susScores.length ? Math.min(...susScores) : null, susMax: susScores.length ? Math.max(...susScores) : null,
            ecoBefore: mean(paired.map(s => s.ecoAwarenessBefore)), ecoAfter: mean(paired.map(s => s.ecoAwarenessAfter)), ecoPairs: paired.length,
            relevance: mean(sus.map(s => s.relevance).filter(Number.isFinite)),
            discovery: mean(sus.map(s => s.discovery).filter(Number.isFinite)),
            localSupport: mean(sus.map(s => s.localSupport).filter(Number.isFinite)),
            ratingMean: mean(feedback.map(f => f.rating).filter(Number.isFinite)), ratingN: feedback.length,
        };
    }, [data]);

    if (loading && !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
                <Box>
                    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Research</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>Consenting travellers only{m?.since ? ` · since ${m.since}` : ''} · no names or contact details stored</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
                    {data && COLLECTIONS.map(c => (
                        <Button key={c} variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => download(c, data[c])} disabled={!data[c].length}>
                            {c.replace(/_/g, ' ')} ({data[c].length})
                        </Button>
                    ))}
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 3 }}>Could not load research data: {error}</Alert>}

            {m && (
                <>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Stat label="PARTICIPANTS" value={m.participants} sub={`${m.itineraries} itineraries generated`} /></Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Stat label="SUS SCORE (OBJ. 4)" value={fmt(m.susMean)} sub={m.susN ? `${susGrade(m.susMean)} · n=${m.susN} · range ${fmt(m.susMin, 0)}-${fmt(m.susMax, 0)} · target 68` : 'No survey responses yet'} tone="#ef6c00" /></Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Stat label="ITINERARY RATING" value={m.ratingN ? `${fmt(m.ratingMean)} / 5` : '-'} sub={`${m.ratingN} ratings`} tone="#2e7d32" /></Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Stat label="UNDER 3 S (NFR-001)" value={m.under3s} sub={`mean ${fmt(m.latencyMean / 1000, 2)} s per itinerary`} tone="#1565c0" /></Grid>
                    </Grid>

                    <Paper sx={{ p: 3, borderRadius: 1.25, mb: 4 }}>
                        <Typography variant="h6" fontWeight={600}>Recommendation strategies (RQ3)</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Each traveller is assigned one strategy. Open rate: share of generated itineraries opened again. Conversion: share of travellers in the group who made a booking.
                        </Typography>
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Strategy', 'Travellers', 'Itineraries', 'Open rate', 'Edited', 'Booking conversion', 'Rating /5', 'Relevance /3', 'Hidden-gem stops', 'Avg eco score'].map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {m.byStrategy.length === 0 && (
                                        <TableRow><TableCell colSpan={10}>No itineraries recorded yet.</TableCell></TableRow>
                                    )}
                                    {m.byStrategy.map(r => (
                                        <TableRow key={r.strategy}>
                                            <TableCell><Chip size="small" label={r.strategy} /></TableCell>
                                            <TableCell>{r.users}</TableCell>
                                            <TableCell>{r.itineraries}</TableCell>
                                            <TableCell>{r.openRate}</TableCell>
                                            <TableCell>{r.editRate}</TableCell>
                                            <TableCell>{r.conversion}</TableCell>
                                            <TableCell>{r.rating}</TableCell>
                                            <TableCell>{r.relevance}</TableCell>
                                            <TableCell>{r.hiddenShare}</TableCell>
                                            <TableCell>{r.avgEco}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Paper sx={{ p: 3, borderRadius: 1.25, height: '100%' }}>
                                <Typography variant="h6" fontWeight={600}>Hidden gems and local impact (RQ5, Obj. 6)</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Share of each action that went to lesser-known places rather than famous ones.</Typography>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow><TableCell>Recommended stops</TableCell><TableCell align="right">{m.recHidden}</TableCell></TableRow>
                                        <TableRow><TableCell>Places viewed</TableCell><TableCell align="right">{pct(m.viewed.hidden, m.viewed.total)} of {m.viewed.total}</TableCell></TableRow>
                                        <TableRow><TableCell>Places saved</TableCell><TableCell align="right">{pct(m.saved.hidden, m.saved.total)} of {m.saved.total}</TableCell></TableRow>
                                        <TableRow><TableCell>GPS check-ins</TableCell><TableCell align="right">{pct(m.visited.hidden, m.visited.total)} of {m.visited.total}</TableCell></TableRow>
                                        <TableRow><TableCell>Guide bookings</TableCell><TableCell align="right">{m.bookings}</TableCell></TableRow>
                                        <TableRow><TableCell>Vendor / guide chats opened</TableCell><TableCell align="right">{m.vendorContacts}</TableCell></TableRow>
                                        <TableRow><TableCell>Eco awareness before → after (1-5)</TableCell><TableCell align="right">{m.ecoPairs ? `${fmt(m.ecoBefore)} → ${fmt(m.ecoAfter)} (n=${m.ecoPairs})` : '-'}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Paper sx={{ p: 3, borderRadius: 1.25, height: '100%' }}>
                                <Typography variant="h6" fontWeight={600}>Survey answers (RQ1, RQ2, Obj. 5)</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Mean agreement, 1 = strongly disagree, 5 = strongly agree.</Typography>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow><TableCell>Recommendations matched my interests and mood</TableCell><TableCell align="right">{fmt(m.relevance)}</TableCell></TableRow>
                                        <TableRow><TableCell>Found places I would not have found myself</TableCell><TableCell align="right">{fmt(m.discovery)}</TableCell></TableRow>
                                        <TableRow><TableCell>More likely to use local guides and vendors</TableCell><TableCell align="right">{fmt(m.localSupport)}</TableCell></TableRow>
                                        <TableRow><TableCell>Event pages viewed (RQ4)</TableCell><TableCell align="right">{m.eventsViewed}</TableCell></TableRow>
                                        <TableRow><TableCell>Notifications opened (RQ4)</TableCell><TableCell align="right">{m.alertsOpened}</TableCell></TableRow>
                                        <TableRow><TableCell>SOS alerts raised</TableCell><TableCell align="right">{m.sos}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 3, borderRadius: 1.25 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Usage events by type</Typography>
                        {m.typeCounts.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No usage events yet. They appear once travellers who agreed to share data use the app.</Typography>
                        ) : (
                            <Box sx={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={m.typeCounts} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="type" width={150} />
                                        <Tooltip />
                                        <Bar dataKey="n" name="Events" fill="#00695c" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>
                </>
            )}
        </Box>
    );
}
