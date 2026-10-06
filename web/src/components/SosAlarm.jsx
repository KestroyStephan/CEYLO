import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const SIREN_URL = 'https://actions.google.com/sounds/v1/emergency/emergency_siren.ogg';
const millis = (t) => (t?.toMillis ? t.toMillis() : Date.parse(t) || null);
const waited = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

/**
 * Raises every new SOS on whatever admin page is open: a desktop notification, a siren and a
 * banner that stays until someone at the desk acknowledges the alert. The SOS monitor page has
 * its own siren, so this one stays quiet there.
 */
export default function SosAlarm() {
    const [unanswered, setUnanswered] = useState([]);
    const [now, setNow] = useState(() => Date.now());
    const seen = useRef(null);
    const siren = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const onMonitor = location.pathname === '/sos';

    useEffect(() => {
        siren.current = new Audio(SIREN_URL);
        siren.current.loop = true;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(t);
            siren.current?.pause();
        };
    }, []);

    useEffect(() => onSnapshot(query(collection(db, 'sos_alerts'), where('status', '==', 'active')), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (millis(a.timestamp) || 0) - (millis(b.timestamp) || 0));
        // The first snapshot is the backlog; only alerts that arrive later pop a notification
        if (seen.current) {
            list.filter(a => !seen.current.has(a.id)).forEach(a => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    const n = new Notification('🚨 New SOS alert', {
                        body: `${a.userName || 'A traveller'} needs help${a.location ? ` near ${Number(a.location.latitude).toFixed(4)}, ${Number(a.location.longitude).toFixed(4)}` : ''}`,
                        requireInteraction: true,
                        tag: a.id,
                    });
                    n.onclick = () => { window.focus(); navigate('/sos'); n.close(); };
                }
            });
        }
        seen.current = new Set(list.map(a => a.id));
        setUnanswered(list);
    }, (e) => console.error('SOS alarm listener:', e)), [navigate]);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    }, []);

    useEffect(() => {
        if (unanswered.length && !onMonitor) siren.current?.play().catch(() => {});
        else siren.current?.pause();
        document.title = unanswered.length ? `(${unanswered.length}) SOS – CEYLO Admin` : 'CEYLO Admin Portal';
    }, [unanswered.length, onMonitor]);

    if (!unanswered.length || onMonitor) return null;
    const oldest = unanswered[0];
    const wait = now - (millis(oldest.timestamp) || millis(oldest.clientCreatedAt) || now);
    return (
        <Box role="alert" sx={{
            position: 'sticky', top: 0, zIndex: 1300, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
            px: 2.5, py: 1.5, mb: 2, borderRadius: 3, color: '#FFF',
            bgcolor: wait > 120000 ? '#7F0000' : '#C62828', boxShadow: '0 8px 24px rgba(198,40,40,0.35)',
        }}>
            <WarningIcon />
            <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography fontWeight={900}>
                    {unanswered.length === 1 ? 'SOS: a traveller needs help' : `${unanswered.length} SOS alerts waiting`}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {oldest.userName || 'Traveller'} · waiting {waited(wait)}{wait > 120000 ? ' · no one has answered yet' : ''}
                </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/sos')}
                sx={{ bgcolor: '#FFF !important', color: '#C62828 !important', backgroundImage: 'none !important', fontWeight: 900, boxShadow: 'none', '&:hover': { bgcolor: '#FFEBEE !important' } }}>
                Open SOS monitor
            </Button>
        </Box>
    );
}
