import { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, Paper, TextField, IconButton, Avatar, Link,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Stack, MenuItem, Snackbar, Alert,
    InputAdornment, Tabs, Tab, FormControlLabel, Switch, Tooltip,
} from '@mui/material';
import { collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// Maintained Sri Lankan calendar (gazetted holidays, Poya days, announced festivals, recurring seasons)
import calendar from '../../../mobile/assets/data/sri_lanka_calendar.json';

const CATEGORIES = ['Religious', 'Cultural', 'Festival', 'Arts', 'Seasonal', 'Heritage', 'Adventure', 'Wildlife', 'Eco', 'Sports', 'Food', 'Community'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS = {
    published: { label: 'Published', tone: 'success' },
    draft: { label: 'Draft', tone: 'neutral' },
    hidden: { label: 'Hidden', tone: 'warning' },
    unpublished: { label: 'Not published', tone: 'info' },
};
const EMPTY = {
    title: '', category: 'Festival', date: '', endDate: '', dateConfirmed: true, months: null, location: '', lat: '', lng: '',
    description: '', imageUrl: '', imageCredit: '', source: '', sourceUrl: '', status: 'draft', tags: [],
};

// Older records used approvalStatus; read both
const statusOf = (e) => e.status || (e.approvalStatus === 'approved' ? 'published' : e.approvalStatus === 'declined' ? 'hidden' : e.approvalStatus ? 'draft' : 'published');
const fmtDate = (e) => {
    if (!e.date && e.months?.length) return `Every ${e.months.map(m => MONTHS[m - 1]).join(', ')}`;
    if (!e.date) return '—';
    const f = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return e.endDate && e.endDate !== e.date ? `${f(e.date)} – ${f(e.endDate)}` : f(e.date);
};
const today = () => new Date().toISOString().slice(0, 10);
const isPast = (e) => Boolean(e.date) && (e.endDate || e.date) < today();

// Firestore rejects undefined; store a clean record
const toRecord = (e) => {
    const r = {};
    Object.keys(EMPTY).forEach(k => { r[k] = e[k] === undefined ? EMPTY[k] : e[k]; });
    r.lat = r.lat === '' || r.lat == null ? null : Number(r.lat);
    r.lng = r.lng === '' || r.lng == null ? null : Number(r.lng);
    r.approvalStatus = r.status === 'published' ? 'approved' : r.status === 'hidden' ? 'declined' : 'waiting';
    if (e.publicHoliday != null) r.publicHoliday = Boolean(e.publicHoliday);
    if (e.imagePage) r.imagePage = e.imagePage;
    if (e.calendarId) r.calendarId = e.calendarId;
    return r;
};

export default function CulturalEvents() {
    const [stored, setStored] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [tab, setTab] = useState('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [editing, setEditing] = useState(null); // { id|null, form }
    const [busy, setBusy] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    useEffect(() => onSnapshot(collection(db, 'cultural_events'),
        (snap) => { setStored(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (err) => { setLoadError(err.message); setLoading(false); }), []);

    // Calendar entries not in the database yet are listed so they can be published in one click
    const rows = useMemo(() => {
        const ids = new Set(stored.map(e => e.calendarId || e.id));
        const pending = calendar.events.filter(c => !ids.has(c.id)).map(c => ({ ...c, calendarId: c.id, unpublished: true }));
        return [...stored, ...pending].map(e => ({ ...e, statusKey: e.unpublished ? 'unpublished' : statusOf(e) }));
    }, [stored]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rows
            .filter(e => tab === 'all'
                || (tab === 'upcoming' && !isPast(e))
                || (tab === 'past' && isPast(e))
                || (tab === 'unpublished' && e.statusKey === 'unpublished'))
            .filter(e => !q || [e.title, e.category, e.location, ...(e.tags || [])].some(v => String(v || '').toLowerCase().includes(q)))
            .sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
    }, [rows, tab, searchQuery]);
    const shown = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const unpublishedUpcoming = rows.filter(e => e.statusKey === 'unpublished' && !isPast(e));

    const publish = async (e) => {
        try {
            await setDoc(doc(db, 'cultural_events', e.calendarId), { ...toRecord({ ...e, status: 'published' }), createdAt: serverTimestamp() });
            notify(`${e.title} published.`);
        } catch (err) { notify('Could not publish: ' + err.message, 'error'); }
    };

    const publishAll = async () => {
        setBusy(true);
        try {
            const batch = writeBatch(db);
            unpublishedUpcoming.forEach(e => batch.set(doc(db, 'cultural_events', e.calendarId), { ...toRecord({ ...e, status: 'published' }), createdAt: serverTimestamp() }));
            await batch.commit();
            notify(`${unpublishedUpcoming.length} calendar events published.`);
        } catch (err) { notify('Could not publish: ' + err.message, 'error'); }
        setBusy(false);
    };

    const setStatus = async (e, status) => {
        try {
            await updateDoc(doc(db, 'cultural_events', e.id), { status, approvalStatus: status === 'published' ? 'approved' : status === 'hidden' ? 'declined' : 'waiting' });
            notify(`${e.title}: ${STATUS[status].label.toLowerCase()}.`);
        } catch (err) { notify('Could not update: ' + err.message, 'error'); }
    };

    const openEditor = (e) => setEditing(e
        ? { id: e.unpublished ? null : e.id, calendarId: e.calendarId || null, form: { ...EMPTY, ...e, lat: e.lat ?? '', lng: e.lng ?? '', status: e.unpublished ? 'published' : statusOf(e) } }
        : { id: null, calendarId: null, form: { ...EMPTY } });

    const save = async () => {
        const f = editing.form;
        if (!f.title.trim()) return notify('Enter a title.', 'warning');
        if (f.dateConfirmed && !f.date) return notify('Enter a date, or turn off "Exact date known" for a recurring season.', 'warning');
        if (f.endDate && f.date && f.endDate < f.date) return notify('The end date is before the start date.', 'warning');
        if (f.imageUrl && !/^https:\/\//.test(f.imageUrl)) return notify('The image must be an https:// link.', 'warning');
        setBusy(true);
        try {
            const record = toRecord({ ...f, calendarId: editing.calendarId });
            if (editing.id) await updateDoc(doc(db, 'cultural_events', editing.id), { ...record, updatedAt: serverTimestamp() });
            else if (editing.calendarId) await setDoc(doc(db, 'cultural_events', editing.calendarId), { ...record, createdAt: serverTimestamp() });
            else await addDoc(collection(db, 'cultural_events'), { ...record, createdAt: serverTimestamp() });
            notify('Event saved.');
            setEditing(null);
        } catch (err) { notify('Could not save: ' + err.message, 'error'); }
        setBusy(false);
    };

    const remove = async () => {
        if (!editing.id || !window.confirm('Delete this event from the app?')) return;
        try {
            await deleteDoc(doc(db, 'cultural_events', editing.id));
            notify('Event deleted.', 'info');
            setEditing(null);
        } catch (err) { notify('Could not delete: ' + err.message, 'error'); }
    };

    const f = editing?.form;
    const setF = (patch) => setEditing(ed => ({ ...ed, form: { ...ed.form, ...patch } }));

    return (
        <Box>
            <PageHeader title="Cultural events">
                {unpublishedUpcoming.length > 0 && (
                    <Button variant="outlined" disabled={busy} onClick={publishAll}>Publish {unpublishedUpcoming.length} calendar events</Button>
                )}
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEditor(null)}>New event</Button>
            </PageHeader>

            {loadError && <Alert severity="error" sx={{ mb: 2 }}>Could not load events: {loadError}</Alert>}

            <Paper>
                <Box sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
                    <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }}>
                        <Tab value="upcoming" label="Upcoming" />
                        <Tab value="unpublished" label={`Not published ${rows.filter(e => e.statusKey === 'unpublished').length}`} />
                        <Tab value="past" label="Past" />
                        <Tab value="all" label="All" />
                    </Tabs>
                    <TextField size="small" placeholder="Search title, category, place" value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} sx={{ width: 280, my: 1 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Event</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Source</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && <TableRow><TableCell colSpan={7} sx={{ color: 'text.secondary' }}>Loading events…</TableCell></TableRow>}
                            {!loading && shown.length === 0 && <TableRow><TableCell colSpan={7} sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>No events in this view.</TableCell></TableRow>}
                            {shown.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar variant="rounded" src={row.imageUrl || undefined} sx={{ width: 44, height: 44, bgcolor: '#EEF1EF', color: '#7A8580' }}><EventIcon /></Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{row.title}</Typography>
                                                {row.publicHoliday && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Public holiday</Typography>}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{row.category}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {fmtDate(row)}
                                        {row.dateConfirmed === false && <Typography sx={{ fontSize: 12, color: 'warning.main' }}>Dates not confirmed</Typography>}
                                    </TableCell>
                                    <TableCell>{row.location || '—'}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        {row.sourceUrl
                                            ? <Link href={row.sourceUrl} target="_blank" rel="noreferrer" underline="hover" sx={{ fontSize: 13 }}>{row.source || 'Source'}</Link>
                                            : <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{row.source || 'Added by admin'}</Typography>}
                                    </TableCell>
                                    <TableCell><StatusChip {...STATUS[row.statusKey]} /></TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        {row.statusKey === 'unpublished' && <Button size="small" variant="contained" onClick={() => publish(row)} sx={{ mr: 1 }}>Publish</Button>}
                                        {row.statusKey === 'published' && <Button size="small" onClick={() => setStatus(row, 'hidden')} sx={{ mr: 1 }}>Hide</Button>}
                                        {(row.statusKey === 'hidden' || row.statusKey === 'draft') && <Button size="small" onClick={() => setStatus(row, 'published')} sx={{ mr: 1 }}>Publish</Button>}
                                        <Button size="small" variant="outlined" onClick={() => openEditor(row)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
            </Paper>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
                Calendar data updated {calendar.updated}. Dated holidays come from the gazetted 2026 and 2027 holiday lists; entries marked "Dates not confirmed" are recurring seasons shown by month.
            </Typography>

            <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
                <DialogTitle>{editing?.id ? 'Edit event' : editing?.calendarId ? 'Publish calendar event' : 'New event'}</DialogTitle>
                {f && (
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid size={{ xs: 12, md: 8 }}><TextField label="Title" fullWidth value={f.title} onChange={(e) => setF({ title: e.target.value })} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField select label="Category" fullWidth value={f.category} onChange={(e) => setF({ category: e.target.value })}>
                                    {[...new Set([...CATEGORIES, f.category])].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel control={<Switch checked={f.dateConfirmed !== false} onChange={(e) => setF({ dateConfirmed: e.target.checked })} />} label="Exact date known" />
                            </Grid>
                            {f.dateConfirmed !== false ? (
                                <>
                                    <Grid size={{ xs: 12, md: 6 }}><TextField type="date" label="Start date" fullWidth value={f.date || ''} onChange={(e) => setF({ date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                                    <Grid size={{ xs: 12, md: 6 }}><TextField type="date" label="End date (optional)" fullWidth value={f.endDate || ''} onChange={(e) => setF({ endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                                </>
                            ) : (
                                <Grid size={{ xs: 12 }}>
                                    <TextField select label="Usual months" fullWidth value={f.months || []} onChange={(e) => setF({ months: e.target.value, date: '' })}
                                        slotProps={{ select: { multiple: true, renderValue: (v) => v.map(m => MONTHS[m - 1]).join(', ') } }}>
                                        {MONTHS.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
                                    </TextField>
                                </Grid>
                            )}
                            <Grid size={{ xs: 12, md: 6 }}><TextField label="Location" fullWidth value={f.location} onChange={(e) => setF({ location: e.target.value })} placeholder="All island" /></Grid>
                            <Grid size={{ xs: 6, md: 3 }}><TextField label="Latitude" fullWidth value={f.lat} onChange={(e) => setF({ lat: e.target.value })} /></Grid>
                            <Grid size={{ xs: 6, md: 3 }}><TextField label="Longitude" fullWidth value={f.lng} onChange={(e) => setF({ lng: e.target.value })} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Description" fullWidth multiline rows={3} value={f.description} onChange={(e) => setF({ description: e.target.value })} /></Grid>
                            <Grid size={{ xs: 12, md: 9 }}>
                                <TextField label="Image URL (https)" fullWidth value={f.imageUrl} onChange={(e) => setF({ imageUrl: e.target.value })}
                                    helperText={f.imageCredit ? `Credit: ${f.imageCredit}` : 'Use a photo of this event; credit the source below.'} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Avatar variant="rounded" src={f.imageUrl || undefined} sx={{ width: '100%', height: 96, bgcolor: '#EEF1EF', color: '#7A8580' }}><EventIcon /></Avatar>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}><TextField label="Image credit" fullWidth value={f.imageCredit || ''} onChange={(e) => setF({ imageCredit: e.target.value })} /></Grid>
                            <Grid size={{ xs: 12, md: 6 }}><TextField label="Source" fullWidth value={f.source} onChange={(e) => setF({ source: e.target.value })} placeholder="Who announced the date" /></Grid>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <TextField label="Source link" fullWidth value={f.sourceUrl} onChange={(e) => setF({ sourceUrl: e.target.value })}
                                    slotProps={{ input: { endAdornment: f.sourceUrl ? <InputAdornment position="end"><Tooltip title="Open"><IconButton size="small" href={f.sourceUrl} target="_blank"><OpenInNewIcon fontSize="small" /></IconButton></Tooltip></InputAdornment> : null } }} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField select label="Status" fullWidth value={f.status} onChange={(e) => setF({ status: e.target.value })}>
                                    <MenuItem value="published">Published (shown in the app)</MenuItem>
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="hidden">Hidden</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField label="Tags (comma separated, used by recommendations)" fullWidth value={(f.tags || []).join(', ')}
                                    onChange={(e) => setF({ tags: e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) })}
                                    placeholder="e.g. poya, buddhist, perahera, eco, wildlife" />
                            </Grid>
                        </Grid>
                    </DialogContent>
                )}
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    {editing?.id && <Button color="error" onClick={remove} sx={{ mr: 'auto' }}>Delete</Button>}
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" disabled={busy} onClick={save}>Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
