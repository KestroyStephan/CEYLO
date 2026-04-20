import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, List, ListItem, ListItemText, Button, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function VendorDashboard() {
    const { currentUser, userStatus } = useAuth();
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [sales, setSales] = useState(0);

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '' });

    useEffect(() => {
        if (!currentUser) return;

        // Fetch Products
        const qProducts = query(collection(db, "products"), where("vendorId", "==", currentUser.uid));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productList = [];
            snapshot.forEach((doc) => {
                productList.push({ id: doc.id, ...doc.data() });
            });
            setProducts(productList);
        });

        // Fetch Orders (Assuming orders have a vendorId field)
        const qOrders = query(collection(db, "orders"), where("vendorId", "==", currentUser.uid));
        const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            const orderList = [];
            let totalSales = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                orderList.push({ id: doc.id, ...data });
                if (data.status === 'Completed' || data.status === 'Paid') { // Example logic
                    totalSales += (data.total || 0);
                }
            });
            setOrders(orderList);
            setSales(totalSales);
        });

        return () => {
            unsubscribeProducts();
            unsubscribeOrders();
        };
    }, [currentUser]);

    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.price || !newProduct.stock) return;

        try {
            await addDoc(collection(db, "products"), {
                vendorId: currentUser.uid,
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                stock: parseInt(newProduct.stock),
                createdAt: new Date(),
                active: true
            });
            setOpenDialog(false);
            setNewProduct({ name: '', price: '', stock: '' });
        } catch (error) {
            console.error("Error adding product: ", error);
            alert("Failed to add product");
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteDoc(doc(db, "products", productId));
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        }
    };

    const handleOrderStatus = async (orderId, currentStatus) => {
        const newStatus = currentStatus === 'New' ? 'Shipped' : 'Completed';
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus
            });
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {userStatus === 'pending_verification' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Your vendor application is pending verification.
                </Alert>
            )}
            <Typography variant="h4" gutterBottom sx={{ color: '#00695c', fontWeight: 'bold' }}>
                Vendor Storefront
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', bgcolor: '#f1f8e9' }}>
                        <CardContent>
                            <Typography variant="h6">Total Sales</Typography>
                            <Typography variant="h4">LKR {sales.toLocaleString()}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', bgcolor: '#e0f7fa' }}>
                        <CardContent>
                            <Typography variant="h6">Pending Orders</Typography>
                            <Typography variant="h4">{orders.filter(o => o.status === 'New').length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Product Inventory</Typography>
                        {products.length === 0 ? <Typography variant="body2" color="textSecondary">No products added yet.</Typography> : (
                            <List>
                                {products.map((p) => (
                                    <React.Fragment key={p.id}>
                                        <ListItem
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteProduct(p.id)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText primary={p.name} secondary={`Price: LKR ${p.price} - Stock: ${p.stock}`} />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                        <Button variant="contained" sx={{ mt: 2, bgcolor: '#00695c' }} onClick={() => setOpenDialog(true)}>Add New Product</Button>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Recent Orders</Typography>
                        {orders.length === 0 ? <Typography variant="body2" color="textSecondary">No orders yet.</Typography> : (
                            <List>
                                {orders.map((o) => (
                                    <React.Fragment key={o.id}>
                                        <ListItem
                                            secondaryAction={
                                                <Button
                                                    size="small"
                                                    variant={o.status === 'New' ? 'contained' : 'outlined'}
                                                    color={o.status === 'New' ? 'primary' : 'success'}
                                                    onClick={() => handleOrderStatus(o.id, o.status)}
                                                >
                                                    {o.status}
                                                </Button>
                                            }
                                        >
                                            <ListItemText primary={`Order #${o.id.slice(0, 5)}...`} secondary={`Customer: ${o.customerName || 'Guest'} - LKR ${o.total}`} />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Add Product Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Product Name"
                        fullWidth
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Price (LKR)"
                        type="number"
                        fullWidth
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Stock Quantity"
                        type="number"
                        fullWidth
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddProduct} variant="contained" color="primary">Add Product</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
