import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, List, ListItem, ListItemText, Divider, Button, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';

export default function AccommodationDashboard() {
    const { currentUser, userStatus } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState({ rooms: 0, occupied: 0, revenue: 0 });

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [newRoom, setNewRoom] = useState({ type: '', price: '', capacity: '', description: '' });

    useEffect(() => {
        if (!currentUser) return;

        // Fetch User's Capacity (Total Rooms) - Kept for legacy compatibility if needed, but we calculate from rooms collection now
        const fetchCapacity = async () => {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                // We can use this as a fallback or base capacity
            }
        };
        fetchCapacity();

        // Fetch Rooms
        const qRooms = query(collection(db, "rooms"), where("providerId", "==", currentUser.uid));
        const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
            const roomList = [];
            snapshot.forEach((doc) => {
                roomList.push({ id: doc.id, ...doc.data() });
            });
            setRooms(roomList);
            // Update stats based on actual rooms
            setStats(prev => ({ ...prev, rooms: roomList.length }));
        });

        // Fetch Bookings
        const q = query(collection(db, "bookings"), where("providerId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookingList = [];
            let occupiedCount = 0;
            let totalRevenue = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                bookingList.push({ id: doc.id, ...data });

                // Simple logic for active bookings
                if (data.status === 'Confirmed' || data.status === 'Checked In') {
                    // Check if current date is within range ideally
                    occupiedCount++;
                    totalRevenue += (data.totalPrice || 0);
                }
            });

            setBookings(bookingList);
            setStats(prev => ({ ...prev, occupied: occupiedCount, revenue: totalRevenue }));
        });

        return () => {
            unsubscribe();
            unsubscribeRooms();
        };
    }, [currentUser]);

    const handleAction = async (bookingId, action) => {
        // action: 'confirm', 'reject', 'check-in', 'check-out'
        let newStatus = '';
        if (action === 'confirm') newStatus = 'Confirmed';
        if (action === 'reject') newStatus = 'Rejected';
        if (action === 'check-in') newStatus = 'Checked In';
        if (action === 'check-out') newStatus = 'Completed';

        try {
            await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    };

    const handleAddRoom = async () => {
        if (!newRoom.type || !newRoom.price || !newRoom.capacity) return;

        try {
            await addDoc(collection(db, "rooms"), {
                providerId: currentUser.uid,
                type: newRoom.type, // e.g., Single, Double, Suite
                price: parseFloat(newRoom.price),
                capacity: parseInt(newRoom.capacity),
                description: newRoom.description || '',
                isAvailable: true,
                createdAt: new Date()
            });
            setOpenDialog(false);
            setNewRoom({ type: '', price: '', capacity: '', description: '' });
        } catch (error) {
            console.error("Error adding room: ", error);
            alert("Failed to add room");
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (window.confirm("Are you sure you want to delete this room?")) {
            try {
                await deleteDoc(doc(db, "rooms", roomId));
            } catch (error) {
                console.error("Error deleting room:", error);
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {userStatus === 'pending_verification' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Your account is currently pending verification. Features may be limited until approval.
                </Alert>
            )}
            <Typography variant="h4" gutterBottom sx={{ color: '#00695c', fontWeight: 'bold' }}>
                Accommodation Dashboard
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', bgcolor: '#e0f2f1' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
                            <Typography variant="h5">LKR {stats.revenue.toLocaleString()}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Total Rooms Managed</Typography>
                            <Typography variant="h5">{stats.rooms}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Occupancy Rate</Typography>
                            <Typography variant="h5">
                                {stats.rooms > 0 ? ((stats.occupied / stats.rooms) * 100).toFixed(0) : 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* My Rooms Management */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">My Rooms</Typography>
                            <Button variant="contained" size="small" sx={{ bgcolor: '#00695c' }} onClick={() => setOpenDialog(true)}>Add Room</Button>
                        </Box>

                        {rooms.length === 0 ? <Typography variant="body2" color="textSecondary">No rooms added yet.</Typography> : (
                            <List>
                                {rooms.map((room) => (
                                    <React.Fragment key={room.id}>
                                        <ListItem
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteRoom(room.id)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={`${room.type} (Capacity: ${room.capacity})`}
                                                secondary={`LKR ${room.price} / night`}
                                            />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Card>
                </Grid>

                {/* Bookings Management */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Bookings Management</Typography>
                        {bookings.length === 0 ? <Typography variant="body2" color="textSecondary">No bookings found.</Typography> : (
                            <List>
                                {bookings.map((booking) => (
                                    <React.Fragment key={booking.id}>
                                        <ListItem
                                            alignItems="flex-start"
                                            secondaryAction={
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {booking.status === 'Pending' && (
                                                        <>
                                                            <Button size="small" variant="contained" color="success" onClick={() => handleAction(booking.id, 'confirm')}>Confirm</Button>
                                                            <Button size="small" variant="outlined" color="error" onClick={() => handleAction(booking.id, 'reject')}>Reject</Button>
                                                        </>
                                                    )}
                                                    {booking.status === 'Confirmed' && (
                                                        <Button size="small" variant="contained" color="primary" onClick={() => handleAction(booking.id, 'check-in')}>Check In</Button>
                                                    )}
                                                    {booking.status === 'Checked In' && (
                                                        <Button size="small" variant="contained" color="secondary" onClick={() => handleAction(booking.id, 'check-out')}>Check Out</Button>
                                                    )}
                                                </Box>
                                            }
                                        >
                                            <ListItemText
                                                primary={`${booking.guestName || 'Guest'} - ${booking.roomType || 'Standard Room'}`}
                                                secondary={
                                                    <>
                                                        <Typography component="span" variant="body2" color="textPrimary">
                                                            {booking.checkIn} to {booking.checkOut}
                                                        </Typography>
                                                        <br />
                                                        <Chip label={booking.status} size="small" color={booking.status === 'Completed' ? 'default' : booking.status === 'Confirmed' ? 'success' : 'warning'} variant="outlined" sx={{ mt: 1 }} />
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                        <Divider />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Add Room Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Add New Room Type</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Room Type (e.g. Single, Double, Suite)"
                        fullWidth
                        value={newRoom.type}
                        onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Price Per Night (LKR)"
                        type="number"
                        fullWidth
                        value={newRoom.price}
                        onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Capacity (Persons)"
                        type="number"
                        fullWidth
                        value={newRoom.capacity}
                        onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Description (Optional)"
                        fullWidth
                        multiline
                        rows={3}
                        value={newRoom.description}
                        onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddRoom} variant="contained" color="primary">Add Room</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
