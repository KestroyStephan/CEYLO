import React, { useEffect, useState } from 'react';
import { 
    Container, Box, Typography, TextField, Button, Alert, Card, CardContent,
    InputAdornment, IconButton 
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { emailError, loginPasswordError, authErrorMessage } from '../utils/validation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [touched, setTouched] = useState({ email: false, password: false });
    const emailErr = touched.email ? emailError(email) : null;
    const passwordErr = touched.password ? loginPasswordError(password) : null;
    const { login, currentUser } = useAuth();
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // The profile/role is loaded asynchronously after sign-in; move on once it is ready
    useEffect(() => {
        if (currentUser) navigate('/', { replace: true });
    }, [currentUser, navigate]);

    async function handleForgotPassword() {
        setError('');
        setInfo('');
        if (emailError(email)) {
            setTouched(t => ({ ...t, email: true }));
            setError('Enter your email address first, then click "Forgot Password?" again.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setInfo('A password reset link has been sent to ' + email.trim() + '.');
        } catch (err) {
            setError('Could not send reset email: ' + authErrorMessage(err));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setTouched({ email: true, password: true });
        if (emailError(email) || loginPasswordError(password)) return;

        try {
            setError('');
            setLoading(true);
            await login(email.trim(), password);
        } catch (err) {
            setError(authErrorMessage(err));
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

                        <form onSubmit={handleSubmit} noValidate>
                            <TextField
                                id="email"
                                label="Email Address"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onBlur={() => email && setTouched(t => ({ ...t, email: true }))}
                                error={Boolean(emailErr)}
                                helperText={emailErr || ' '}
                                fullWidth
                                required
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                id="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onBlur={() => password && setTouched(t => ({ ...t, password: true }))}
                                error={Boolean(passwordErr)}
                                helperText={passwordErr || ' '}
                                fullWidth
                                required
                                margin="normal"
                                variant="outlined"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
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
