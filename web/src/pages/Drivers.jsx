import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar,
  Stack,
  Paper,
  Grid,
  InputAdornment,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { notifyUser } from '../utils/notifyUser';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Real-time listener on drivers collection
  useEffect(() => {
    const q = query(
      collection(db, 'drivers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAtDisplay: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'N/A',
        }));
        setDrivers(data);
        setLoading(false);
      },
      (error) => {
        console.error('Drivers fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const pendingCount = drivers.filter(
    (d) => d.status === 'pending_verification'
  ).length;
  const approvedCount = drivers.filter((d) => d.status === 'approved').length;
  const rejectedCount = drivers.filter((d) => d.status === 'rejected').length;

  // Filter and search logic
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      // Tab filter
      if (statusTab === 'pending' && d.status !== 'pending_verification') return false;
      if (statusTab === 'approved' && d.status !== 'approved') return false;
      if (statusTab === 'rejected' && d.status !== 'rejected') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (d.name || '').toLowerCase();
      const email = (d.email || '').toLowerCase();
      const phone = (d.phone || '').toLowerCase();
      const plate = (d.licensePlate || '').toLowerCase();
      const lic = (d.licenseNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || plate.includes(q) || lic.includes(q);
    });
  }, [drivers, statusTab, searchQuery]);

  // Approve driver
  const handleApprove = async (driverId) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        rejectionReason: '',
      });

      await updateDoc(doc(db, 'users', driverId), {
        role: 'driver_active',
        status: 'approved',
      });
      notifyUser(driverId, 'You are approved to drive with CEYLO', 'Open CEYLO and switch online to start receiving ride requests.', { type: 'account_approved' });

      setSnackbar({
        open: true,
        message: 'Driver approved! They can now access the driver portal.',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error approving driver: ' + error.message,
        severity: 'error',
      });
    }
  };

  // Reject driver
  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await updateDoc(doc(db, 'drivers', selectedDriverId), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', selectedDriverId), {
        role: 'driver_rejected',
        status: 'rejected',
      });
      notifyUser(selectedDriverId, 'Driver application needs changes', `Reason: ${rejectionReason}. Open CEYLO to update your details.`, { type: 'account_rejected' });

      setSnackbar({
        open: true,
        message: 'Driver application rejected.',
        severity: 'info',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedDriverId(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error rejecting driver: ' + error.message,
        severity: 'error',
      });
    }
  };

  // DataGrid columns
  const columns = [
    {
      field: 'name',
      headerName: 'Driver Name',
      minWidth: 170,
      flex: 1.1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#E8F5E9', color: '#006A3B', fontSize: 14, fontWeight: 700 }}>
            {(params.row.name || 'D').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} color="#181D19">
              {params.row.name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.phone || 'No phone'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email Address',
      minWidth: 170,
      flex: 1.2,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'vehicleType',
      headerName: 'Vehicle Type',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, borderColor: '#C8D6C9', color: '#2E4832' }}
        />
      ),
    },
    {
      field: 'licensePlate',
      headerName: 'License Plate',
      width: 135,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            backgroundColor: '#F1F5F2',
            color: '#1C3122',
            px: 1.2,
            py: 0.4,
            borderRadius: 1.5,
            border: '1px solid #E0E8E1',
            letterSpacing: '0.04em',
            fontSize: '0.8rem',
          }}
        >
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'licenseNumber',
      headerName: 'License No.',
      width: 125,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" color={params.value ? 'text.primary' : 'text.disabled'}>
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 125,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const statusConfig = {
          pending_verification: {
            label: 'Pending',
            color: 'warning',
            bgcolor: '#FFF7ED',
            textColor: '#C2410C',
          },
          approved: {
            label: 'Approved',
            color: 'success',
            bgcolor: '#ECFDF5',
            textColor: '#047857',
          },
          rejected: {
            label: 'Rejected',
            color: 'error',
            bgcolor: '#FEF2F2',
            textColor: '#B91C1C',
          },
        };
        const config = statusConfig[params.value] || {
          label: params.value || 'Unknown',
          bgcolor: '#F3F4F6',
          textColor: '#4B5563',
        };
        return (
          <Chip
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bgcolor,
              color: config.textColor,
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        );
      },
    },
    {
      field: 'createdAtDisplay',
      headerName: 'Applied On',
      width: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 190,
      minWidth: 180,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          {params.row.status === 'pending_verification' ? (
            <>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleApprove(params.row.id)}
                sx={{
                  bgcolor: '#006A3B',
                  color: '#FFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 1.5,
                  minWidth: 70,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#004D2B' },
                }}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  setSelectedDriverId(params.row.id);
                  setRejectDialogOpen(true);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 1.2,
                  minWidth: 65,
                }}
              >
                Reject
              </Button>
            </>
          ) : params.row.status === 'approved' ? (
            <Chip
              label="Verified"
              size="small"
              icon={<CheckCircleOutlineIcon style={{ fontSize: 16, color: '#047857' }} />}
              sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 700 }}
            />
          ) : params.row.status === 'rejected' ? (
            <Tooltip title={params.row.rejectionReason || 'Application rejected'}>
              <Chip
                label="Rejected"
                size="small"
                icon={<HighlightOffIcon style={{ fontSize: 16, color: '#B91C1C' }} />}
                sx={{ bgcolor: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}
              />
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#006A3B" gutterBottom>
          Driver Management
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Review vehicle licenses, verify profiles, and manage driver fleet authorizations
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #EBEFE8', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', width: 44, height: 44 }}>
              <DirectionsCarIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL FLEET</Typography>
              <Typography variant="h5" fontWeight={800} color="#181D19">{drivers.length}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: pendingCount > 0 ? '1px solid #FED7AA' : '1px solid #EBEFE8', bgcolor: pendingCount > 0 ? '#FFFBEB' : '#FFF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 44, height: 44 }}>
              <PendingActionsIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color={pendingCount > 0 ? '#B45309' : 'text.secondary'} fontWeight={700}>PENDING APPROVAL</Typography>
              <Typography variant="h5" fontWeight={800} color={pendingCount > 0 ? '#B45309' : '#181D19'}>{pendingCount}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #EBEFE8', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#ECFDF5', color: '#047857', width: 44, height: 44 }}>
              <CheckCircleOutlineIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>APPROVED DRIVERS</Typography>
              <Typography variant="h5" fontWeight={800} color="#047857">{approvedCount}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #EBEFE8', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#FEF2F2', color: '#DC2626', width: 44, height: 44 }}>
              <HighlightOffIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>REJECTED</Typography>
              <Typography variant="h5" fontWeight={800} color="#DC2626">{rejectedCount}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 1.5, mb: 2.5, borderRadius: 3, border: '1px solid #EBEFE8', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
        <Tabs
          value={statusTab}
          onChange={(_, val) => setStatusTab(val)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.5,
              fontWeight: 700,
              fontSize: '0.85rem',
              textTransform: 'none',
              borderRadius: 2,
              mr: 1,
            },
            '& .Mui-selected': {
              color: '#006A3B !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#006A3B',
              height: 3,
              borderRadius: 1.5,
            },
          }}
        >
          <Tab value="all" label={`All (${drivers.length})`} />
          <Tab value="pending" label={`Pending (${pendingCount})`} sx={pendingCount > 0 ? { color: '#D97706 !important', fontWeight: 800 } : {}} />
          <Tab value="approved" label={`Approved (${approvedCount})`} />
          <Tab value="rejected" label={`Rejected (${rejectedCount})`} />
        </Tabs>

        <TextField
          size="small"
          placeholder="Search name, phone, plate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            minWidth: { xs: '100%', sm: 280 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: '#FBFDFB',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: '#EBEFE8' },
              '&:hover fieldset': { borderColor: '#006A3B' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#8A9E8A', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Main Table Card */}
      <Paper
        sx={{
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid #EBEFE8',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <Box sx={{ width: '100%', height: 580 }}>
          <DataGrid
            rows={filteredDrivers}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
              sorting: {
                sortModel: [{ field: 'createdAtDisplay', sort: 'desc' }],
              },
            }}
            disableRowSelectionOnClick
            getRowHeight={() => 'auto'}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#F8FAF8',
                borderBottom: '1px solid #EBEFE8',
                color: '#3F4941',
                fontWeight: 800,
                fontSize: '0.8125rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              },
              '& .MuiDataGrid-cell': {
                py: 1.2,
                display: 'flex',
                alignItems: 'center',
                borderColor: '#F0F4F1',
              },
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#F6FBF7',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Reject reason dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setRejectionReason('');
          setSelectedDriverId(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#BA1A1A' }}>
          Reject Driver Application
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
            Please specify why this application cannot be accepted at this time. The driver will see this feedback in the CEYLO mobile app so they can rectify their details.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Invalid vehicle registration document, expired driving licence, or incorrect number plate."
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
              setSelectedDriverId(null);
            }}
            sx={{ color: 'text.secondary', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
