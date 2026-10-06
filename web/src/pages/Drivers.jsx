import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Stack, Paper, InputAdornment, Tabs, Tab, Avatar, Tooltip,
  Drawer, IconButton, Divider, Link,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { notifyUser } from '../utils/notifyUser';
import { DRIVER_DOCS, docState, docSummary, isExpired, toMs } from '../utils/driverDocs';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

const STATUS = {
  pending_verification: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  suspended: { label: 'Suspended', tone: 'error' },
};
const DOC_TONE = { missing: ['Not uploaded', 'neutral'], pending: ['Needs review', 'warning'], approved: ['Approved', 'success'], rejected: ['Rejected', 'error'] };
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtSize = (b) => (!b ? null : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function Drivers() {
  const { currentUser } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewId, setReviewId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // { type: 'driver' } or { type: 'doc', key }
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  useEffect(() => {
    const unsubDrivers = onSnapshot(query(collection(db, 'drivers'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setDrivers(snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdMs: toMs(d.data().createdAt) })));
        setLoading(false);
      },
      (error) => { setLoadError(error.message); setLoading(false); });
    const unsubDocs = onSnapshot(collection(db, 'driver_documents'),
      (snapshot) => setDocuments(Object.fromEntries(snapshot.docs.map(d => [d.id, d.data()]))),
      () => {});
    return () => { unsubDrivers(); unsubDocs(); };
  }, []);

  const counts = useMemo(() => ({
    all: drivers.length,
    pending: drivers.filter(d => d.status === 'pending_verification').length,
    approved: drivers.filter(d => d.status === 'approved').length,
    rejected: drivers.filter(d => d.status === 'rejected').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
  }), [drivers]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drivers
      .filter(d => statusTab === 'all'
        || (statusTab === 'pending' && d.status === 'pending_verification')
        || d.status === statusTab)
      .filter(d => !q || [d.name, d.email, d.phone, d.licensePlate, d.licenseNumber].some(v => (v || '').toLowerCase().includes(q)))
      .map(d => ({ ...d, docs: docSummary(documents[d.id]) }));
  }, [drivers, documents, statusTab, searchQuery]);

  const reviewingDriver = reviewId ? drivers.find(d => d.id === reviewId) : null;
  const reviewing = reviewingDriver ? { ...reviewingDriver, docs: docSummary(documents[reviewId]) } : null;
  const reviewRecord = reviewId ? documents[reviewId] || {} : {};

  // Trips assigned to the driver being reviewed (most recent first)
  const [trips, setTrips] = useState({ id: null, list: [], error: '' });
  useEffect(() => {
    if (!reviewId) return;
    let cancelled = false;
    getDocs(query(collection(db, 'bookings'), where('driverId', '==', reviewId), limit(50)))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0)).slice(0, 10);
        setTrips({ id: reviewId, list, error: '' });
      })
      .catch(e => !cancelled && setTrips({ id: reviewId, list: [], error: e.message }));
    return () => { cancelled = true; };
  }, [reviewId]);
  const reviewTrips = trips.id === reviewId ? trips : { list: [], error: '', loading: true };

  const reviewDocument = async (key, status, reason = '') => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'driver_documents', reviewId), {
        review: { [key]: { status, reason, at: Date.now(), by: currentUser?.email || currentUser?.uid || 'admin' } },
      }, { merge: true });
      notify(status === 'approved' ? 'Document approved.' : 'Document rejected.', status === 'approved' ? 'success' : 'info');
    } catch (e) {
      notify('Could not save the review: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const approveDriver = async (driver) => {
    if (!driver.docs.readyToApprove) {
      notify('Approve every required document first.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { status: 'approved', approvedAt: serverTimestamp(), rejectionReason: '' });
      await updateDoc(doc(db, 'users', driver.id), { role: 'driver_active', status: 'approved' });
      notifyUser(driver.id, 'You are approved to drive with CEYLO', 'Open CEYLO and switch online to start receiving ride requests.', { type: 'account_approved' });
      notify(`${driver.name || 'Driver'} approved.`);
    } catch (e) {
      notify('Could not approve: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const reactivate = async (driver) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { status: 'approved', rejectionReason: '', suspendedAt: null });
      await updateDoc(doc(db, 'users', driver.id), { role: 'driver_active', status: 'approved' });
      notifyUser(driver.id, 'Your CEYLO driver account is active again', 'Open CEYLO and switch online to receive ride requests.', { type: 'account_approved' });
      notify(`${driver.name || 'Driver'} reactivated.`);
    } catch (e) {
      notify('Could not reactivate: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmReject = async () => {
    const reason = rejectionReason.trim();
    if (!reason || !rejectTarget) return;
    if (rejectTarget.type === 'doc') {
      await reviewDocument(rejectTarget.key, 'rejected', reason);
    } else if (rejectTarget.type === 'suspend') {
      setSaving(true);
      try {
        // Offline at once; the app moves a suspended driver to the review screen with the reason
        await updateDoc(doc(db, 'drivers', rejectTarget.id), { status: 'suspended', rejectionReason: reason, suspendedAt: serverTimestamp(), isOnline: false });
        await updateDoc(doc(db, 'users', rejectTarget.id), { role: 'driver_rejected', status: 'suspended' });
        notifyUser(rejectTarget.id, 'Your CEYLO driver account is suspended', `Reason: ${reason}`, { type: 'account_rejected' });
        notify('Driver suspended.', 'info');
      } catch (e) {
        notify('Could not suspend: ' + e.message, 'error');
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        await updateDoc(doc(db, 'drivers', rejectTarget.id), { status: 'rejected', rejectionReason: reason, rejectedAt: serverTimestamp() });
        await updateDoc(doc(db, 'users', rejectTarget.id), { role: 'driver_rejected', status: 'rejected' });
        notifyUser(rejectTarget.id, 'Driver application needs changes', `Reason: ${reason}. Open CEYLO to update your documents.`, { type: 'account_rejected' });
        notify('Application rejected. The driver can fix it and send it again.', 'info');
      } catch (e) {
        notify('Could not reject: ' + e.message, 'error');
      } finally {
        setSaving(false);
      }
    }
    setRejectTarget(null);
    setRejectionReason('');
  };

  const columns = [
    {
      field: 'name', headerName: 'Driver', minWidth: 200, flex: 1.2,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#EEF2EF', color: '#2F3A35', fontSize: 13, fontWeight: 600 }}>
            {(row.name || 'D').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{row.name || '—'}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>{row.email || row.phone || '—'}</Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'vehicleType', headerName: 'Vehicle', width: 100 },
    {
      field: 'licensePlate', headerName: 'Plate', width: 130,
      renderCell: ({ value }) => <Typography sx={{ fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value || '—'}</Typography>,
    },
    {
      field: 'docs', headerName: 'Documents', width: 170, sortable: false,
      renderCell: ({ row }) => {
        const s = row.docs;
        const tone = s.rejected ? 'error' : s.readyToApprove ? 'success' : s.uploaded ? 'warning' : 'neutral';
        return <StatusChip tone={tone} label={s.uploaded ? `${s.approved}/${s.total} approved${s.rejected ? ` · ${s.rejected} rejected` : ''}` : 'None uploaded'} />;
      },
    },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: ({ value, row }) => (
        <Tooltip title={value === 'rejected' ? row.rejectionReason || '' : ''}>
          <span><StatusChip {...(STATUS[value] || { label: value || 'Unknown', tone: 'neutral' })} /></span>
        </Tooltip>
      ),
    },
    { field: 'createdMs', headerName: 'Applied', width: 120, valueFormatter: (v) => fmtDate(v) },
    {
      field: 'actions', headerName: '', width: 110, sortable: false, align: 'right',
      renderCell: ({ row }) => (
        <Button size="small" variant={row.status === 'pending_verification' ? 'contained' : 'outlined'} onClick={() => setReviewId(row.id)}>
          {row.status === 'pending_verification' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Drivers">
        <TextField
          size="small"
          placeholder="Search name, plate, licence"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 280 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
      </PageHeader>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>Could not load drivers: {loadError}</Alert>}

      <Paper>
        <Tabs value={statusTab} onChange={(_, v) => setStatusTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="all" label={`All ${counts.all}`} />
          <Tab value="pending" label={`Pending ${counts.pending}`} />
          <Tab value="approved" label={`Approved ${counts.approved}`} />
          <Tab value="rejected" label={`Rejected ${counts.rejected}`} />
          <Tab value="suspended" label={`Suspended ${counts.suspended}`} />
        </Tabs>
        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            onRowDoubleClick={({ row }) => setReviewId(row.id)}
            localeText={{ noRowsLabel: statusTab === 'pending' ? 'No applications waiting for review' : 'No drivers found' }}
            sx={{ border: 'none' }}
          />
        </Box>
      </Paper>

      {/* Review panel: driver details and each verification document */}
      <Drawer anchor="right" open={Boolean(reviewing)} onClose={() => setReviewId(null)} sx={{ zIndex: (t) => t.zIndex.appBar + 2 }} PaperProps={{ sx: { width: { xs: '100%', md: 720 }, borderRadius: 0 } }}>
        {reviewing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 600 }} noWrap>{reviewing.name || 'Driver'}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }} noWrap>{[reviewing.email, reviewing.phone].filter(Boolean).join(' · ')}</Typography>
              </Box>
              <StatusChip {...(STATUS[reviewing.status] || { label: reviewing.status, tone: 'neutral' })} />
              <IconButton onClick={() => setReviewId(null)} aria-label="Close"><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                {[
                  ['Vehicle', reviewing.vehicleType],
                  ['Plate', reviewing.licensePlate],
                  ['Licence no.', reviewing.licenseNumber],
                  ['Applied', fmtDate(reviewing.createdMs)],
                ].map(([k, v]) => (
                  <Box key={k}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{v || '—'}</Typography>
                  </Box>
                ))}
              </Box>
              {reviewing.status === 'rejected' && reviewing.rejectionReason && (
                <Alert severity="error" sx={{ mb: 2 }}>Rejected: {reviewing.rejectionReason}</Alert>
              )}

              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 3 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Activity</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Availability</Typography>
                    <StatusChip label={reviewing.isOnline ? 'Online' : 'Offline'} tone={reviewing.isOnline ? 'success' : 'neutral'} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Last location</Typography>
                    {reviewing.location?.latitude != null ? (
                      <Link href={`https://www.google.com/maps/search/?api=1&query=${reviewing.location.latitude},${reviewing.location.longitude}`} target="_blank" rel="noreferrer" underline="hover" sx={{ fontSize: 13 }}>
                        {reviewing.location.latitude.toFixed(3)}, {reviewing.location.longitude.toFixed(3)}
                        {reviewing.location.updatedAt ? ` · ${new Date(reviewing.location.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </Link>
                    ) : <Typography sx={{ fontSize: 13 }}>Not shared yet</Typography>}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Trips</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {reviewTrips.loading ? '…' : `${reviewTrips.list.filter(t => t.status === 'Completed').length} completed · ${reviewTrips.list.length} recent`}
                    </Typography>
                  </Box>
                </Box>
                {reviewTrips.error && <Typography sx={{ fontSize: 12, color: 'error.main' }}>Could not load trips: {reviewTrips.error}</Typography>}
                {!reviewTrips.loading && reviewTrips.list.length === 0 && !reviewTrips.error && (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No trips assigned yet.</Typography>
                )}
                {reviewTrips.list.map(t => (
                  <Box key={t.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', width: 90, flexShrink: 0 }}>{fmtDate(toMs(t.createdAt))}</Typography>
                    <Typography sx={{ fontSize: 13, flex: 1, minWidth: 0 }} noWrap>{t.pickup || '—'} → {t.dropoff || '—'}</Typography>
                    {t.fare != null && <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>LKR {Number(t.fare).toLocaleString()}</Typography>}
                    <StatusChip label={t.status || '—'} tone={t.status === 'Completed' ? 'success' : t.status === 'Cancelled' ? 'neutral' : 'info'} />
                  </Box>
                ))}
              </Box>

              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                Verification documents · {reviewing.docs.uploaded}/{reviewing.docs.total} uploaded
              </Typography>
              {reviewing.docs.uploaded === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>The driver has not uploaded any documents yet. They upload them in the CEYLO app after registering.</Alert>
              )}

              <Stack divider={<Divider />} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                {DRIVER_DOCS.map(item => {
                  const file = reviewRecord.files?.[item.key];
                  const review = reviewRecord.review?.[item.key];
                  const state = docState(file, review);
                  const [stateLabel, tone] = DOC_TONE[state];
                  const pdf = file && (file.contentType === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
                  const expired = isExpired(file);
                  return (
                    <Box key={item.key} sx={{ p: 2, display: 'flex', gap: 2 }}>
                      <Box component={file ? 'a' : 'div'} href={file?.url} target="_blank" rel="noreferrer"
                        sx={{ width: 120, height: 84, flexShrink: 0, borderRadius: 1.5, bgcolor: '#F4F6F5', border: 1, borderColor: 'divider', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                        {file && !pdf
                          ? <img src={file.url} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Stack alignItems="center" spacing={0.5}><DescriptionOutlinedIcon /><Typography sx={{ fontSize: 11 }}>{file ? 'PDF' : 'Missing'}</Typography></Stack>}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{item.label}</Typography>
                          {!item.required && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>optional</Typography>}
                          <StatusChip label={stateLabel} tone={tone} />
                          {expired && <StatusChip label={`Expired ${file.expiry}`} tone="error" />}
                        </Box>
                        {file ? (
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                            {[file.name, fmtSize(file.size), `uploaded ${fmtDate(toMs(file.uploadedAt))}`, file.expiry && !expired ? `expires ${file.expiry}` : null].filter(Boolean).join(' · ')}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>Not uploaded</Typography>
                        )}
                        {state === 'rejected' && review?.reason && (
                          <Typography sx={{ fontSize: 12.5, color: 'error.main', mt: 0.5 }}>Reason: {review.reason}</Typography>
                        )}
                        {review && state !== 'pending' && (
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>Reviewed by {review.by} on {fmtDate(review.at)}</Typography>
                        )}
                        {file && (
                          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} alignItems="center">
                            <Button size="small" variant="contained" disabled={saving || state === 'approved'} onClick={() => reviewDocument(item.key, 'approved')}>Approve</Button>
                            <Button size="small" variant="outlined" color="error" disabled={saving || state === 'rejected'} onClick={() => setRejectTarget({ type: 'doc', key: item.key, label: item.label })}>Reject</Button>
                            <Link href={file.url} target="_blank" rel="noreferrer" underline="hover" sx={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                              Open <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                            <Link href={file.url} download={file.name} target="_blank" rel="noreferrer" underline="hover" sx={{ fontSize: 13 }}>Download</Link>
                          </Stack>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ flex: 1, fontSize: 13, color: 'text.secondary' }}>
                {reviewing.status === 'approved' ? 'This driver is active.'
                  : reviewing.status === 'suspended' ? `Suspended: ${reviewing.rejectionReason || 'no reason given'}`
                  : reviewing.docs.readyToApprove ? 'All required documents are approved.'
                  : 'Approve every required document (none expired) to activate the driver.'}
              </Typography>
              {reviewing.status === 'pending_verification' && (
                <Button color="error" variant="outlined" disabled={saving} onClick={() => setRejectTarget({ type: 'driver', id: reviewing.id })}>Reject application</Button>
              )}
              {reviewing.status === 'approved' && (
                <Button color="error" variant="outlined" disabled={saving} onClick={() => setRejectTarget({ type: 'suspend', id: reviewing.id })}>Suspend driver</Button>
              )}
              {reviewing.status === 'suspended' && (
                <Button variant="contained" disabled={saving} onClick={() => reactivate(reviewing)}>Reactivate driver</Button>
              )}
              {(reviewing.status === 'pending_verification' || reviewing.status === 'rejected') && (
                <Button variant="contained" disabled={saving || !reviewing.docs.readyToApprove} onClick={() => approveDriver(reviewing)}>Approve driver</Button>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog open={Boolean(rejectTarget)} onClose={() => { setRejectTarget(null); setRejectionReason(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>{rejectTarget?.type === 'doc' ? `Reject ${rejectTarget.label}` : rejectTarget?.type === 'suspend' ? 'Suspend driver' : 'Reject application'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>The driver sees this reason in the app.</Typography>
          <TextField
            autoFocus fullWidth multiline rows={3}
            label="Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={rejectTarget?.type === 'doc' ? 'e.g. Photo is blurred, the licence number cannot be read' : 'e.g. Insurance certificate has expired'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setRejectTarget(null); setRejectionReason(''); }}>Cancel</Button>
          <Button onClick={confirmReject} variant="contained" color="error" disabled={!rejectionReason.trim() || saving}>{rejectTarget?.type === 'suspend' ? 'Suspend' : 'Reject'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
