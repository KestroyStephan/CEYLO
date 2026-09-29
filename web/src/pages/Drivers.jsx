import { useState, useEffect } from 'react';
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

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState(null);
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
          // Flatten createdAt for DataGrid display
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

  // Approve driver
  const handleApprove = async (driverId) => {
    try {
      // Update drivers collection
      await updateDoc(doc(db, 'drivers', driverId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        rejectionReason: '',
      });

      // Update users collection — triggers DriverPendingScreen 
      // real-time listener to auto-redirect driver to dashboard
      await updateDoc(doc(db, 'users', driverId), {
        role: 'driver_active',
        status: 'approved',
      });

      setSnackbar({
        open: true,
        message: 'Driver approved! They can now login to the driver portal.',
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
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.row.name || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.phone || ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email Address',
      width: 220,
    },
    {
      field: 'vehicleType',
      headerName: 'Vehicle Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'licensePlate',
      headerName: 'License Plate',
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.06)',
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          {params.value || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'licenseNumber',
      headerName: 'License No.',
      width: 130,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => {
        const statusConfig = {
          pending_verification: {
            label: 'Pending',
            color: 'warning',
          },
          approved: {
            label: 'Approved',
            color: 'success',
          },
          rejected: {
            label: 'Rejected',
            color: 'error',
          },
        };
        const config = statusConfig[params.value] || {
          label: params.value || 'Unknown',
          color: 'default',
        };
        return (
          <Chip
            label={config.label}
            color={config.color}
            size="small"
          />
        );
      },
    },
    {
      field: 'createdAtDisplay',
      headerName: 'Applied On',
      width: 140,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {params.row.status === 'pending_verification' ? (
            <>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => handleApprove(params.row.id)}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => {
                  setSelectedDriverId(params.row.id);
                  setRejectDialogOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          ) : params.row.status === 'approved' ? (
            <Chip label="Approved" color="success" size="small" />
          ) : params.row.status === 'rejected' ? (
            <Stack>
              <Chip label="Rejected" color="error" size="small" />
              {params.row.rejectionReason && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {params.row.rejectionReason}
                </Typography>
              )}
            </Stack>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Driver Management
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review and approve driver registration applications
      </Typography>

      {/* Pending alert banner */}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pendingCount} driver application
          {pendingCount !== 1 ? 's' : ''} awaiting your review
        </Alert>
      )}

      {/* DataGrid */}
      <Box
        sx={{
          height: 600,
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <DataGrid
          rows={drivers}
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
            '& .MuiDataGrid-cell': {
              py: 1,
              alignItems: 'center',
            },
          }}
        />
      </Box>

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
      >
        <DialogTitle>Reject Driver Application</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejection. The driver 
            will see this message on their pending screen.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Incomplete documents, Invalid license plate..."
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRejectDialogOpen(false);
              setRejectionReason('');
              setSelectedDriverId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            color="error"
            variant="contained"
            disabled={!rejectionReason.trim()}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/error snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
