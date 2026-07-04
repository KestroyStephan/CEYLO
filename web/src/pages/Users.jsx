import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    TextField, Chip, IconButton, Tooltip, Avatar, List, ListItem,
    Divider, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert, Pagination, Dialog,
    DialogTitle, DialogContent, DialogActions, LinearProgress
} from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Icons
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupIcon from '@mui/icons-material/Group';
import PieChartIcon from '@mui/icons-material/PieChart';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Default mock registry matching high-fidelity layout
const defaultUsers = [
    {
        id: 'user-mock-1',
        name: 'Amara Perera',
        email: 'amara.p@example.com',
        role: 'tourist',
        createdAt: new Date('2023-10-12'),
        lastActivity: '2h ago',
        ecoScore: 94,
        isBanned: false,
        flagged: false
    },
    {
        id: 'user-mock-2',
        name: 'Sunil Rajapaksa',
        email: 'sunil.r@ceylodrivers.com',
        role: 'driver',
        createdAt: new Date('2023-01-05'),
        lastActivity: '14m ago',
        ecoScore: 78,
        isBanned: false,
        flagged: false
    },
    {
        id: 'user-mock-3',
        name: 'David Miller',
        email: 'd.miller@outlook.com',
        role: 'tourist',
        createdAt: new Date('2024-03-18'),
        lastActivity: '3 days ago',
        ecoScore: 42,
        isBanned: false,
        flagged: true
    },
    {
        id: 'user-mock-4',
        name: 'Kavindi Silva',
        email: 'kavindi.s@ceylo.com',
        role: 'guide',
        createdAt: new Date('2024-02-10'),
        lastActivity: '5h ago',
        ecoScore: 89,
        isBanned: false,
        flagged: false
    },
    {
        id: 'user-mock-5',
        name: 'Sharoobini K.',
        email: 'sharoobini.k@ceylo.com',
        role: 'admin',
        createdAt: new Date('2022-08-15'),
        lastActivity: 'Active Now',
        ecoScore: 98,
        isBanned: false,
        flagged: false
    }
];

export default function Users() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterRole, setFilterRole] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterScoreTier, setFilterScoreTier] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    
    // Broadcast dialog
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState({ title: '', body: '', target: 'all' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const firebaseUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Determine clean role name
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
                    ecoScore: Math.round(data.ecoScore || 75),
                    isBanned: data.isBanned || false,
                    flagged: data.status === 'rejected' || data.flagged || false
                };
            });

            // Merge with mock registry
            let merged = [...firebaseUsers];
            defaultUsers.forEach(mock => {
                if (!merged.some(u => u.id === mock.id || u.email === mock.email)) {
                    merged.push(mock);
                }
            });

            setUsers(merged);
        }, (err) => {
            console.error("Users listen error:", err);
            let merged = [];
            defaultUsers.forEach(mock => merged.push(mock));
            setUsers(merged);
        });

        return () => {
            setTimeout(() => {
                if (typeof unsubscribe === 'function') unsubscribe();
            }, 0);
        };
    }, []);

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery, filterRole, filterStatus, filterScoreTier]);

    const handleBanUser = async (id, currentBan) => {
        try {
            await updateDoc(doc(db, "users", id), { isBanned: !currentBan });
            setSnackbar({
                open: true,
                message: `User accounts successfully ${!currentBan ? 'banned' : 'unbanned'}!`,
                severity: 'success'
            });
        } catch (e) {
            console.error("Error toggling ban state:", e);
            setSnackbar({ open: true, message: 'Failed to update user status: ' + e.message, severity: 'error' });
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this user profile?")) {
            try {
                await deleteDoc(doc(db, "users", id));
                setSnackbar({ open: true, message: 'User profile permanently deleted.', severity: 'info' });
            } catch (e) {
                console.error("Error deleting user:", e);
                setSnackbar({ open: true, message: 'Failed to delete user: ' + e.message, severity: 'error' });
            }
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.title || !broadcastMsg.body) {
            setSnackbar({ open: true, message: 'Please enter broadcast title and description.', severity: 'warning' });
            return;
        }

        try {
            // Write notification broadcast queue
            await addDoc(collection(db, "notifications"), {
                title: broadcastMsg.title,
                message: broadcastMsg.body,
                target: broadcastMsg.target,
                type: 'broadcast',
                sentAt: new Date()
            });

            setSnackbar({ open: true, message: 'System broadcast notification queued successfully!', severity: 'success' });
            setBroadcastOpen(false);
            setBroadcastMsg({ title: '', body: '', target: 'all' });
        } catch (e) {
            console.error("Error posting broadcast:", e);
            setSnackbar({ open: true, message: 'Broadcast failed: ' + e.message, severity: 'error' });
        }
    };

    // Filters logic
    const filteredUsers = users
        .filter(u => filterRole === 'All' || u.role.toLowerCase() === filterRole.toLowerCase())
        .filter(u => {
            if (filterStatus === 'All') return true;
            if (filterStatus === 'Banned') return u.isBanned;
            if (filterStatus === 'Flagged') return u.flagged;
            if (filterStatus === 'Active') return !u.isBanned && !u.flagged;
            return true;
        })
        .filter(u => {
            if (filterScoreTier === 'All') return true;
            if (filterScoreTier === 'Gold') return u.ecoScore >= 90;
            if (filterScoreTier === 'Green') return u.ecoScore >= 70 && u.ecoScore < 90;
            if (filterScoreTier === 'Teal') return u.ecoScore < 70;
            return true;
        })
        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const rowsPerPage = 7;
    const startIndex = (page - 1) * rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

    // KPI Metrics calculation
    const totalActiveCount = users.filter(u => !u.isBanned).length;
    const touristsCount = users.filter(u => u.role === 'tourist').length;
    const driversGuidesCount = users.filter(u => u.role === 'driver' || u.role === 'guide').length;
    const touristRatio = users.length > 0 ? Math.round((touristsCount / users.length) * 100) : 65;
    const driverRatio = users.length > 0 ? Math.round((driversGuidesCount / users.length) * 100) : 35;

    const getEcoScoreDetails = (score) => {
        if (score >= 90) return { tier: 'HERITAGE GOLD', color: '#2E7D32', trend: 'up' };
        if (score >= 70) return { tier: 'CEYLON GREEN', color: '#F57C00', trend: 'up' };
        return { tier: 'OCEAN TEAL', color: '#00838F', trend: 'down' };
    };

    const formatJoinDate = (date) => {
        if (!date) return 'Oct 12, 2023';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 1 }}>
            
            {/* Header section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #EBEFE8', pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="h5" fontWeight={950} color="#006A3B">
                        User Management
                    </Typography>
                </Box>
                <TextField 
                    placeholder="Search system users..." 
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ bgcolor: '#FFF', width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
            </Box>

            {/* KPI Cards row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                
                {/* Total Active Users */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', position: 'relative' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Avatar sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }}><GroupIcon /></Avatar>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#2E7D32' }}>
                                <TrendingUpIcon fontSize="small" />
                                <Typography variant="caption" fontWeight={900}>+12%</Typography>
                            </Box>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ display: 'block', mb: 0.5 }}>
                            TOTAL ACTIVE USERS
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#181D19">
                            {totalActiveCount.toLocaleString()}
                        </Typography>
                    </Paper>
                </Grid>

                {/* New Signups */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Avatar sx={{ bgcolor: '#E0F7FA', color: '#00838F' }}><PersonAddIcon /></Avatar>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>Last 24h</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ display: 'block', mb: 0.5 }}>
                            NEW SIGNUPS
                        </Typography>
                        <Typography variant="h4" fontWeight={950} color="#181D19">
                            156
                        </Typography>
                    </Paper>
                </Grid>

                {/* Role Distribution progress */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={900}>ROLE DISTRIBUTION</Typography>
                            <PieChartIcon sx={{ color: '#777' }} />
                        </Stack>
                        <Stack spacing={1.5}>
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight={800}>Tourists</Typography>
                                    <Typography variant="caption" fontWeight={900} color="#2E7D32">{touristsCount.toLocaleString()}</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={touristRatio} sx={{ height: 6, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />
                            </Box>
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight={800}>Drivers/Guides</Typography>
                                    <Typography variant="caption" fontWeight={900} color="#00838F">{driversGuidesCount.toLocaleString()}</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={driverRatio} sx={{ height: 6, borderRadius: 2, bgcolor: '#E0F7FA', '& .MuiLinearProgress-bar': { bgcolor: '#00838F' } }} />
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

            </Grid>

            {/* Filter and Table Panel */}
            <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #EBEFE8', boxShadow: 'none', mb: 4 }}>
                
                {/* Filter header row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Stack direction="row" spacing={2}>
                        <FormControl size="small" sx={{ width: 140 }}>
                            <InputLabel id="role-select">User Role</InputLabel>
                            <Select
                                labelId="role-select"
                                value={filterRole}
                                label="User Role"
                                onChange={(e) => setFilterRole(e.target.value)}
                                sx={{ borderRadius: 3 }}
                            >
                                <MenuItem value="All">All Roles</MenuItem>
                                <MenuItem value="Tourist">Tourist</MenuItem>
                                <MenuItem value="Driver">Driver</MenuItem>
                                <MenuItem value="Guide">Guide</MenuItem>
                                <MenuItem value="Admin">Admin</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 140 }}>
                            <InputLabel id="status-select">Account Status</InputLabel>
                            <Select
                                labelId="status-select"
                                value={filterStatus}
                                label="Account Status"
                                onChange={(e) => setFilterStatus(e.target.value)}
                                sx={{ borderRadius: 3 }}
                            >
                                <MenuItem value="All">All Status</MenuItem>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Flagged">Flagged</MenuItem>
                                <MenuItem value="Banned">Banned</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 150 }}>
                            <InputLabel id="tier-select">Eco-Score Tier</InputLabel>
                            <Select
                                labelId="tier-select"
                                value={filterScoreTier}
                                label="Eco-Score Tier"
                                onChange={(e) => setFilterScoreTier(e.target.value)}
                                sx={{ borderRadius: 3 }}
                            >
                                <MenuItem value="All">Any Score</MenuItem>
                                <MenuItem value="Gold">Heritage Gold (90+)</MenuItem>
                                <MenuItem value="Green">Ceylon Green (70-89)</MenuItem>
                                <MenuItem value="Teal">Ocean Teal (&lt;70)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    <Stack direction="row" spacing={1.5}>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<FilterListIcon />}
                            sx={{ borderColor: '#BECABE', color: '#181D19', fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                        >
                            Filters
                        </Button>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<FileDownloadIcon />}
                            sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                        >
                            Export CSV
                        </Button>
                    </Stack>
                </Box>

                {/* Users Registry Table */}
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>USER</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ROLE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>JOIN DATE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>LAST ACTIVITY</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ECO-SCORE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>STATUS</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#3F4941' }}>ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.map((u) => {
                                const eco = getEcoScoreDetails(u.ecoScore);
                                return (
                                    <TableRow key={u.id} hover>
                                        
                                        {/* Profile name and email */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 800 }}>
                                                    {u.name.split(' ').map(n => n[0]).join('')}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={800}>{u.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>

                                        {/* Mapped roles chips */}
                                        <TableCell>
                                            <Chip 
                                                label={u.role.toUpperCase()} 
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 900, fontSize: '0.65rem',
                                                    bgcolor: u.role === 'admin' ? '#F3E5F5' : u.role === 'driver' ? '#E0F7FA' : u.role === 'guide' ? '#FFF8E1' : '#E8F5E9',
                                                    color: u.role === 'admin' ? '#7B1FA2' : u.role === 'driver' ? '#00838F' : u.role === 'guide' ? '#F57F17' : '#2E7D32'
                                                }}
                                            />
                                        </TableCell>

                                        {/* Join Date */}
                                        <TableCell sx={{ fontWeight: 650, color: '#555' }}>
                                            {formatJoinDate(u.createdAt)}
                                        </TableCell>

                                        {/* Last Activity */}
                                        <TableCell sx={{ fontWeight: 550, color: '#777' }}>
                                            {u.lastActivity}
                                        </TableCell>

                                        {/* Eco passport metrics */}
                                        <TableCell>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={900} color={eco.color}>
                                                        {u.ecoScore}
                                                    </Typography>
                                                    {eco.trend === 'up' ? (
                                                        <ArrowUpwardIcon sx={{ color: '#2E7D32', fontSize: 12 }} />
                                                    ) : (
                                                        <ArrowDownwardIcon sx={{ color: '#BA1A1A', fontSize: 12 }} />
                                                    )}
                                                </Box>
                                                <Typography variant="caption" fontSize="0.55rem" fontWeight={900} color="text.secondary" sx={{ display: 'block' }}>
                                                    {eco.tier}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        {/* Mapped Status */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ 
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    bgcolor: u.isBanned ? '#F57C00' : u.flagged ? '#BA1A1A' : '#2E7D32' 
                                                }} />
                                                <Typography variant="caption" fontWeight={850} color={u.isBanned ? '#F57C00' : u.flagged ? '#BA1A1A' : '#2E7D32'}>
                                                    {u.isBanned ? 'Banned' : u.flagged ? 'Flagged' : 'Active'}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        {/* Action buttons */}
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5}>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => setSelectedUser(u)}
                                                    sx={{ color: '#555' }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleBanUser(u.id, u.isBanned)}
                                                    color={u.isBanned ? 'success' : 'warning'}
                                                >
                                                    <BlockIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>

                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Footer Pagination */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                    </Typography>
                    <Pagination 
                        count={Math.ceil(filteredUsers.length / rowsPerPage)} 
                        page={page} 
                        onChange={(e, p) => setPage(p)} 
                        size="small" 
                        color="primary" 
                    />
                </Box>

            </Paper>

            {/* Quick Broadcast Notification Dialog */}
            <Dialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Create New Alert Broadcast</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 400 }}>
                        <TextField 
                            label="BROADCAST TITLE" 
                            fullWidth
                            value={broadcastMsg.title}
                            onChange={(e) => setBroadcastMsg({ ...broadcastMsg, title: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <TextField 
                            label="MESSAGE CONTENT" 
                            fullWidth
                            multiline
                            rows={4}
                            value={broadcastMsg.body}
                            onChange={(e) => setBroadcastMsg({ ...broadcastMsg, body: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <FormControl fullWidth>
                            <InputLabel id="dialog-target-label">TARGET AUDIENCE</InputLabel>
                            <Select
                                labelId="dialog-target-label"
                                value={broadcastMsg.target}
                                label="TARGET AUDIENCE"
                                onChange={(e) => setBroadcastMsg({ ...broadcastMsg, target: e.target.value })}
                                sx={{ borderRadius: 3 }}
                            >
                                <MenuItem value="all">All Users</MenuItem>
                                <MenuItem value="tourist">Tourists Only</MenuItem>
                                <MenuItem value="driver">Drivers Only</MenuItem>
                                <MenuItem value="guide">Guides Only</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBroadcastOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
                    <Button onClick={handleSendBroadcast} variant="contained" sx={{ bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' }, fontWeight: 800, borderRadius: 2 }}>Send Broadcast</Button>
                </DialogActions>
            </Dialog>

            {/* User View Details sheet dialog */}
            {selectedUser && (
                <Dialog open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                    <DialogTitle sx={{ fontWeight: 900 }}>User Profile Sheet</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2.5} sx={{ minWidth: 320, pt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 800 }}>
                                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={900}>{selectedUser.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{selectedUser.email}</Typography>
                                </Box>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>SYSTEM ACCOUNT ROLE</Typography>
                                <Chip label={selectedUser.role.toUpperCase()} size="small" sx={{ fontWeight: 800 }} />
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>JOIN DATE</Typography>
                                    <Typography variant="body2" fontWeight={700}>{formatJoinDate(selectedUser.createdAt)}</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>STATUS</Typography>
                                    <Typography variant="body2" fontWeight={700} color={selectedUser.isBanned ? '#F57C00' : selectedUser.flagged ? '#BA1A1A' : '#2E7D32'}>
                                        {selectedUser.isBanned ? 'Banned' : selectedUser.flagged ? 'Flagged' : 'Active'}
                                    </Typography>
                                </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F9FBF9', p: 1.5, borderRadius: 2, border: '1px solid #EBEFE8' }}>
                                <Box>
                                    <Typography variant="caption" fontWeight={900} color="text.secondary">ECO-PASSPORT SCORE</Typography>
                                    <Typography variant="body2" fontWeight={850} color="#006A3B">{getEcoScoreDetails(selectedUser.ecoScore).tier}</Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={950} color="#006A3B">{selectedUser.ecoScore}%</Typography>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setSelectedUser(null)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Custom Floating Alert Broadcast Button */}
            <Tooltip title="New Broadcast Alert">
                <Button 
                    onClick={() => setBroadcastOpen(true)}
                    sx={{ 
                        position: 'fixed', bottom: 24, right: 24, 
                        width: 56, height: 56, borderRadius: '50%', 
                        bgcolor: '#FF5252', '&:hover': { bgcolor: '#FF1744' },
                        boxShadow: 3, minWidth: 0, color: '#FFF'
                    }}
                >
                    <AddAlertIcon />
                </Button>
            </Tooltip>

            {/* Custom Toast Alert */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
}
