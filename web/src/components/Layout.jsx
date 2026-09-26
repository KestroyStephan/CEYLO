import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    AppBar, Toolbar, Typography, Drawer, List, ListItem, 
    ListItemIcon, ListItemText, IconButton, Box, ListItemButton, 
    Badge, Popover, Avatar, Stack, Chip, InputBase
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MapIcon from '@mui/icons-material/Map';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
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
        const pendingList = { vendors: [], sos: [] };
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

    // Flat list without groups as requested
    const menuItems = [
        { text: t('dashboard'), icon: <DashboardIcon sx={{ fontSize: 22 }}/>, path: '/' },
        { text: t('bookings'), icon: <BookOnlineIcon sx={{ fontSize: 22 }}/>, path: '/bookings' },
        { text: t('sos_monitor'), icon: <WarningIcon sx={{ fontSize: 22 }}/>, path: '/sos' },
        { text: t('cultural_events'), icon: <EventIcon sx={{ fontSize: 22 }}/>, path: '/events' },
        { text: t('destinations'), icon: <TravelExploreIcon sx={{ fontSize: 22 }}/>, path: '/destinations' },
        { text: 'Guides', icon: <MapIcon sx={{ fontSize: 22 }}/>, path: '/guides' },
        { text: t('vendors'), icon: <StoreIcon sx={{ fontSize: 22 }}/>, path: '/vendors' },
        { text: t('users'), icon: <PeopleIcon sx={{ fontSize: 22 }}/>, path: '/users' },
        { text: t('ai_center'), icon: <AutoAwesomeIcon sx={{ fontSize: 22 }}/>, path: '/ai-center' },
        { text: t('reports'), icon: <AssessmentIcon sx={{ fontSize: 22 }}/>, path: '/reports' },
        { text: t('system_health'), icon: <HealthAndSafetyIcon sx={{ fontSize: 22 }}/>, path: '/health' },
        { text: 'Settings', icon: <SettingsIcon sx={{ fontSize: 22 }}/>, path: '/settings' },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', borderRight: '1px solid #EBEFE8' }}>
            {/* Attractive Brand Header */}
            <Box sx={{ px: 3, py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, #006A3B 0%, #004A29 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 106, 59, 0.3)' }}>
                    <Typography variant="h5" fontWeight={900} color="#FFF">C</Typography>
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#006A3B', letterSpacing: '-0.5px', lineHeight: 1 }}>CEYLO</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#5C6E64', fontSize: '0.7rem', letterSpacing: '0.05em' }}>ADMIN PORTAL</Typography>
                </Box>
            </Box>

            {/* Menu List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
                <List disablePadding>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    component={NavLink}
                                    to={item.path}
                                    sx={{
                                        borderRadius: '12px',
                                        py: 1.2,
                                        px: 2,
                                        color: isActive ? '#006A3B' : '#5C6E64',
                                        bgcolor: isActive ? '#E8F5E9' : 'transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: isActive ? '#E8F5E9' : '#F4F7F6',
                                            color: '#006A3B',
                                            transform: 'translateX(4px)'
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 36, color: isActive ? '#006A3B' : '#8B9B92' }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={item.text} 
                                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 800 : 600 }} 
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {/* Profile Footer */}
            <Box sx={{ p: 2, m: 2, bgcolor: '#F4F7F6', borderRadius: 3, border: '1px solid #EBEFE8' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: '#006A3B', color: '#FFF', fontWeight: 700 }}>
                            {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : (currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : 'AD')}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight={800} color="#181D19" sx={{ lineHeight: 1.2 }}>
                                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'}
                            </Typography>
                            <Typography variant="caption" color="#5C6E64" fontWeight={600}>
                                {userRole ? userRole.replace('_', ' ').toUpperCase() : 'ADMIN'}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton component={NavLink} to="/settings" sx={{ color: '#5C6E64', '&:hover': { color: '#006A3B', bgcolor: '#E8F5E9' } }}>
                            <SettingsIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton onClick={handleLogout} sx={{ color: '#5C6E64', '&:hover': { color: '#D32F2F', bgcolor: '#FFEBEE' } }}>
                            <LogoutIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Box>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7F6' }}>
            <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #EBEFE8', width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
                <Toolbar sx={{ minHeight: '72px !important', px: { xs: 2, sm: 4 } }}>
                    <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' }, color: '#006A3B' }}><MenuIcon /></IconButton>
                    
                    {/* Attractive Top Search Bar */}
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                            display: { xs: 'none', md: 'flex' }, alignItems: 'center', 
                            bgcolor: '#F4F7F6', borderRadius: '12px', px: 2, py: 1, width: 400,
                            border: '1px solid #EBEFE8', transition: 'all 0.3s',
                            '&:hover': { borderColor: '#006A3B', bgcolor: '#FFFFFF', boxShadow: '0 4px 12px rgba(0,106,59,0.05)' }
                        }}>
                            <SearchIcon sx={{ color: '#006A3B', fontSize: 22, mr: 1.5 }} />
                            <InputBase placeholder="Search anything in CEYLO..." sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: '#181D19' }} />
                        </Box>
                    </Box>
                    
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <IconButton onClick={handleLangClick} sx={{ color: '#006A3B', bgcolor: '#E8F5E9', '&:hover': { bgcolor: '#C8E6C9' } }}>
                            <LanguageIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                        <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ color: '#006A3B', bgcolor: '#E8F5E9', '&:hover': { bgcolor: '#C8E6C9' } }}>
                            <Badge badgeContent={pendingItems.length} color="error" sx={{ '& .MuiBadge-badge': { height: 20, minWidth: 20, fontWeight: 800, border: '2px solid #FFF' } }}>
                                <NotificationsIcon sx={{ fontSize: 22 }} />
                            </Badge>
                        </IconButton>
                    </Stack>

                    {/* Notification Popover */}
                    <Popover open={Boolean(notifAnchorEl)} anchorEl={notifAnchorEl} onClose={() => setNotifAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 360, mt: 1.5, borderRadius: 3, boxShadow: '0 12px 24px rgba(0,106,59,0.1)' } }}>
                        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EBEFE8', bgcolor: '#F8F9FA' }}>
                            <Typography variant="subtitle1" fontWeight={800} color="#006A3B">Alerts & Notifications</Typography>
                            <Chip label={`${pendingItems.length} New`} size="small" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 800, bgcolor: '#006A3B', color: '#FFF' }} />
                        </Box>
                        <List sx={{ p: 0 }}>
                            {pendingItems.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary" fontWeight={600}>You're all caught up!</Typography></Box>
                            ) : (
                                pendingItems.map((item) => (
                                    <ListItem key={item.id} disablePadding divider sx={{ borderColor: '#EBEFE8' }}>
                                        <ListItemButton onClick={() => { setNotifAnchorEl(null); navigate(item.path); }} sx={{ py: 2, '&:hover': { bgcolor: '#F4F7F6' } }}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2" fontWeight={800} color={item.isUrgent ? '#D32F2F' : '#181D19'}>{item.title}</Typography>
                                                <Typography variant="caption" color="#5C6E64" fontWeight={600}>{item.subtitle}</Typography>
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
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', boxShadow: '0px 0px 40px rgba(0, 106, 59, 0.03)' } }} open>
                    {drawer}
                </Drawer>
            </Box>
            
            {/* REMOVED maxWidth: 1600 and mx: 'auto' to ensure the content stretches fully, fixing the left/right whitespace issue */}
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: '96px !important' }}>
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
