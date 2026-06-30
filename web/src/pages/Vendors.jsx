import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Button, Alert, Dialog,
  DialogTitle, DialogContent, DialogContentText,
  DialogActions, TextField, Snackbar, Link, Stack, Avatar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  collection, query, onSnapshot, orderBy,
  doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import StoreIcon from '@mui/icons-material/Store';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false, message: '', severity: 'success'
  });

  useEffect(() => {
    const q = query(
      collection(db, 'vendors'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(data);
        setLoading(false);
      },
      (error) => {
        console.error('Vendors fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const pendingCount = vendors.filter(
    (v) => v.status === 'pending_verification'
  ).length;

  const handleApprove = async (vendorId) => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        rejectionReason: '',
      });

      await updateDoc(doc(db, 'users', vendorId), {
        role: 'vendor_active',
        status: 'approved',
      });

      setSnackbar({
        open: true,
        message: 'Vendor approved! They can now login.',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error approving vendor: ' + error.message,
        severity: 'error',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await updateDoc(doc(db, 'vendors', selectedVendorId), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', selectedVendorId), {
        role: 'vendor_rejected',
        status: 'rejected',
      });

      setSnackbar({
        open: true,
        message: 'Vendor application rejected.',
        severity: 'info',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedVendorId(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error rejecting vendor: ' + error.message,
        severity: 'error',
      });
    }
  };

  const columns = [
    {
      field: 'businessName',
      headerName: 'Business / Owner',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
          <Avatar sx={{ bgcolor: '#e0f2f1', color: '#00695c', mr: 2 }}>
            <StoreIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {params.row.businessName || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.phone || ''}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email Address',
      width: 220,
    },
    {
      field: 'businessType',
      headerName: 'Category',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value || 'N/A'} size="small" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: (params) => {
        const statusConfig = {
          pending_verification: { label: 'Pending', color: 'warning' },
          approved: { label: 'Approved', color: 'success' },
          rejected: { label: 'Rejected', color: 'error' },
        };
        const config = statusConfig[params.value] || 
          { label: params.value, color: 'default' };
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
      field: 'verificationDocs',
      headerName: 'Verification Docs',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
          {params.row.nicFrontUrl && (
            <Link 
              href={params.row.nicFrontUrl} 
              target="_blank" 
              rel="noopener"
              variant="caption"
              sx={{ textDecoration: 'none', fontWeight: 600, color: '#00695c' }}
            >
              NIC Front
            </Link>
          )}
          {params.row.nicBackUrl && (
            <Link 
              href={params.row.nicBackUrl} 
              target="_blank" 
              rel="noopener"
              variant="caption"
              sx={{ textDecoration: 'none', fontWeight: 600, color: '#00695c' }}
            >
              NIC Back
            </Link>
          )}
          {params.row.businessCertUrl && (
            <Link 
              href={params.row.businessCertUrl} 
              target="_blank" 
              rel="noopener"
              variant="caption"
              sx={{ textDecoration: 'none', fontWeight: 600, color: '#00695c' }}
            >
              Certificate
            </Link>
          )}
          {!params.row.nicFrontUrl && 
           !params.row.nicBackUrl && 
           !params.row.businessCertUrl && (
            <Typography variant="caption" color="text.secondary">
              No docs uploaded
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
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
                  setSelectedVendorId(params.row.id);
                  setRejectDialogOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No action needed
            </Typography>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>
        Vendor Management
      </Typography>

      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pendingCount} vendor application(s) awaiting review
        </Alert>
      )}

      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={vendors}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Vendor Application</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide a reason for rejection. The vendor will see this message.
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
