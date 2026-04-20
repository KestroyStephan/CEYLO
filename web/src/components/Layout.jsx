import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Box } from '@mui/material';
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
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@mui/icons-material/Language';
import Popover from '@mui/material/Popover';

const drawerWidth = 260;

function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

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
        { text: t('sos_monitor'), icon: <WarningIcon />, path: '/sos' },
        { text: t('destinations'), icon: <TravelExploreIcon />, path: '/destinations' },
        { text: t('cultural_events'), icon: <EventIcon />, path: '/events' },
        { text: t('vendors'), icon: <StoreIcon />, path: '/vendors' },
        { text: t('users'), icon: <PeopleIcon />, path: '/users' },
        { text: t('bookings'), icon: <BookOnlineIcon />, path: '/bookings' },
        { text: t('analytics'), icon: <AnalyticsIcon />, path: '/analytics' },
        { text: t('notifications'), icon: <NotificationsActiveIcon />, path: '/notifications' },
        { text: t('system_health'), icon: <HealthAndSafetyIcon />, path: '/health' },
        { text: t('reports'), icon: <AssessmentIcon />, path: '/reports' },
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#00695c', letterSpacing: 1 }}>
                    SHAROOBINI
                </Typography>
            </Toolbar>
            <List sx={{ px: 2, flexGrow: 1 }}>
                {menuItems.map((item) => (
                    <ListItem
                        key={item.text}
                        component={NavLink}
                        to={item.path}
                        sx={{
                            borderRadius: '12px',
                            mb: 0.5,
                            '&.active': {
                                bgcolor: '#e0f2f1',
                                color: '#00695c',
                                '& .MuiListItemIcon-root': { color: '#00695c' }
                            },
                            '&:hover': {
                                bgcolor: '#f5f5f5'
                            }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40, color: '#546e7a' }}>{item.icon}</ListItemIcon>
                        <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} 
                        />
                    </ListItem>
                ))}
            </List>
            <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
                <ListItem 
                    button 
                    onClick={handleLogout}
                    sx={{ borderRadius: '12px', color: '#d32f2f', '&:hover': { bgcolor: '#fff1f1' } }}
                >
                    <ListItemIcon sx={{ minWidth: 40, color: '#d32f2f' }}><LogoutIcon /></ListItemIcon>
                    <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
                </ListItem>
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
                    
                    <IconButton color="inherit" onClick={handleLangClick} sx={{ mr: 2 }}>
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
                            <ListItem button onClick={() => changeLanguage('en')} sx={{ borderRadius: 1 }}>
                                <ListItemText primary="English (EN)" />
                            </ListItem>
                            <ListItem button onClick={() => changeLanguage('si')} sx={{ borderRadius: 1 }}>
                                <ListItemText primary="සිංහල (SI)" />
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
