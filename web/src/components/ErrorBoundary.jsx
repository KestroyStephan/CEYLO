import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          height: '100vh', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa', p: 3 
        }}>
          <WarningAmberIcon sx={{ fontSize: 80, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h4" fontWeight={900} color="#37474f" gutterBottom>
            System Disconnected
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 500 }}>
            The Command Center encountered an unexpected error. Don't worry, background monitoring is still active. 
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => window.location.reload()}
          >
            Restart Command Center
          </Button>
        </Box>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
