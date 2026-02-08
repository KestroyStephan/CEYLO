import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, List, ListItem, ListItemText, Divider, Box, Chip, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

export default function TourProviderDashboard() {
    const { currentUser, userStatus } = useAuth();
    const [packages, setPackages] = useState([]);
    const [upcomingTours, setUpcomingTours] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newPackage, setNewPackage] = useState({ name: '', days: '', price: '' });

    useEffect(() => {
        if (!currentUser) return;

        // Fetch Packages
        const qPackages = query(collection(db, "tour_packages"), where("providerId", "==", currentUser.uid));
        const unsubscribePackages = onSnapshot(qPackages, (snapshot) => {
            const pkgList = [];
            snapshot.forEach((doc) => {
                pkgList.push({ id: doc.id, ...doc.data() });
            });
            setPackages(pkgList);
        });

        // Fetch Scheduled Tours
        const qTours = query(collection(db, "tours"), where("providerId", "==", currentUser.uid));
        const unsubscribeTours = onSnapshot(qTours, (snapshot) => {
            const tourList = [];
            snapshot.forEach((doc) => {
                tourList.push({ id: doc.id, ...doc.data() });
            });
            setUpcomingTours(tourList);
        });

        return () => {
            unsubscribePackages();
            unsubscribeTours();
        };
    }, [currentUser]);

    const handleAddPackage = async () => {
        if (!newPackage.name || !newPackage.days || !newPackage.price) return;

        try {
            await addDoc(collection(db, "tour_packages"), {
                providerId: currentUser.uid,
                name: newPackage.name,
                days: parseInt(newPackage.days),
                price: parseFloat(newPackage.price),
                active: true,
                createdAt: new Date()
            });
            setOpenDialog(false);
            setNewPackage({ name: '', days: '', price: '' });
        } catch (error) {
            console.error("Error adding package:", error);
            alert("Failed to add package");
        }
    };

    const handleDeletePackage = async (pkgId) => {
        if (window.confirm("Are you sure you want to delete this package?")) {
            try {
                await deleteDoc(doc(db, "tour_packages", pkgId));
            } catch (error) {
                console.error("Error deleting package: ", error);
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {userStatus === 'pending_verification' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Your tour provider license is pending verification.
                </Alert>
            )}
            <Typography variant="h4" gutterBottom sx={{ color: '#00695c', fontWeight: 'bold' }}>
                Tour Management
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', bgcolor: '#e0f2f1' }}>
                        <CardContent>
                            <Typography variant="h6">Upcoming Tours</Typography>
                            <Typography variant="h3">{upcomingTours.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6">Total Packages</Typography>
                            <Typography variant="h3">{packages.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6">Guests This Month</Typography>
                            {/* Logic for counting guests from tours would go here */}
                            <Typography variant="h3">{upcomingTours.reduce((sum, t) => sum + (t.groupSize || 0), 0)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6">Upcoming Schedule</Typography>
                        {upcomingTours.length === 0 ? <Typography variant="body2" color="textSecondary">No upcoming tours scheduled.</Typography> : (
                            <List>
                                {upcomingTours.map((t) => (
                                    <React.Fragment key={t.id}>
                                        <ListItem
                                            secondaryAction={
                                                <Chip label={`${t.groupSize || 0} Pax`} color="primary" />
                                            }
                                        >
                                            <ListItemText
                                                primary={`${t.title || 'Tour'} - ${t.date}`}
                                                secondary={`Assigned Guide: ${t.guideName || 'Pending'}`}
                                            />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Card>
                </Grid>

                {/* My Packages Management */}
                <Grid item xs={12}>
                    <Card sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">My Packages</Typography>
                            <Button variant="contained" size="small" sx={{ bgcolor: '#00695c' }} onClick={() => setOpenDialog(true)}>Create New Package</Button>
                        </Box>

                        {packages.length === 0 ? <Typography variant="body2" color="textSecondary">No packages created.</Typography> : (
                            <List>
                                {packages.map((pkg) => (
                                    <React.Fragment key={pkg.id}>
                                        <ListItem
                                            secondaryAction={
                                                <Box>
                                                    <Chip label={pkg.active ? "Active" : "Inactive"} color={pkg.active ? "success" : "default"} variant="outlined" sx={{ mr: 1 }} />
                                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePackage(pkg.id)}>
                                                        <DeleteIcon color="error" />
                                                    </IconButton>
                                                </Box>
                                            }
                                        >
                                            <ListItemText
                                                primary={pkg.name}
                                                secondary={`${pkg.days} Days - LKR ${pkg.price}`}
                                            />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Create Package Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create New Tour Package</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Package Name"
                        fullWidth
                        value={newPackage.name}
                        onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Duration (Days)"
                        type="number"
                        fullWidth
                        value={newPackage.days}
                        onChange={(e) => setNewPackage({ ...newPackage, days: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Price (LKR)"
                        type="number"
                        fullWidth
                        value={newPackage.price}
                        onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddPackage} variant="contained" color="primary">Create</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
