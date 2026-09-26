import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563EB', // Vibrant Royal Blue
            light: '#60A5FA',
            dark: '#1D4ED8',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#10B981', // Vibrant Emerald
            light: '#34D399',
            dark: '#059669',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F1F5F9', // Slightly darker gray to make white cards pop
            paper: '#FFFFFF',
        },
        text: {
            primary: '#0F172A',
            secondary: '#475569',
        },
        divider: '#E2E8F0',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 13,
        h1: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A' },
        h2: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' },
        h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#0F172A' },
        h4: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#0F172A' },
        h5: { fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' },
        h6: { fontSize: '1rem', fontWeight: 700, color: '#0F172A' },
        subtitle1: { fontSize: '0.875rem', fontWeight: 600 },
        subtitle2: { fontSize: '0.8125rem', fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
        borderRadius: 12, // Softer, more modern corners
    },
    shadows: [
        'none',
        '0px 2px 4px rgba(15, 23, 42, 0.04), 0px 1px 2px rgba(15, 23, 42, 0.02)', // Soft ambient
        '0px 4px 8px rgba(15, 23, 42, 0.05), 0px 2px 4px rgba(15, 23, 42, 0.03)', // Hover state
        '0px 10px 15px -3px rgba(15, 23, 42, 0.08), 0px 4px 6px -4px rgba(15, 23, 42, 0.04)', // Popovers
        '0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 8px 10px -6px rgba(15, 23, 42, 0.05)', // Modals
        ...Array(20).fill('none')
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 18px',
                    boxShadow: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0px 4px 8px rgba(37, 99, 235, 0.15)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Premium subtle gradient
                    '&:hover': {
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    }
                }
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid #E2E8F0', // Very subtle border
                    boxShadow: '0px 2px 4px rgba(15, 23, 42, 0.03)', // Soft premium shadow
                    backgroundImage: 'none',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0px 4px 10px rgba(15, 23, 42, 0.03)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        boxShadow: '0px 8px 20px rgba(15, 23, 42, 0.06)',
                        transform: 'translateY(-2px)',
                    }
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #F1F5F9',
                    padding: '12px 16px',
                },
                head: {
                    fontWeight: 700,
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    textTransform: 'uppercase',
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderLeft: '1px solid #E2E8F0',
                    boxShadow: '-10px 0px 30px rgba(15, 23, 42, 0.05)',
                },
            },
        },
    },
});

export default theme;
