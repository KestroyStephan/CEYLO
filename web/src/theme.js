import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0F172A', // Slate 900
            light: '#334155', // Slate 700
            dark: '#020617', // Slate 950
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#10B981', // Emerald 500
            light: '#34D399',
            dark: '#059669',
            contrastText: '#FFFFFF',
        },
        error: {
            main: '#EF4444',
            light: '#F87171',
            dark: '#DC2626',
        },
        warning: {
            main: '#F59E0B',
            light: '#FBBF24',
            dark: '#D97706',
        },
        success: {
            main: '#10B981',
        },
        info: {
            main: '#3B82F6',
        },
        background: {
            default: '#F8F9FA', // Very light neutral/off-white
            paper: '#FFFFFF',
        },
        text: {
            primary: '#0F172A',
            secondary: '#64748B', // Slate 500
            disabled: '#94A3B8',
        },
        divider: '#E2E8F0',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 13,
        h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
        h3: { fontSize: '1.25rem', fontWeight: 600 },
        h4: { fontSize: '1.125rem', fontWeight: 600 },
        h5: { fontSize: '1rem', fontWeight: 600 },
        h6: { fontSize: '0.875rem', fontWeight: 600 },
        subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
        subtitle2: { fontSize: '0.75rem', fontWeight: 500 },
        body1: { fontSize: '0.875rem', lineHeight: 1.5 }, // 14px
        body2: { fontSize: '0.8125rem', lineHeight: 1.5 }, // 13px for dense tables/content
        button: { textTransform: 'none', fontWeight: 500 },
        caption: { fontSize: '0.75rem' },
    },
    shape: {
        borderRadius: 6, // Global default, overridden below
    },
    shadows: [
        'none', // 0
        '0 1px 2px 0 rgb(0 0 0 / 0.05)', // 1
        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // 2
        '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // 3
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', // 4
        '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', // 5
        ...Array(19).fill('none') // Clear the rest of MUI's heavy shadows
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    padding: '6px 16px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                sizeSmall: {
                    padding: '4px 12px',
                    fontSize: '0.8125rem',
                },
                sizeLarge: {
                    padding: '8px 22px',
                    fontSize: '0.9375rem',
                },
                containedPrimary: {
                    backgroundColor: '#0F172A',
                    color: '#FFF',
                    '&:hover': { backgroundColor: '#334155' },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    border: '1px solid #E2E8F0', // Strict 1px border
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.02)', // Minimal shadow
                },
                elevation0: {
                    boxShadow: 'none',
                    border: 'none',
                },
                elevation1: {
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.02)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.02)',
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '24px',
                    '&:last-child': { paddingBottom: '24px' },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E2E8F0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#CBD5E1',
                    },
                },
                input: {
                    padding: '10px 14px',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #E2E8F0',
                    padding: '12px 16px', // Compact table density
                },
                head: {
                    fontWeight: 600,
                    color: '#64748B',
                    backgroundColor: '#F8F9FA', // Light grey header
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    fontWeight: 500,
                    height: 24,
                },
                label: {
                    padding: '0 8px',
                    fontSize: '0.75rem',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    border: 'none',
                    borderLeft: '1px solid #E2E8F0',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                },
            },
        },
    },
});

export default theme;
