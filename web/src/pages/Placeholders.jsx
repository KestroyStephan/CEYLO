import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const PlaceholderPage = ({ title }) => (
    <Box sx={{ p: 4 }}>
        <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, bgcolor: '#f8fbfc', border: '2px dashed #cfd8dc' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#00695c', mb: 2 }}>
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                This module is under development as part of the Sharoobini Admin Portal expansion.
            </Typography>
        </Paper>
    </Box>
);

export const Destinations = () => <PlaceholderPage title="Destinations Management" />;
export const CulturalEvents = () => <PlaceholderPage title="Cultural Events Management" />;
export const Analytics = () => <PlaceholderPage title="Advanced Analytics" />;
export const Notifications = () => <PlaceholderPage title="Push Notification Broadcaster" />;
export const SystemHealth = () => <PlaceholderPage title="System Health Monitor" />;
export const Reports = () => <PlaceholderPage title="Reports & Exports" />;
