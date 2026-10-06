import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, TextField, Chip, IconButton, Avatar, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Drawer, 
    Divider, InputAdornment, Menu, MenuItem, Stack, Snackbar, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import KPICard from '../components/KPICard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import CampaignIcon from '@mui/icons-material/Campaign';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuUser, setMenuUser] = useState(null);
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState({ title: '', body: '', target: 'all' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const firebaseUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                let mappedRole = data.role || 'tourist';
                if (mappedRole.includes('driver')) mappedRole = 'driver';
                if (mappedRole.includes('guide')) mappedRole = 'guide';
                if (mappedRole === 'user') mappedRole = 'tourist';

                return {
                    id: doc.id,
                    name: data.name || 'Ceylo Member',
                    email: data.email || 'no-email@ceylo.com',
                    role: mappedRole,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
                    lastActivity: data.lastLogin ? 'Recent' : '3 days ago',
                    ecoScore: Math.round(data.ecoScore || 0),
                    isBanned: data.isBanned || false,
                    flagged: data.status === 'rejected' || data.flagged || false
                };
            });
            setUsers(firebaseUsers);
        }, (err) => console.error("Users listen error:", err));

        return () => unsubscribe();
    }, []);

    const handleMenuClick = (event, user) => {
        setAnchorEl(event.currentTarget);
        setMenuUser(user);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuUser(null);
    };

    const openDrawer = (user) => {
        setSelectedUser(user);
        setDrawerOpen(true);
        handleMenuClose();
    };

    const handleBanUser = async (id, currentBan) => {
        try {
            await updateDoc(doc(db, "users", id), { isBanned: !currentBan });
            setSnackbar({ open: true, message: `User successfully ${!currentBan ? 'banned' : 'unbanned'}.`, severity: 'success' });
            setDrawerOpen(false);
            handleMenuClose();
        } catch (e) {
            setSnackbar({ open: true, message: 'Failed to update user status.', severity: 'error' });
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Permanently delete this user profile?")) {
            try {
                await deleteDoc(doc(db, "users", id));
                setSnackbar({ open: true, message: 'User profile permanently deleted.', severity: 'info' });
                setDrawerOpen(false);
                handleMenuClose();
            } catch (e) {
                setSnackbar({ open: true, message: 'Failed to delete user.', severity: 'error' });
            }
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.title || !broadcastMsg.body) return;
        try {
            await addDoc(collection(db, "notifications"), {
                title: broadcastMsg.title, message: broadcastMsg.body, target: broadcastMsg.target, type: 'broadcast', sentAt: new Date()
            });
            setSnackbar({ open: true, message: 'Broadcast sent successfully!', severity: 'success' });
            setBroadcastOpen(false);
            setBroadcastMsg({ title: '', body: '', target: 'all' });
        } catch (e) {}
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.setTextColor(0, 106, 59);
            doc.text('Ceylon Tourism - Users Registry', 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);
            
            const tableColumn = ["Name", "Email", "Role", "Status", "Eco Score"];
            const tableRows = [];

            filteredUsers.forEach(u => {
                tableRows.push([
                    u.name,
                    u.email,
                    u.role,
                    u.isBanned ? 'Banned' : u.flagged ? 'Flagged' : 'Active',
                    `${u.ecoScore}`
                ]);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [0, 106, 59] }
            });

            doc.save('Ceylon_Tourism_Users_Registry.pdf');
            setSnackbar({ open: true, message: 'Registry exported as PDF successfully!', severity: 'success' });
        } catch (err) {
            console.error("Export failed:", err);
            setSnackbar({ open: true, message: 'Failed to generate PDF.', severity: 'error' });
        }
    };

    const filteredUsers = users.filter(u => 
        (filterRole === 'All' || u.role.toLowerCase().includes(filterRole.toLowerCase())) &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const newSignups = users.filter(u => (new Date() - u.createdAt) / (1000 * 60 * 60 * 24) <= 1).length;

    const getStatusChip = (user) => {
        if (user.isBanned) return <Chip label="Banned" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }} />;
        if (user.flagged) return <Chip label="Flagged" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600 }} />;
        return <Chip label="Active" size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 600 }} />;
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header segment */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, borderBottom: '1px solid #EBEFE8', pb: 2 }}>
                <Box>
                    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Users</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                        variant="outlined" 
                        onClick={handleExportPDF}
                        startIcon={<FileDownloadIcon />} 
                        sx={{ color: '#006A3B', borderColor: '#006A3B', fontWeight: 600, borderRadius: 1, px: 3, py: 1, textTransform: 'none' }}
                    >
                        Export Registry
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setBroadcastOpen(true)}
                        startIcon={<CampaignIcon />}
                        sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 600, borderRadius: 1, px: 3, py: 1, textTransform: 'none' }}
                    >
                        Broadcast Alert
                    </Button>
                </Box>
            </Box>

            {/* KPI Banners */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">TOTAL USERS</Typography>
                        <Typography variant="h4" fontWeight={600} color="#006A3B">{users.length.toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Registered Members</Typography>
                    </Paper>
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #D1FAE5', bgcolor: '#F0FDF4', boxShadow: 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="caption" fontWeight={600} color="#059669">NEW SIGNUPS (24H)</Typography>
                                <Typography variant="h4" fontWeight={600} color="#059669">+{newSignups.toLocaleString()}</Typography>
                                <Typography variant="caption" color="#059669" fontWeight={600}>Growing community</Typography>
                            </Box>
                            <PersonAddIcon sx={{ color: '#059669' }} />
                        </Box>
                    </Paper>
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">ADMINISTRATORS</Typography>
                        <Typography variant="h4" fontWeight={600} color="#006A3B">{users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>System maintainers</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Premium Controls Toolbar */}
            <Paper sx={{ mb: 3, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', bgcolor: '#FFF' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                        <FilterListIcon sx={{ color: '#006A3B' }} />
                        <Typography variant="body2" fontWeight={600} color="#006A3B">FILTERS</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    <TextField
                        select
                        size="small"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 1.25, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    >
                        <MenuItem value="All" sx={{ fontWeight: 600 }}>All Roles</MenuItem>
                        <MenuItem value="Admin" sx={{ fontWeight: 600 }}>Admin</MenuItem>
                        <MenuItem value="Tourist" sx={{ fontWeight: 600 }}>Tourist</MenuItem>
                        <MenuItem value="Guide" sx={{ fontWeight: 600 }}>Guide</MenuItem>
                        <MenuItem value="Vendor" sx={{ fontWeight: 600 }}>Vendor</MenuItem>
                    </TextField>
                </Box>
                <TextField 
                    placeholder="Search members, emails..." 
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.25, bgcolor: '#FAFCFA', '& fieldset': { borderColor: '#EBEFE8' } } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                />
            </Paper>

            {/* High Density Table */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1.25, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>NAME</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>EMAIL</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>ROLE</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>ECO SCORE</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>JOIN DATE</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#3F4941' }}>STATUS</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, color: '#3F4941' }}>ACTIONS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers.map((u) => (
                                        <TableRow key={u.id} hover onClick={() => openDrawer(u)} sx={{ cursor: 'pointer' }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0f2f1', color: '#004d40', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        {u.name.substring(0, 2).toUpperCase()}
                                                    </Avatar>
                                                    <Typography variant="body2" fontWeight={600} color="#0F172A">{u.name}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary" fontWeight={500}>{u.email}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }} fontWeight={600}>{u.role.replace('_', ' ')}</Typography></TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} color={u.ecoScore >= 90 ? '#059669' : (u.ecoScore >= 70 ? '#D97706' : '#DC2626')}>
                                                    {u.ecoScore}/100
                                                </Typography>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary" fontWeight={500}>{u.createdAt.toLocaleDateString('en-GB')}</Typography></TableCell>
                                            <TableCell>{getStatusChip(u)}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuClick(e, u); }}>
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Actions Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { minWidth: 150, borderRadius: 2, border: '1px solid #E2E8F0' } }}>
                <MenuItem onClick={() => openDrawer(menuUser)} sx={{ fontSize: '0.8125rem' }}>View Profile</MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => handleBanUser(menuUser?.id, menuUser?.isBanned)} sx={{ fontSize: '0.8125rem', color: menuUser?.isBanned ? 'success.main' : 'warning.main' }}>
                    {menuUser?.isBanned ? 'Unban User' : 'Ban User'}
                </MenuItem>
                <MenuItem onClick={() => handleDeleteUser(menuUser?.id)} sx={{ fontSize: '0.8125rem', color: 'error.main' }}>Delete Data</MenuItem>
            </Menu>

            {/* Side Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}>
                {selectedUser && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ width: 48, height: 48, bgcolor: '#0F172A' }}>{selectedUser.name.substring(0,2).toUpperCase()}</Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={600} color="#0F172A" sx={{ lineHeight: 1.2 }}>{selectedUser.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                                </Box>
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
                        </Box>
                        <Box sx={{ p: 3, flexGrow: 1 }}>
                            <Box sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8F9FA', display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getStatusChip(selectedUser)}
                                <Typography variant="caption" color="text.secondary">Joined {selectedUser.createdAt.toLocaleDateString('en-GB')}</Typography>
                            </Box>
                            <Typography variant="subtitle2" color="#64748B" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Details</Typography>
                            <Stack spacing={2}>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Role</Typography><Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{selectedUser.role.replace('_', ' ')}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Eco Score</Typography><Typography variant="body2" fontWeight={600} color="#0F172A">{selectedUser.ecoScore}/100</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" display="block">Last Activity</Typography><Typography variant="body2" fontWeight={500}>{selectedUser.lastActivity}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" display="block">User ID</Typography><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{selectedUser.id}</Typography></Box>
                            </Stack>
                        </Box>
                        <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8F9FA' }}>
                            <Button variant="outlined" color="error" fullWidth onClick={() => handleBanUser(selectedUser.id, selectedUser.isBanned)} sx={{ mb: 1 }}>
                                {selectedUser.isBanned ? 'Unban User' : 'Suspend Account'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Drawer>

            <Dialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} PaperProps={{ sx: { borderRadius: 2, width: 400 } }}>
                <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Broadcast Notification</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Title" size="small" margin="normal" value={broadcastMsg.title} onChange={e => setBroadcastMsg({...broadcastMsg, title: e.target.value})} />
                    <TextField fullWidth multiline rows={3} label="Message" size="small" margin="normal" value={broadcastMsg.body} onChange={e => setBroadcastMsg({...broadcastMsg, body: e.target.value})} />
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setBroadcastOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSendBroadcast} sx={{ bgcolor: '#0F172A' }}>Send</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
