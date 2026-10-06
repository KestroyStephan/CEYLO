import { Box, Typography } from '@mui/material';

// Page title row used on every portal page: a plain title, optional actions on the right.
// Pages do not carry marketing-style subtitles; the title says what the page is.
export default function PageHeader({ title, actions, children }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}>
                {title}
            </Typography>
            {(actions || children) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actions}{children}</Box>
            )}
        </Box>
    );
}
