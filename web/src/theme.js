import { createTheme } from '@mui/material/styles';

// CEYLO portal design tokens.
// One accent (CEYLO green) for primary actions and selection; neutrals for everything else;
// red, amber and blue only for status. Surfaces are flat: 1px borders, no gradients or glows.
const ink = '#18201C';
const muted = '#5B6661';
const line = '#E3E7E4';
const surface = '#F6F7F6';
const accent = '#0B6B3A';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: accent, light: '#2E8656', dark: '#08532D', contrastText: '#FFFFFF' },
        secondary: { main: '#3D4A44', contrastText: '#FFFFFF' },
        error: { main: '#B42318' },
        warning: { main: '#B54708' },
        success: { main: '#167A45' },
        info: { main: '#1F5F99' },
        background: { default: surface, paper: '#FFFFFF' },
        text: { primary: ink, secondary: muted },
        divider: line,
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: 14,
        h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.015em', color: ink },
        h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', color: ink },
        h3: { fontSize: '1.375rem', fontWeight: 600, color: ink },
        h4: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.01em', color: ink },
        h5: { fontSize: '1.125rem', fontWeight: 600, color: ink },
        h6: { fontSize: '1rem', fontWeight: 600, color: ink },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        body2: { fontSize: '0.875rem' },
        caption: { fontSize: '0.75rem', color: muted },
        overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', color: muted },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    shape: { borderRadius: 8 },
    shadows: [
        'none',
        '0 1px 2px rgba(16, 24, 20, 0.05)',
        '0 1px 3px rgba(16, 24, 20, 0.08)',
        ...Array(22).fill('0 8px 24px rgba(16, 24, 20, 0.10)'),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: surface } },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 6, padding: '6px 14px', boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
                sizeSmall: { padding: '4px 10px', fontSize: '0.8125rem' },
                sizeLarge: { padding: '9px 20px' },
                outlined: { borderColor: line, color: ink, '&:hover': { borderColor: '#C9D0CC', backgroundColor: surface } },
                outlinedError: { borderColor: '#F1C4BF', color: '#B42318', '&:hover': { borderColor: '#B42318', backgroundColor: '#FEF3F2' } },
                outlinedPrimary: { borderColor: line, color: accent },
            },
        },
        MuiIconButton: {
            styleOverrides: { root: { borderRadius: 6 } },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { backgroundImage: 'none' },
                outlined: { borderColor: line },
                rounded: { borderRadius: 10 },
                elevation0: { border: `1px solid ${line}` },
            },
        },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: { root: { borderRadius: 10, border: `1px solid ${line}`, boxShadow: 'none' } },
        },
        MuiCardContent: {
            styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
        },
        MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: { root: { borderRadius: 0, border: 'none', borderBottom: `1px solid ${line}` } },
        },
        MuiDrawer: {
            styleOverrides: { paper: { borderRadius: 0, border: 'none' } },
        },
        MuiPopover: {
            styleOverrides: { paper: { border: `1px solid ${line}`, boxShadow: '0 8px 24px rgba(16, 24, 20, 0.10)' } },
        },
        MuiMenu: {
            styleOverrides: { paper: { border: `1px solid ${line}` } },
        },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 12, border: 'none', boxShadow: '0 16px 48px rgba(16, 24, 20, 0.18)' } },
        },
        MuiDialogTitle: {
            styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 600, padding: '20px 24px 8px' } },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', height: 24 },
                outlined: { borderColor: line },
            },
        },
        MuiTabs: {
            styleOverrides: { root: { minHeight: 44 }, indicator: { height: 2, backgroundColor: accent } },
        },
        MuiTab: {
            styleOverrides: {
                root: { minHeight: 44, padding: '10px 4px', marginRight: 20, minWidth: 0, fontWeight: 500, color: muted, '&.Mui-selected': { color: ink, fontWeight: 600 } },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: line },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9D0CC' },
                },
            },
        },
        MuiTableContainer: {
            styleOverrides: { root: { borderRadius: 10 } },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: `1px solid ${line}`, padding: '12px 16px', fontSize: '0.875rem' },
                head: { fontWeight: 600, color: muted, backgroundColor: '#FAFBFA', fontSize: '0.75rem', letterSpacing: '0.02em' },
            },
        },
        MuiTableRow: {
            styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#F8FAF9' } } },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    border: 'none',
                    fontSize: '0.875rem',
                    '--DataGrid-containerBackground': '#FAFBFA',
                    '--DataGrid-rowBorderColor': line,
                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: muted, fontSize: '0.75rem', letterSpacing: '0.02em' },
                    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
                    '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: '#F8FAF9' },
                },
            },
        },
        MuiAlert: {
            styleOverrides: { root: { borderRadius: 8, alignItems: 'center' }, standard: { border: '1px solid transparent' } },
        },
        MuiTooltip: {
            styleOverrides: { tooltip: { backgroundColor: ink, fontSize: '0.75rem', fontWeight: 500, borderRadius: 6 } },
        },
        MuiListItemButton: {
            styleOverrides: { root: { borderRadius: 6 } },
        },
        MuiLinearProgress: {
            styleOverrides: { root: { borderRadius: 4, backgroundColor: '#EEF1EF' } },
        },
    },
});

export default theme;
