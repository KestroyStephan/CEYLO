import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    AppBar, Toolbar, Typography, Drawer, List, ListItem, 
    ListItemIcon, ListItemText, IconButton, Box, ListItemButton, 
    Badge, Popover, Divider, Avatar, Stack, Chip, Button
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
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const pendingList = {
            drivers: [],
            guides: [],
            vendors: [],
            sos: []
        };
        
        const updatePending = () => {
            const items = [];
            pendingList.sos.forEach(s => {
                items.push({
                    id: s.id,
                    title: `ACTIVE SOS ALERT!`,
                    subtitle: `Tourist: ${s.userName || 'Unknown'}`,
                    type: 'sos',
                    path: '/sos',
                    isUrgent: true
                });
            });
            pendingList.drivers.forEach(d => {
                items.push({
                    id: d.id,
                    title: `Driver Pending: ${d.name || 'Unknown'}`,
                    subtitle: d.email || 'No email',
                    type: 'driver',
                    path: '/users'
                });
            });
            pendingList.guides.forEach(g => {
                items.push({
                    id: g.id,
                    title: `Guide Pending: ${g.name || 'Unknown'}`,
                    subtitle: `License: ${g.guideLicense || 'N/A'}`,
                    type: 'guide',
                    path: '/guides'
                });
            });
            pendingList.vendors.forEach(v => {
                items.push({
                    id: v.id,
                    title: `Vendor Pending: ${v.businessName || 'Unknown'}`,
                    subtitle: `${v.businessType || 'Vendor'} • ${v.phone || ''}`,
                    type: 'vendor',
                    path: '/vendors'
                });
            });
            setPendingItems(items);
        };

        const qDrivers = query(collection(db, "users"), where("role", "==", "driver_pending"));
        const unsubDrivers = onSnapshot(qDrivers, (snap) => {
            pendingList.drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updatePending();
        }, (err) => console.error("Drivers listener error:", err));

        const qGuides = query(collection(db, "users"), where("role", "==", "guide_pending"));
        const unsubGuides = onSnapshot(qGuides, (snap) => {
            pendingList.guides = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updatePending();
        }, (err) => console.error("Guides listener error:", err));

        const qVendors = query(collection(db, "vendors"), where("status", "==", "pending_verification"));
        const unsubVendors = onSnapshot(qVendors, (snap) => {
            pendingList.vendors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updatePending();
        }, (err) => console.error("Vendors listener error:", err));

        const qSos = query(collection(db, "sos_alerts"), where("status", "==", "active"));
        const unsubSos = onSnapshot(qSos, (snap) => {
            pendingList.sos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updatePending();
        }, (err) => console.error("SOS listener error:", err));

        return () => {
            setTimeout(() => {
                if (typeof unsubDrivers === 'function') unsubDrivers();
            }, 0);
            setTimeout(() => {
                if (typeof unsubGuides === 'function') unsubGuides();
            }, 10);
            setTimeout(() => {
                if (typeof unsubVendors === 'function') unsubVendors();
            }, 20);
            setTimeout(() => {
                if (typeof unsubSos === 'function') unsubSos();
            }, 30);
        };
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLangClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleLangClose = () => {
        setAnchorEl(null);
    };

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        handleLangClose();
    };

    const menuItems = [
        { text: t('dashboard'), icon: <DashboardIcon />, path: '/' },
        { text: 'Guides', icon: <MapIcon />, path: '/guides' },
        { text: t('vendors'), icon: <StoreIcon />, path: '/vendors' },
        { text: t('reports'), icon: <AssessmentIcon />, path: '/reports' },
        { text: t('sos_monitor'), icon: <WarningIcon />, path: '/sos' },
        { text: t('notifications'), icon: <NotificationsActiveIcon />, path: '/notifications' },
        { text: t('system_health'), icon: <HealthAndSafetyIcon />, path: '/health' },
        { text: t('destinations'), icon: <TravelExploreIcon />, path: '/destinations' },
        { text: t('cultural_events'), icon: <EventIcon />, path: '/events' },
        { text: t('users'), icon: <PeopleIcon />, path: '/users' },
        { text: t('bookings'), icon: <BookOnlineIcon />, path: '/bookings' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#F4F6F4', p: 1.5 }}>
            
            {/* Branding Logo */}
            <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 950, color: '#006A3B', letterSpacing: 0.5 }}>
                    Ceylo
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.62rem', letterSpacing: '0.05em' }}>
                    ECO-LUXURY ADMIN
                </Typography>
            </Box>

            {/* Menu Items List */}
            <List sx={{ px: 0, flexGrow: 1, overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#CCD4CD', borderRadius: 2 } }}>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            component={NavLink}
                            to={item.path}
                            sx={{
                                borderRadius: '10px',
                                py: 1,
                                px: 1.5,
                                color: '#555',
                                '&.active': {
                                    bgcolor: '#E8F5E9',
                                    color: '#006A3B',
                                    '& .MuiListItemIcon-root': { color: '#006A3B' }
                                },
                                '&:hover': {
                                    bgcolor: '#EBEFE8'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32, color: '#555' }}>{item.icon}</ListItemIcon>
                            <ListItemText 
                                primary={item.text} 
                                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 800 }} 
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* Bottom Actions and Profile */}
            <Box sx={{ pt: 1.5, borderTop: '1px solid #E2E8E2' }}>
                
                {/* Settings menu item */}
                <ListItem disablePadding sx={{ mb: 1.5 }}>
                    <ListItemButton 
                        onClick={() => navigate('/settings')}
                        sx={{ borderRadius: '10px', py: 0.8, color: '#555', '&:hover': { bgcolor: '#EBEFE8' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 32, color: '#555' }}><SettingsIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 800 }} />
                    </ListItemButton>
                </ListItem>

                {/* Support Portal CTA Card */}
                <Button 
                    fullWidth 
                    variant="contained" 
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => window.open('https://support.ceylo.com', '_blank')}
                    sx={{ 
                        bgcolor: '#006A3B', '&:hover': { bgcolor: '#004D2C' },
                        borderRadius: 3, textTransform: 'none', fontWeight: 850, py: 1.2, mb: 2, fontSize: '0.85rem'
                    }}
                >
                    Support Portal
                </Button>

                {/* User Profile Info section */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#006A3B', color: '#FFF', fontWeight: 850, fontSize: '0.85rem' }}>
                            AD
                        </Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight={850} color="#181D19">Admin User</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={750} sx={{ display: 'block', fontSize: '0.68rem', mt: -0.2 }}>Financial Lead</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleLogout} sx={{ color: '#555', p: 0.5 }}>
                        <LogoutIcon fontSize="small" />
                    </IconButton>
                </Box>

            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#00695c' }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        CEYLO Admin Portal
                    </Typography>
                    
                    <IconButton 
                        color="inherit" 
                        onClick={(e) => setNotifAnchorEl(e.currentTarget)} 
                        sx={{ mr: 2 }}
                        id="header-notif-bell"
                    >
                        <Badge badgeContent={pendingItems.length} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                    <Popover
                        open={Boolean(notifAnchorEl)}
                        anchorEl={notifAnchorEl}
                        onClose={() => setNotifAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: { width: 320, maxHeight: 400, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
                        }}
                    >
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight={800}>Tasks & Alerts</Typography>
                            <Chip label={pendingItems.length} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        </Box>
                        <Divider />
                        <List sx={{ p: 0 }}>
                            {pendingItems.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">All clear! No action items.</Typography>
                                </Box>
                            ) : (
                                pendingItems.map((item) => (
                                    <ListItem 
                                        key={item.id} 
                                        disablePadding 
                                        divider
                                    >
                                        <ListItemButton 
                                            onClick={() => {
                                                setNotifAnchorEl(null);
                                                navigate(item.path);
                                            }}
                                            sx={{
                                                bgcolor: item.isUrgent ? '#ffebee' : 'inherit',
                                                '&:hover': { bgcolor: item.isUrgent ? '#ffcdd2' : '#f5f5f5' }
                                            }}
                                        >
                                            <Stack spacing={0.5} sx={{ width: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {item.isUrgent && <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />}
                                                    <Typography variant="body2" fontWeight={700} color={item.isUrgent ? 'error.main' : 'text.primary'}>
                                                        {item.title}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.subtitle}
                                                </Typography>
                                            </Stack>
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Popover>

                    <IconButton color="inherit" onClick={handleLangClick} sx={{ mr: 2 }} id="header-lang-btn">
                        <LanguageIcon />
                        <Typography variant="body2" sx={{ ml: 1, fontWeight: 700 }}>{i18n.language.toUpperCase()}</Typography>
                    </IconButton>
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handleLangClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <List sx={{ p: 1 }}>
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => changeLanguage('en')} sx={{ borderRadius: 1 }}>
                                    <ListItemText primary="English (EN)" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => changeLanguage('si')} sx={{ borderRadius: 1 }}>
                                    <ListItemText primary="සිංහල (SI)" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Popover>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer

                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
