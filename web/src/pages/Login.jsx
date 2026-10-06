import React, { useEffect, useRef, useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Login() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login, currentUser } = useAuth();
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // The profile/role is loaded asynchronously after sign-in; move on once it is ready
    useEffect(() => {
        if (currentUser) navigate('/', { replace: true });
    }, [currentUser, navigate]);

    async function handleForgotPassword() {
        const email = emailRef.current.value.trim();
        setError('');
        setInfo('');
        if (!email) {
            setError('Enter your email address first, then click "Forgot Password?" again.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setInfo('A password reset link has been sent to ' + email + '.');
        } catch (err) {
            setError('Could not send reset email: ' + err.message);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(emailRef.current.value, passwordRef.current.value);
        } catch (err) {
            setError('Failed to log in: ' + err.message);
        } finally {
            setLoading(false);
        }
    }



    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                bgcolor: '#004d40',
            }}
        >
            <Container maxWidth="xs">
                <Card sx={{ borderRadius: 1.25, boxShadow: 6, p: 2 }}>
                    <CardContent>
                        <Box textAlign="center" mb={3}>
                            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: '#00695c' }}>
                                CEYLO Portal
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Enter your credentials to access the dashboard.
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

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
                                    fontWeight: 600
                                }}
                            >
                                Log In
                            </Button>

                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={() => navigate('/register-provider')}
                                sx={{ color: '#00695c', mt: 1, fontWeight: 600 }}
                            >
                                Register as Partner
                            </Button>
                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={handleForgotPassword}
                                sx={{ color: '#00695c', mt: 1 }}
                            >
                                Forgot Password?
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
