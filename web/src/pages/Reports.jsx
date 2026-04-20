import React from 'react';
import { 
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Stack, Chip
} from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';

function Reports() {
    const reportData = [
        { id: 1, type: 'Financial', name: 'Monthly Revenue - April 2026', date: '2026-04-20', size: '1.2 MB' },
        { id: 2, type: 'Eco', name: 'Sustainability Adoption Rate', date: '2026-04-18', size: '450 KB' },
        { id: 3, type: 'Traffic', name: 'Tourist Flow Heatmap Data', date: '2026-04-15', size: '2.8 MB' },
        { id: 4, type: 'Audit', name: 'System Access Log', date: '2026-04-10', size: '15.4 MB' },
    ];

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text('CEYLO PLATFORM REPORT', 14, 10);
        doc.autoTable({
            head: [['ID', 'Report Name', 'Category', 'Generated Date']],
            body: reportData.map(r => [r.id, r.name, r.type, r.date]),
        });
        doc.save('CEYLO_Admin_Report.pdf');
    };

    const exportCSV = () => {
        const headers = ['ID', 'Report Name', 'Category', 'Generated Date'];
        const csvContent = [
            headers.join(','),
            ...reportData.map(r => [r.id, r.name, r.type, r.date].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'CEYLO_Admin_Report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} color="#37474f">
                    Reports & Data Exports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Generate and download comprehensive platform reports for external auditing and analysis.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#f8fbfc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Report Identity</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Generated</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Filesize</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Format</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                                            <Chip label={row.type} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                        </TableCell>
                                        <TableCell>{row.date}</TableCell>
                                        <TableCell>{row.size}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" startIcon={<PictureAsPdfIcon />} onClick={exportPDF}>PDF</Button>
                                                <Button size="small" startIcon={<DescriptionIcon />} onClick={exportCSV}>CSV</Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Quick Export</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Generate an on-demand master dump of all database collections.
                        </Typography>
                        <Stack spacing={2}>
                            <Button fullWidth variant="contained" state="success" color="primary" sx={{ py: 1.5, borderRadius: 2 }} onClick={exportCSV}>
                                Export Full Database (CSV)
                            </Button>
                            <Button fullWidth variant="outlined" color="primary" sx={{ py: 1.5, borderRadius: 2 }} onClick={exportPDF}>
                                Generate Monthly Audit (PDF)
                            </Button>
                        </Stack>
                    </Paper>

                    <Card sx={{ borderRadius: 4, bgcolor: '#f0f4f8' }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={800} color="#546e7a" sx={{ mb: 1 }}>EXPORT QUOTA</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                                <Typography variant="h4" fontWeight={900}>14</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>/ Unlimited</Typography>
                            </Box>
                            <Typography variant="caption">Exported this month</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Reports;
