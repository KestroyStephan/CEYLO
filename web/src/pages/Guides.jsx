import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, IconButton, Tabs, Tab } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Guides() {
    const [tab, setTab] = useState(0);
    const [pendingGuides, setPendingGuides] = useState([]);
    const [activeGuides, setActiveGuides] = useState([]);

    useEffect(() => {
        // Listen to Pending Guides
        const qPending = query(collection(db, 'users'), where('role', '==', 'guide_pending'));
        const unsubPending = onSnapshot(qPending, (snap) => {
            setPendingGuides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen to Active Guides
        const qActive = query(collection(db, 'users'), where('role', '==', 'guide'));
        const unsubActive = onSnapshot(qActive, (snap) => {
            setActiveGuides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubPending(); unsubActive(); };
    }, []);

    const handleApprove = async (id) => {
        try {
            await updateDoc(doc(db, 'users', id), { role: 'guide' });
        } catch (e) {
            console.error("Failed to approve guide:", e);
        }
    };

    const handleReject = async (id) => {
        try {
            await updateDoc(doc(db, 'users', id), { role: 'guide_rejected' });
        } catch (e) {
            console.error("Failed to reject guide:", e);
        }
    };

    const renderPending = () => (
        <TableContainer component={Paper} sx={{ borderRadius: 3, mt: 2 }}>
            <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>License No.</strong></TableCell>
                        <TableCell><strong>Languages</strong></TableCell>
                        <TableCell><strong>Experience</strong></TableCell>
                        <TableCell><strong>Cost (LKR)</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pendingGuides.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center">No pending approvals.</TableCell></TableRow>
                    ) : pendingGuides.map((guide) => (
                        <TableRow key={guide.id}>
                            <TableCell>{guide.name}</TableCell>
                            <TableCell>{guide.guideLicense}</TableCell>
                            <TableCell>{guide.languages}</TableCell>
                            <TableCell>{guide.experience} yrs</TableCell>
                            <TableCell>{guide.packageCost}</TableCell>
                            <TableCell align="center">
                                <IconButton color="primary" title="View Documents"><VisibilityIcon /></IconButton>
                                <IconButton color="success" title="Approve" onClick={() => handleApprove(guide.id)}><CheckCircleIcon /></IconButton>
                                <IconButton color="error" title="Reject" onClick={() => handleReject(guide.id)}><CancelIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderActive = () => (
        <TableContainer component={Paper} sx={{ borderRadius: 3, mt: 2 }}>
            <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Specialization</strong></TableCell>
                        <TableCell><strong>Service Area</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {activeGuides.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center">No active guides.</TableCell></TableRow>
                    ) : activeGuides.map((guide) => (
                        <TableRow key={guide.id}>
                            <TableCell>{guide.name}</TableCell>
                            <TableCell>{guide.specializations}</TableCell>
                            <TableCell>{guide.serviceAreas}</TableCell>
                            <TableCell><Chip label="Active" color="success" size="small" /></TableCell>
                            <TableCell align="center">
                                <IconButton color="primary"><VisibilityIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Box>
            <Typography variant="h4" fontWeight={900} color="#37474f" sx={{ mb: 3 }}>
                Guide Management
            </Typography>

            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ bgcolor: '#fff', borderBottom: '1px solid #eee' }}>
                    <Tab label={`Pending Approvals (${pendingGuides.length})`} />
                    <Tab label={`Active Guides (${activeGuides.length})`} />
                </Tabs>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    {tab === 0 ? renderPending() : renderActive()}
                </Box>
            </Paper>
        </Box>
    );
}
