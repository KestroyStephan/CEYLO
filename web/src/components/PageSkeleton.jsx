import React from 'react';
import { Box, Skeleton, Paper, Grid } from '@mui/material';

export default function PageSkeleton() {
    return (
        <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 2 }} />
            </Box>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[1, 2, 3, 4].map((i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Paper sx={{ p: 2.5, borderRadius: 4, boxShadow: 'none' }}>
                            <Skeleton variant="circular" width={36} height={36} sx={{ mb: 1 }} />
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" height={40} />
                        </Paper>
                    </Grid>
                ))}
            </Grid>
            
            <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 'none', height: 400 }}>
                <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 2 }} />
            </Paper>
        </Box>
    );
}
