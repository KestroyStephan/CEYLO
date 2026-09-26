import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    AppBar, Toolbar, Typography, Drawer, List, ListItem, 
    ListItemIcon, ListItemText, IconButton, Box, ListItemButton, 
    Badge, Popover, Divider, Avatar, Stack, Chip, InputBase
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import StoreIcon from '@mui/icons-material/Store';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import WarningIcon from '@mui/icons-material/Warning';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import EventIcon from '@mui/icons-material/Event';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MapIcon from '@mui/icons-material/Map';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CampaignIcon from '@mui/icons-material/Campaign';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const drawerWidth = 280;

function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifAnchorEl, setNotifAnchorEl] = useState(null);
    const [pendingItems, setPendingItems] = useState([]);
    const { logout, currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const pendingList = { drivers: [], guides: [], vendors: [], sos: [] };
        const updatePending = () => {
            const items = [];
            pendingList.sos.forEach(s => items.push({ id: s.id, title: `ACTIVE SOS ALERT!`, subtitle: `Tourist: ${s.userName || 'Unknown'}`, type: 'sos', path: '/sos', isUrgent: true }));
            pendingList.vendors.forEach(v => items.push({ id: v.id, title: `Vendor Pending: ${v.businessName || 'Unknown'}`, subtitle: `${v.businessType || 'Vendor'}`, type: 'vendor', path: '/vendors' }));
            setPendingItems(items);
        };
        const qVendors = query(collection(db, "vendors"), where("verificationStatus", "==", "pending"));
        const unsubVendors = onSnapshot(qVendors, (snap) => { pendingList.vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        const qSOS = query(collection(db, "sos_alerts"), where("status", "==", "active"));
        const unsubSOS = onSnapshot(qSOS, (snap) => { pendingList.sos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        return () => { unsubVendors(); unsubSOS(); };
    }, []);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleLangClick = (e) => setAnchorEl(e.currentTarget);
    const handleLangClose = () => setAnchorEl(null);
    const changeLanguage = (lang) => { i18n.changeLanguage(lang); handleLangClose(); };
    const handleLogout = async () => { try { await logout(); window.location.href = '/login'; } catch (error) {} };

    const menuGroups = [
        {
            title: "OVERVIEW",
            items: [ { text: t('dashboard'), icon: <DashboardIcon sx={{ fontSize: 20 }}/>, path: '/', allowedRoles: ['all'] } ]
        },
        {
            title: "OPERATIONS",
            items: [
                { text: t('bookings'), icon: <BookOnlineIcon sx={{ fontSize: 20 }}/>, path: '/bookings', allowedRoles: ['all'] },
                { text: t('sos_monitor'), icon: <WarningIcon sx={{ fontSize: 20 }}/>, path: '/sos', allowedRoles: ['all'] },
                { text: t('cultural_events'), icon: <EventIcon sx={{ fontSize: 20 }}/>, path: '/events', allowedRoles: ['all'] },
            ]
        },
        {
            title: "TOURISM CONTENT",
            items: [
                { text: t('destinations'), icon: <TravelExploreIcon sx={{ fontSize: 20 }}/>, path: '/destinations', allowedRoles: ['all'] },
                { text: 'Guides', icon: <MapIcon sx={{ fontSize: 20 }}/>, path: '/guides', allowedRoles: ['all'] },
            ]
        },
        {
            title: "PARTNERS & USERS",
            items: [
                { text: t('vendors'), icon: <StoreIcon sx={{ fontSize: 20 }}/>, path: '/vendors', allowedRoles: ['all'] },
                { text: t('users'), icon: <PeopleIcon sx={{ fontSize: 20 }}/>, path: '/users', allowedRoles: ['all'] },
            ]
        },
        {
            title: "INTELLIGENCE",
            items: [
                { text: t('ai_center'), icon: <AutoAwesomeIcon sx={{ fontSize: 20 }}/>, path: '/ai-center', allowedRoles: ['all'] },
                { text: t('reports'), icon: <AssessmentIcon sx={{ fontSize: 20 }}/>, path: '/reports', allowedRoles: ['all'] },
                { text: t('system_health'), icon: <HealthAndSafetyIcon sx={{ fontSize: 20 }}/>, path: '/health', allowedRoles: ['all'] },
            ]
        }
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0B1121', color: '#F8FAFC' }}>
            {/* Premium Dark Logo Area */}
            <Box sx={{ px: 3, py: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
                    <Typography variant="h6" fontWeight={900} color="#FFF">C</Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1 }}>CEYLO</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', fontSize: '0.65rem', letterSpacing: '0.1em' }}>WORKSPACE</Typography>
                </Box>
            </Box>

            {/* Menu Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
                {menuGroups.map((group) => {
                    return (
                        <Box key={group.title} sx={{ mb: 3 }}>
                            <Typography variant="caption" sx={{ px: 2, mb: 1.5, display: 'block', fontWeight: 700, color: '#475569', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                                {group.title}
                            </Typography>
                            <List disablePadding>
                                {group.items.map((item) => {
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton
                                                component={NavLink}
                                                to={item.path}
                                                sx={{
                                                    borderRadius: '12px',
                                                    py: 1,
                                                    px: 2,
                                                    color: isActive ? '#FFFFFF' : '#94A3B8',
                                                    bgcolor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                    transition: 'all 0.2s',
                                                    border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                                                    '&:hover': {
                                                        bgcolor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                        color: '#FFFFFF'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#3B82F6' : '#64748B' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={item.text} 
                                                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 }} 
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    );
                })}
            </Box>

            {/* Bottom Premium Profile Area */}
            <Box sx={{ p: 2, m: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#1E293B', color: '#FFF', fontWeight: 600, fontSize: '0.85rem' }}>
                            {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : (currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : 'U')}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="#F8FAFC" sx={{ lineHeight: 1.2 }}>
                                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
                            </Typography>
                            <Typography variant="caption" color="#64748B" sx={{ fontSize: '0.7rem' }}>
                                {userRole ? userRole.replace('_', ' ').toUpperCase() : 'ADMIN'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleLogout} sx={{ color: '#64748B', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                        <LogoutIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
            <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
                <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 4 } }}>
                    <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' }, color: '#0F172A' }}><MenuIcon /></IconButton>
                    
                    {/* Sleek Topbar Search */}
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, alignItems: 'center', 
                            bgcolor: '#F8FAFC', borderRadius: '10px', px: 2, py: 0.75, width: 360,
                            border: '1px solid #E2E8F0', transition: 'all 0.2s',
                            '&:hover': { borderColor: '#CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }
                        }}>
                            <SearchIcon sx={{ color: '#64748B', fontSize: 20, mr: 1.5 }} />
                            <InputBase placeholder="Quick search..." sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#0F172A' }} />
                            <Chip label="⌘ K" size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#FFFFFF', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 1.5 }} />
                        </Box>
                    </Box>
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton onClick={handleLangClick} sx={{ color: '#475569', bgcolor: '#F8FAFC', '&:hover': { bgcolor: '#F1F5F9' } }}>
                            <LanguageIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ color: '#475569', bgcolor: '#F8FAFC', '&:hover': { bgcolor: '#F1F5F9' } }}>
                            <Badge badgeContent={pendingItems.length} color="error" sx={{ '& .MuiBadge-badge': { height: 18, minWidth: 18, fontWeight: 700, border: '2px solid #FFF' } }}>
                                <NotificationsIcon sx={{ fontSize: 20 }} />
                            </Badge>
                        </IconButton>
                    </Stack>

                    {/* Popovers */}
                    <Popover open={Boolean(notifAnchorEl)} anchorEl={notifAnchorEl} onClose={() => setNotifAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 340, mt: 1 } }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
                            <Typography variant="subtitle1" fontWeight={700}>Inbox Alerts</Typography>
                            <Chip label={`${pendingItems.length} New`} size="small" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#E0E7FF', color: '#4338CA' }} />
                        </Box>
                        <List sx={{ p: 0 }}>
                            {pendingItems.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">You're all caught up!</Typography></Box>
                            ) : (
                                pendingItems.map((item) => (
                                    <ListItem key={item.id} disablePadding divider>
                                        <ListItemButton onClick={() => { setNotifAnchorEl(null); navigate(item.path); }} sx={{ py: 2 }}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2" fontWeight={700} color={item.isUrgent ? 'error.main' : 'text.primary'}>{item.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
                                            </Stack>
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Popover>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }}>
                    {drawer}
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }} open>
                    {drawer}
                </Drawer>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: '88px !important', maxWidth: 1600, mx: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
