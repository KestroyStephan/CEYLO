import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Drawer, List, ListItem,
    ListItemIcon, ListItemText, IconButton, Box, ListItemButton,
    Badge, Popover, Avatar, Stack
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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import CampaignIcon from '@mui/icons-material/Campaign';
import InsightsIcon from '@mui/icons-material/Insights';
import ScienceIcon from '@mui/icons-material/Science';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import SosAlarm from './SosAlarm';

const drawerWidth = 240;

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
        const pendingList = { vendors: [], drivers: [], sos: [] };
        const updatePending = () => {
            const items = [];
            pendingList.sos.forEach(s => items.push({ id: s.id, title: 'Active SOS alert', subtitle: s.userName || 'Unknown traveller', type: 'sos', path: '/sos', isUrgent: true }));
            pendingList.vendors.forEach(v => items.push({ id: v.id, title: `Vendor waiting for review: ${v.businessName || 'Unknown'}`, subtitle: `${v.businessType || 'Vendor'}`, type: 'vendor', path: '/vendors' }));
            pendingList.drivers.forEach(d => items.push({ id: d.id, title: `Driver waiting for review: ${d.name || 'Unknown'}`, subtitle: [d.vehicleType, d.licensePlate].filter(Boolean).join(' · '), type: 'driver', path: '/drivers' }));
            setPendingItems(items);
        };
        const qVendors = query(collection(db, "vendors"), where("status", "==", "pending_verification"));
        const unsubVendors = onSnapshot(qVendors, (snap) => { pendingList.vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        const qDrivers = query(collection(db, "drivers"), where("status", "==", "pending_verification"));
        const unsubDrivers = onSnapshot(qDrivers, (snap) => { pendingList.drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); }, () => {});
        const qSOS = query(collection(db, "sos_alerts"), where("status", "==", "active"));
        const unsubSOS = onSnapshot(qSOS, (snap) => { pendingList.sos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); updatePending(); });
        return () => { unsubVendors(); unsubDrivers(); unsubSOS(); };
    }, []);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleLangClick = (e) => setAnchorEl(e.currentTarget);
    const handleLangClose = () => setAnchorEl(null);
    const changeLanguage = (lang) => { i18n.changeLanguage(lang); handleLangClose(); };
    const handleLogout = async () => { try { await logout(); window.location.href = '/login'; } catch (error) {} };

    // Navigation grouped by the job the admin is doing
    const sections = [
        { title: null, items: [
            { text: t('dashboard'), icon: <DashboardIcon />, path: '/' },
            { text: t('sos_monitor'), icon: <WarningIcon />, path: '/sos' },
            { text: t('bookings'), icon: <BookOnlineIcon />, path: '/bookings' },
        ] },
        { title: 'Partners', items: [
            { text: 'Drivers', icon: <LocalTaxiIcon />, path: '/drivers' },
            { text: 'Guides', icon: <MapIcon />, path: '/guides' },
            { text: t('vendors'), icon: <StoreIcon />, path: '/vendors' },
            { text: t('users'), icon: <PeopleIcon />, path: '/users' },
        ] },
        { title: 'Content', items: [
            { text: t('destinations'), icon: <TravelExploreIcon />, path: '/destinations' },
            { text: t('cultural_events'), icon: <EventIcon />, path: '/events' },
            { text: 'Notifications', icon: <NotificationsActiveIcon />, path: '/notifications' },
            { text: 'Marketing', icon: <CampaignIcon />, path: '/marketing' },
        ] },
        { title: 'Insights', items: [
            { text: t('ai_center'), icon: <AutoAwesomeIcon />, path: '/ai-center' },
            { text: 'Analytics', icon: <InsightsIcon />, path: '/analytics' },
            { text: t('reports'), icon: <AssessmentIcon />, path: '/reports' },
            { text: 'Research', icon: <ScienceIcon />, path: '/research' },
        ] },
        { title: 'System', items: [
            { text: t('system_health'), icon: <HealthAndSafetyIcon />, path: '/health' },
            { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
        ] },
    ];
    const activeSos = pendingItems.filter(i => i.type === 'sos').length;

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', borderRight: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ px: 2.5, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 15, lineHeight: 1 }}>C</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>CEYLO</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', ml: 0.25 }}>Admin</Typography>
            </Box>

            <Box component="nav" sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
                {sections.map((section, i) => (
                    <Box key={section.title || i} sx={{ mb: 1.5 }}>
                        {section.title && (
                            <Typography sx={{ px: 1.5, pt: 1, pb: 0.5, fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                {section.title}
                            </Typography>
                        )}
                        <List disablePadding>
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                return (
                                    <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                                        <ListItemButton
                                            component={NavLink}
                                            to={item.path}
                                            onClick={() => setMobileOpen(false)}
                                            sx={{
                                                py: 0.75, px: 1.5,
                                                color: isActive ? 'text.primary' : 'text.secondary',
                                                bgcolor: isActive ? '#EEF3F0' : 'transparent',
                                                '&:hover': { bgcolor: isActive ? '#EEF3F0' : '#F4F6F5', color: 'text.primary' },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 32, color: isActive ? 'primary.main' : '#7A8580', '& svg': { fontSize: 19 } }}>
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }} />
                                            {item.path === '/sos' && activeSos > 0 && (
                                                <Box sx={{ minWidth: 20, height: 20, px: 0.75, borderRadius: '10px', bgcolor: 'error.main', color: '#FFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {activeSos}
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                ))}
            </Box>

            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#E6ECE8', color: 'text.primary', fontSize: 13, fontWeight: 600 }}>
                    {(currentUser?.displayName || currentUser?.email || 'AD').substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }} noWrap>
                        {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'capitalize' }} noWrap>
                        {userRole ? userRole.replace(/_/g, ' ') : 'admin'}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={handleLogout} aria-label="Sign out" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <LogoutIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>
        </Box>
    );

    const pageTitle = sections.flatMap(s => s.items).find(i => i.path === location.pathname || (i.path !== '/' && location.pathname.startsWith(i.path)))?.text;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="fixed" color="inherit" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#FFFFFF', width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
                <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, sm: 3 }, gap: 1 }}>
                    <IconButton edge="start" onClick={handleDrawerToggle} aria-label="Open navigation" sx={{ display: { sm: 'none' } }}><MenuIcon /></IconButton>
                    <Typography sx={{ flexGrow: 1, fontSize: 14, color: 'text.secondary' }} noWrap>{pageTitle || ''}</Typography>

                    <IconButton onClick={handleLangClick} aria-label="Language" sx={{ color: 'text.secondary' }}>
                        <LanguageIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={handleLangClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                        <List dense sx={{ minWidth: 140 }}>
                            {[['en', 'English'], ['si', 'සිංහල'], ['ta', 'தமிழ்']].map(([code, label]) => (
                                <ListItemButton key={code} selected={i18n.language === code} onClick={() => changeLanguage(code)}>
                                    <ListItemText primary={label} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Popover>
                    <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)} aria-label="Notifications" sx={{ color: 'text.secondary' }}>
                        <Badge badgeContent={pendingItems.length} color="error">
                            <NotificationsIcon sx={{ fontSize: 20 }} />
                        </Badge>
                    </IconButton>

                    <Popover open={Boolean(notifAnchorEl)} anchorEl={notifAnchorEl} onClose={() => setNotifAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 340, mt: 1 } }}>
                        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Needs attention</Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{pendingItems.length}</Typography>
                        </Box>
                        <List sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
                            {pendingItems.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Nothing waiting.</Typography></Box>
                            ) : (
                                pendingItems.map((item) => (
                                    <ListItem key={`${item.type}-${item.id}`} disablePadding divider>
                                        <ListItemButton onClick={() => { setNotifAnchorEl(null); navigate(item.path); }} sx={{ py: 1.25, borderRadius: 0 }}>
                                            <Stack spacing={0.25}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: item.isUrgent ? 'error.main' : 'text.primary' }}>{item.title}</Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{item.subtitle}</Typography>
                                            </Stack>
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Popover>
                </Toolbar>
            </AppBar>

            <Box sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
                    {drawer}
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
                    {drawer}
                </Drawer>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, sm: 3, md: 4 }, pb: 4, width: { sm: `calc(100% - ${drawerWidth}px)` }, pt: '88px !important' }}>
                <SosAlarm />
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
