import React, { useRef, useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(emailRef.current.value, passwordRef.current.value);
            navigate('/');
        } catch (err) {
            setError('Failed to log in: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    const fillAdminCredentials = () => {
        if (emailRef.current) emailRef.current.value = 'admin@ceylo.com';
        if (passwordRef.current) passwordRef.current.value = 'Admin@Ceylo123';
    };

    // Helper to create the admin account if it doesn't exist (for setup)
    const initializeAdmin = async () => {
        const { auth } = await import('../firebaseConfig');
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        try {
            setLoading(true);
            setError('');
            await createUserWithEmailAndPassword(auth, 'admin@ceylo.com', 'Admin@Ceylo123');
            alert("Admin account created successfully! You can now log in.");
        } catch (err) {
            setError('Failed to initialize: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
            }}
        >
            <Container maxWidth="xs">
                <Card sx={{ borderRadius: 3, boxShadow: 6, p: 2 }}>
                    <CardContent>
                        <Box textAlign="center" mb={3}>
                            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#00695c' }}>
                                CEYLO Portal
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Enter your credentials to access the dashboard.
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <form onSubmit={handleSubmit}>
                            <TextField
                                inputRef={emailRef}
                                id="email"
                                label="Email Address"
                                type="email"
                                fullWidth
                                required
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                inputRef={passwordRef}
                                id="password"
                                label="Password"
                                type="password"
                                fullWidth
                                required
                                margin="normal"
                                variant="outlined"
                            />
                            <Button
                                disabled={loading}
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{
                                    mt: 3,
                                    mb: 1,
                                    bgcolor: '#00695c',
                                    '&:hover': { bgcolor: '#004d40' },
                                    py: 1.5,
                                    fontWeight: 'bold'
                                }}
                            >
                                Log In
                            </Button>
                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={fillAdminCredentials}
                                sx={{ color: '#00695c', mt: 1 }}
                            >
                                Pre-fill Admin Credentials
                            </Button>
                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={() => navigate('/register-provider')}
                                sx={{ color: '#00695c', mt: 1, fontWeight: 'bold' }}
                            >
                                Register as Partner
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                onClick={initializeAdmin}
                                sx={{ mt: 2, borderColor: '#00695c', color: '#00695c' }}
                                disabled={loading}
                            >
                                First Time? Initialize Admin Account
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
