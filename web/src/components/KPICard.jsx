import React from 'react';
import { Paper, Box, Typography, Avatar } from '@mui/material';

export default function KPICard({ 
    title, 
    value, 
    icon, 
    iconBgColor = '#F1F5F9', // Light Slate
    iconColor = '#64748B',   // Slate 500
    trend,
    trendUp = true,
    onClick,
    cardBgColor = '#FFFFFF',
    borderColor = '#E2E8F0' // Slate 200
}) {
    return (
        <Paper 
            onClick={onClick}
            sx={{ 
                p: 2.5, 
                borderRadius: 2, 
                border: `1px solid ${borderColor}`, 
                bgcolor: cardBgColor,
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.02)', // Minimal shadow
                position: 'relative',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': onClick ? {
                    borderColor: '#006A3B',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
                } : {}
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                    {title}
                </Typography>
                <Avatar sx={{ bgcolor: iconBgColor, color: iconColor, width: 32, height: 32, borderRadius: 1.5 }}>
                    {icon}
                </Avatar>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h5" fontWeight={600} color={cardBgColor !== '#FFFFFF' ? iconColor : '#0F172A'}>
                    {value}
                </Typography>
                {trend && (
                    <Typography 
                        variant="caption" 
                        fontWeight={600} 
                        color={trendUp ? '#10B981' : '#EF4444'}
                    >
                        {trendUp ? '↑ ' : '↓ '} {trend}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}
