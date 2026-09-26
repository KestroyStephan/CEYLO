import React from 'react';
import { Paper, Box, Typography, Avatar } from '@mui/material';

export default function KPICard({ 
    title, 
    value, 
    icon, 
    iconBgColor = '#E8F5E9', 
    iconColor = '#2E7D32',
    trend,
    trendUp = true,
    onClick,
    cardBgColor = '#FFFFFF',
    borderColor = '#EBEFE8'
}) {
    return (
        <Paper 
            onClick={onClick}
            sx={{ 
                p: 2.5, 
                borderRadius: 4, 
                border: `1px solid ${borderColor}`, 
                bgcolor: cardBgColor,
                boxShadow: 'none', 
                position: 'relative',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': onClick ? {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                } : {}
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: iconBgColor, color: iconColor, width: 36, height: 36 }}>
                    {icon}
                </Avatar>
                {trend && (
                    <Typography 
                        variant="caption" 
                        fontWeight={900} 
                        color={trendUp ? '#2E7D32' : '#D32F2F'}
                    >
                        {trendUp ? '📈 ' : '📉 '} {trend}
                    </Typography>
                )}
            </Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
                {title}
            </Typography>
            <Typography variant="h4" fontWeight={950} color={cardBgColor !== '#FFFFFF' ? iconColor : '#181D19'} sx={{ mt: 0.5 }}>
                {value}
            </Typography>
        </Paper>
    );
}
