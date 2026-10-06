import { Box } from '@mui/material';

// One status style for the whole portal: a small dot and a label on a tinted background
const TONES = {
    success: { fg: '#166534', bg: '#ECF6EF' },
    warning: { fg: '#92400E', bg: '#FDF4E3' },
    error: { fg: '#B42318', bg: '#FDECEA' },
    info: { fg: '#1F4E79', bg: '#EAF1F8' },
    neutral: { fg: '#4A5450', bg: '#F1F3F2' },
};

export default function StatusChip({ label, tone = 'neutral', sx }) {
    const t = TONES[tone] || TONES.neutral;
    return (
        <Box component="span" sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: '6px',
            bgcolor: t.bg, color: t.fg, fontSize: 12, fontWeight: 600, lineHeight: '20px', whiteSpace: 'nowrap', ...sx,
        }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.fg, flexShrink: 0 }} />
            {label}
        </Box>
    );
}
