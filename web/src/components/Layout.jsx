import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    AppBar, Toolbar, Typography, Drawer, List, ListItem, 
    ListItemIcon, ListItemText, IconButton, Box, ListItemButton, 
    Badge, Popover, Divider, Avatar, Stack, Chip, Button, InputBase
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
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CampaignIcon from '@mui/icons-material/Campaign';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const drawerWidth = 260;

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
            pendingList.drivers.forEach(d => items.push({ id: d.id, title: `Driver Pending: ${d.name || 'Unknown'}`, subtitle: d.email || 'No email', type: 'driver', path: '/users' }));
            pendingList.guides.forEach(g => items.push({ id: g.id, title: `Guide Pending: ${g.name || 'Unknown'}`, subtitle: `License: ${g.guideLicense || 'N/A'}`, type: 'guide', path: '/guides' }));
            pendingList.vendors.forEach(v => items.push({ id: v.id, title: `Vendor Pending: ${v.businessName || 'Unknown'}`, subtitle: `${v.businessType || 'Vendor'} • ${v.phone || ''}`, type: 'vendor', path: '/vendors' }));
            setPendingItems(items);
        };

        const qDrivers = query(collection(db, "users"), where("role", "==", "driver_pending"));
        const unsubDrivers = onSnapshot(qDrivers, (snap) => { pendingList.drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        const qGuides = query(collection(db, "guides"), where("verificationStatus", "==", "pending"));
        const unsubGuides = onSnapshot(qGuides, (snap) => { pendingList.guides = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        const qVendors = query(collection(db, "vendors"), where("verificationStatus", "==", "pending"));
        const unsubVendors = onSnapshot(qVendors, (snap) => { pendingList.vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        const qSOS = query(collection(db, "sos_alerts"), where("status", "==", "active"));
        const unsubSOS = onSnapshot(qSOS, (snap) => { pendingList.sos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });

        return () => { unsubDrivers(); unsubGuides(); unsubVendors(); unsubSOS(); };
    }, []);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleLangClick = (e) => setAnchorEl(e.currentTarget);
    const handleLangClose = () => setAnchorEl(null);
    const changeLanguage = (lang) => { i18n.changeLanguage(lang); handleLangClose(); };

    const handleLogout = async () => {
        try { await logout(); window.location.href = '/login'; } 
        catch (error) { console.error("Failed to log out", error); }
    };

    const menuGroups = [
        {
            title: "OVERVIEW",
            items: [
                { text: t('dashboard'), icon: <DashboardIcon sx={{ fontSize: 20 }}/>, path: '/', allowedRoles: ['all'] }
            ]
        },
        {
            title: "OPERATIONS",
            items: [
                { text: t('bookings'), icon: <BookOnlineIcon sx={{ fontSize: 20 }}/>, path: '/bookings', allowedRoles: ['finance', 'support', 'vendor_manager', 'manager'] },
                { text: t('sos_monitor'), icon: <WarningIcon sx={{ fontSize: 20 }}/>, path: '/sos', allowedRoles: ['support', 'manager'] },
                { text: t('cultural_events'), icon: <EventIcon sx={{ fontSize: 20 }}/>, path: '/events', allowedRoles: ['content_manager', 'manager'] },
            ]
        },
        {
            title: "TOURISM CONTENT",
            items: [
                { text: t('destinations'), icon: <TravelExploreIcon sx={{ fontSize: 20 }}/>, path: '/destinations', allowedRoles: ['content_manager', 'manager'] },
                { text: 'Guides', icon: <MapIcon sx={{ fontSize: 20 }}/>, path: '/guides', allowedRoles: ['guide_manager', 'manager'] },
            ]
        },
        {
            title: "PARTNERS & USERS",
            items: [
                { text: t('vendors'), icon: <StoreIcon sx={{ fontSize: 20 }}/>, path: '/vendors', allowedRoles: ['vendor_manager', 'manager'] },
                { text: t('users'), icon: <PeopleIcon sx={{ fontSize: 20 }}/>, path: '/users', allowedRoles: ['support', 'manager'] },
            ]
        },
        {
            title: "INTELLIGENCE",
            items: [
                { text: t('ai_center'), icon: <PsychologyIcon sx={{ fontSize: 20 }}/>, path: '/ai-center', allowedRoles: ['manager'] },
                { text: t('reports'), icon: <AssessmentIcon sx={{ fontSize: 20 }}/>, path: '/reports', allowedRoles: ['finance', 'vendor_manager', 'manager'] },
                { text: t('system_health'), icon: <HealthAndSafetyIcon sx={{ fontSize: 20 }}/>, path: '/health', allowedRoles: ['manager'] },
                { text: 'Marketing & SEO', icon: <CampaignIcon sx={{ fontSize: 20 }}/>, path: '/marketing', allowedRoles: ['content_manager', 'manager'] },
                { text: t('notifications'), icon: <NotificationsActiveIcon sx={{ fontSize: 20 }}/>, path: '/notifications', allowedRoles: ['support', 'content_manager', 'manager'] },
            ]
        }
    ];

    const hasAccess = (allowedRoles) => allowedRoles.includes('all') || (userRole && allowedRoles.includes(userRole)) || userRole === 'admin' || userRole === 'super_admin';

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#F8F9FA' }}>
            {/* Branding Logo */}
            <Box sx={{ px: 3, pt: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                    CEYLO
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                    OPERATIONS PLATFORM
                </Typography>
            </Box>

            {/* Menu Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 2 } }}>
                {menuGroups.map((group) => {
                    const groupItems = group.items.filter(item => hasAccess(item.allowedRoles));
                    if (groupItems.length === 0) return null;
                    return (
                        <Box key={group.title} sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ px: 1, mb: 1, display: 'block', fontWeight: 700, color: '#94A3B8', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                {group.title}
                            </Typography>
                            <List disablePadding>
                                {groupItems.map((item) => {
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                                            <ListItemButton
                                                component={NavLink}
                                                to={item.path}
                                                sx={{
                                                    borderRadius: '6px',
                                                    py: 0.75,
                                                    px: 1.5,
                                                    color: isActive ? '#0F172A' : '#475569',
                                                    bgcolor: isActive ? '#F1F5F9' : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: '#F1F5F9',
                                                        color: '#0F172A'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 28, color: isActive ? '#0F172A' : '#64748B' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={item.text} 
                                                    primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500 }} 
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

            {/* Bottom Profile */}
            <Box sx={{ p: 2, borderTop: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0F172A', color: '#FFF', fontWeight: 600, fontSize: '0.75rem' }}>
                            {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : (currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : 'U')}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="#0F172A" sx={{ lineHeight: 1.2 }}>
                                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                            </Typography>
                            <Typography variant="caption" color="#64748B" sx={{ fontSize: '0.65rem' }}>
                                {userRole ? userRole.replace('_', ' ').toUpperCase() : 'ADMIN'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleLogout} sx={{ color: '#64748B', p: 0.5 }}>
                        <LogoutIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8F9FA' }}>
            <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                <Toolbar sx={{ minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' }, color: '#0F172A' }}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    {/* Topbar Search (Simulated for aesthetics) */}
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, 
                            alignItems: 'center', 
                            bgcolor: '#F1F5F9', 
                            borderRadius: '6px', 
                            px: 1.5, 
                            py: 0.5,
                            width: 300,
                            border: '1px solid transparent',
                            '&:hover': { border: '1px solid #CBD5E1' }
                        }}>
                            <SearchIcon sx={{ color: '#64748B', fontSize: 18, mr: 1 }} />
                            <InputBase 
                                placeholder="Search CEYLO..." 
                                sx={{ flex: 1, fontSize: '0.8125rem' }} 
                            />
                            <Chip label="⌘ K" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#E2E8F0', color: '#475569', borderRadius: 1 }} />
                        </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={handleLangClick} sx={{ color: '#475569' }} size="small">
                            <LanguageIcon sx={{ fontSize: 20 }} />
                            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>{i18n.language.toUpperCase()}</Typography>
                        </IconButton>
                        
                        <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ color: '#475569' }} size="small">
                            <Badge badgeContent={pendingItems.length} color="error" sx={{ '& .MuiBadge-badge': { height: 16, minWidth: 16 } }}>
                                <NotificationsIcon sx={{ fontSize: 20 }} />
                            </Badge>
                        </IconButton>
                    </Box>

                    {/* Popovers */}
                    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={handleLangClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                        <List sx={{ p: 1 }}>
                            <ListItem disablePadding><ListItemButton onClick={() => changeLanguage('en')} sx={{ borderRadius: 1 }}><ListItemText primary="English" primaryTypographyProps={{ fontSize: '0.8125rem' }}/></ListItemButton></ListItem>
                            <ListItem disablePadding><ListItemButton onClick={() => changeLanguage('si')} sx={{ borderRadius: 1 }}><ListItemText primary="සිංහල" primaryTypographyProps={{ fontSize: '0.8125rem' }}/></ListItemButton></ListItem>
                        </List>
                    </Popover>

                    <Popover
                        open={Boolean(notifAnchorEl)} anchorEl={notifAnchorEl} onClose={() => setNotifAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{ sx: { width: 320, maxHeight: 400, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' } }}
                    >
                        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
                            <Typography variant="subtitle2" fontWeight={600}>Inbox</Typography>
                            <Chip label={`${pendingItems.length} new`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Box>
                        <List sx={{ p: 0 }}>
                            {pendingItems.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">All caught up!</Typography>
                                </Box>
                            ) : (
                                pendingItems.map((item) => (
                                    <ListItem key={item.id} disablePadding divider>
                                        <ListItemButton onClick={() => { setNotifAnchorEl(null); navigate(item.path); }} sx={{ py: 1 }}>
                                            <Stack spacing={0.25}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {item.isUrgent && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />}
                                                    <Typography variant="body2" fontWeight={600} color={item.isUrgent ? 'error.main' : 'text.primary'}>{item.title}</Typography>
                                                </Box>
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
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
                    {drawer}
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
                    {drawer}
                </Drawer>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: '80px !important' }}>
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
