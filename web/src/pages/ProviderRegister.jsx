import React, { useState } from 'react';
import {
    Container, Box, Typography, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    Alert, Card, CardContent, Stepper, Step, StepLabel, Grid
} from '@mui/material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

const steps = ['Account Details', 'Business Info', 'Review'];

export default function ProviderRegister() {
    const [activeStep, setActiveStep] = useState(0);
    const [role, setRole] = useState('accommodation'); // 'accommodation', 'vendor', 'tour_provider'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        location: '',
        contact: '',
        description: '',
        // Role specific
        category: '', // for vendor/tour
        capacity: '', // for accommodation
        licenseNumber: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleSubmit = async () => {
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Update Profile
            await updateProfile(user, { displayName: formData.name });

            // 3. Create Firestore Doc
            const userData = {
                uid: user.uid,
                name: formData.name,
                email: formData.email,
                role: role,
                businessName: formData.businessName,
                location: formData.location,
                contact: formData.contact,
                description: formData.description,
                createdAt: new Date(),
                status: 'pending_verification' // Require admin approval ideally
            };

            if (role === 'accommodation') {
                userData.capacity = formData.capacity;
            } else if (role === 'vendor' || role === 'tour_provider') {
                userData.category = formData.category;
            }
            userData.licenseNumber = formData.licenseNumber;

            await setDoc(doc(db, "users", user.uid), userData);

            // Should also create a specific collection entry? e.g. 'accommodations'
            // For now, keeping everything in 'users' with role is simpler for MVP

            alert("Registration successful! Redirecting to dashboard...");
            navigate('/');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>I am a...</InputLabel>
                                <Select
                                    value={role}
                                    label="I am a..."
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <MenuItem value="accommodation">Accommodation Provider (Hotel/Villa)</MenuItem>
                                    <MenuItem value="vendor">Local Vendor (Shop/Artisan)</MenuItem>
                                    <MenuItem value="tour_provider">Tour Provider (Agency)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
                        </Grid>
                    </Grid>
                );
            case 1:
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Business Name" name="businessName" value={formData.businessName} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Location/Address" name="location" value={formData.location} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Contact Number" name="contact" value={formData.contact} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Business License Number" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} />
                        </Grid>

                        {role === 'accommodation' && (
                            <Grid item xs={12}>
                                <TextField fullWidth label="Total Capacity (Rooms/Guests)" name="capacity" value={formData.capacity} onChange={handleChange} />
                            </Grid>
                        )}

                        {(role === 'vendor' || role === 'tour_provider') && (
                            <Grid item xs={12}>
                                <TextField fullWidth label="Category (e.g., Souvenirs, Hiking)" name="category" value={formData.category} onChange={handleChange} />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleChange} />
                        </Grid>
                    </Grid>
                );
            case 2:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>Review Details</Typography>
                        <Typography><strong>Role:</strong> {role}</Typography>
                        <Typography><strong>Name:</strong> {formData.name}</Typography>
                        <Typography><strong>Business:</strong> {formData.businessName}</Typography>
                        <Typography><strong>Email:</strong> {formData.email}</Typography>
                        <Typography><strong>Location:</strong> {formData.location}</Typography>
                        <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'gray' }}>
                            By registering, you agree to CEYLO's terms for service providers.
                        </Typography>
                    </Box>
                );
            default:
                return 'Unknown step';
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
            <Card sx={{ borderRadius: 3, boxShadow: 4, p: 2 }}>
                <CardContent>
                    <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#00695c' }}>
                        Partner Registration
                    </Typography>
                    <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 4 }}>
                        Join CEYLO as a service provider
                    </Typography>

                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <form>
                        {getStepContent(activeStep)}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                            {activeStep !== 0 && (
                                <Button onClick={handleBack} sx={{ mr: 1, color: '#00695c' }}>
                                    Back
                                </Button>
                            )}
                            {activeStep === steps.length - 1 ? (
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    sx={{ bgcolor: '#00695c', '&:hover': { bgcolor: '#004d40' } }}
                                >
                                    {loading ? 'Registering...' : 'Register Business'}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    sx={{ bgcolor: '#00695c', '&:hover': { bgcolor: '#004d40' } }}
                                >
                                    Next
                                </Button>
                            )}
                        </Box>
                    </form>

                    <Box sx={{ setTextAlign: 'center', mt: 3, display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body2">
                            Already have an account? <Button href="/login" sx={{ textTransform: 'none', color: '#00695c' }}>Login</Button>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
