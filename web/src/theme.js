import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#006A3B',
            light: '#33885C',
            dark: '#004A29',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#F57C00',
            light: '#FF9800',
            dark: '#E65100',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F4F7F6',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#181D19',
            secondary: '#5C6E64',
        },
        divider: '#EBEFE8',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 13,
        h1: { fontSize: '2rem', fontWeight: 800, color: '#006A3B' },
        h2: { fontSize: '1.75rem', fontWeight: 800, color: '#006A3B' },
        h3: { fontSize: '1.5rem', fontWeight: 700, color: '#181D19' },
        h4: { fontSize: '1.25rem', fontWeight: 700, color: '#181D19' },
        h5: { fontSize: '1.125rem', fontWeight: 700, color: '#181D19' },
        h6: { fontSize: '1rem', fontWeight: 700, color: '#181D19' },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 18px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 4px 8px rgba(0, 106, 59, 0.15)',
                        transform: 'translateY(-1px)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #006A3B 0%, #004A29 100%)',
                }
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid #EBEFE8',
                    boxShadow: '0px 4px 12px rgba(0, 106, 59, 0.03)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    border: 'none',
                    borderBottom: '1px solid #EBEFE8',
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                    borderTop: 'none',
                    borderBottom: 'none',
                    borderLeft: 'none',
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid #EBEFE8',
                    boxShadow: '0px 4px 12px rgba(0, 106, 59, 0.03)',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #EBEFE8',
                    padding: '16px',
                },
                head: {
                    fontWeight: 700,
                    color: '#006A3B',
                    backgroundColor: '#F1F8F6',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                },
            },
        },
    },
});

export default theme;
