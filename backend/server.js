const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { recommend, setBlocked } = require('./ai/recommender');
const { reply } = require('./ai/concierge');
const { insightsFor } = require('./ai/insights');
const { forecastDemand, demandHistory, predictEcoScore, ecoFeatures, metrics, classifyIntent } = require('./ai/models');
const { destinations, resolvePlace } = require('./ai/places');
const { getWeather } = require('./ai/weather');
const { sendSms, isConfigured: smsConfigured } = require('./sms');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Firebase Web API key is public by design; it is only used to validate ID tokens.
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyACNB5L3HjIjZIwuYA4T-f6cUFt-G4NOk8';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ceylo-app';
const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'support', 'content_manager'];

// Verifies a Firebase ID token by asking the Identity Toolkit who it belongs to.
async function verifyIdToken(idToken) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId || null;
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });
    try {
        const uid = await verifyIdToken(idToken);
        if (!uid) return res.status(401).json({ error: 'Invalid auth token' });
        req.uid = uid;
        req.idToken = idToken;
        next();
    } catch (e) {
        res.status(503).json({ error: 'Auth service unavailable' });
    }
}

// Reads the caller's role through the Firestore REST API with their own token,
// so the server needs no service account.
async function getUserRole(uid, idToken) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.fields?.role?.stringValue || null;
}

async function requireStaff(req, res, next) {
    try {
        const role = await getUserRole(req.uid, req.idToken);
        if (!STAFF_ROLES.includes(role)) return res.status(403).json({ error: 'Admin access required' });
        next();
    } catch (e) {
        res.status(503).json({ error: 'Could not verify role' });
    }
}

// Per-IP limits. A load test from one machine (loadtest/run.js) switches them off with DISABLE_RATE_LIMIT=1.
const skipLimits = () => process.env.DISABLE_RATE_LIMIT === '1';
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, skip: skipLimits });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, skip: skipLimits });
app.use('/api/', apiLimiter);

// Destinations staff paused in the admin portal are left out of recommendations.
// destinations is publicly readable, so the public Web API key is enough.
async function refreshBlockedDestinations() {
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'destinations' }],
                    where: { fieldFilter: { field: { fieldPath: 'aiBlocked' }, op: 'EQUAL', value: { booleanValue: true } } },
                },
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return;
        const rows = await res.json();
        setBlocked(rows.map(r => r.document?.fields?.name?.stringValue).filter(Boolean));
    } catch (e) {
        console.warn('Could not refresh blocked destinations:', e.message);
    }
}

// Times recent inferences so the admin portal can show real latency
const latency = {};
function timed(name, fn) {
    const start = performance.now();
    const result = fn();
    const ms = performance.now() - start;
    const l = latency[name] || (latency[name] = { count: 0, totalMs: 0, lastMs: 0 });
    l.count += 1;
    l.totalMs += ms;
    l.lastMs = Math.round(ms * 100) / 100;
    return result;
}

// Recommendation endpoint: best destinations for a mood, 5-10 items (one per trip day),
// ranked by the trained two-tower recommender
// Body: { mood, days, destination?, budget?, ecoInterest?, month?, strategy?, lat?, lon?, avoidCrowds?, mobility? }
app.post('/api/recommend', async (req, res) => {
    const { mood, days, destination, budget, ecoInterest, month, strategy, lat, lon, avoidCrowds, mobility } = req.body || {};
    const origin = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && lat !== null && lon !== null
        ? { lat: Number(lat), lon: Number(lon) } : null;
    // Forecast for the trip area (the requested place, else where the traveller is); skipped when unknown
    const place = resolvePlace(destination);
    const area = place?.lat != null ? place : origin;
    const weather = area ? await getWeather(area.lat, area.lon, { timeoutMs: 2500 }) : null;
    const result = timed('recommender', () => recommend({
        mood, days, destination, budget, ecoInterest, month, strategy, origin, weather, avoidCrowds: Boolean(avoidCrowds),
        mobility: ['low', 'walking'].includes(mobility) ? mobility : 'standard',
    }));
    res.json({ success: true, mood, ...result });
});

// Current weather and 7-day forecast (Open-Meteo, no API key), by coordinates or place name
app.get('/api/weather', async (req, res) => {
    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        const place = resolvePlace(req.query.place);
        if (!place || place.lat == null) return res.status(400).json({ error: 'lat and lon, or a known place, are required' });
        ({ lat, lon } = place);
    }
    if (lat < 5 || lat > 10.5 || lon < 79 || lon > 82.5) return res.status(400).json({ error: 'Location is outside Sri Lanka' });
    const weather = await getWeather(lat, lon);
    if (!weather) return res.status(503).json({ error: 'Weather service unavailable' });
    res.json(weather);
});

// Concierge chatbot, run by the trained intent classifier (no external AI service).
// Body: { message: string, state?: { destination, days, budget, mood, awaiting } }
app.post('/api/chat', aiLimiter, (req, res) => {
    const { message, state } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }
    const result = timed('chatbot', () => reply(message.slice(0, 1000), state && typeof state === 'object' ? state : {}));
    res.json({ model: 'ceylo-intent-classifier', result });
});

// Destination facts, nearby places and the eco model's sustainability breakdown
app.post('/api/insights', (req, res) => {
    const { id, name, lat, lon, category, province } = req.body || {};
    if (!id && !name) return res.status(400).json({ error: 'id or name is required' });
    res.json(timed('insights', () => insightsFor({ id, name, lat, lon, category, province })));
});

// Eco score for a new place from its five sustainability features (random forest)
app.post('/api/eco-score', (req, res) => {
    const body = req.body || {};
    const missing = ecoFeatures.filter(f => body[f] === undefined || body[f] === '');
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
    const score = timed('eco', () => predictEcoScore(body));
    if (score === null) return res.status(400).json({ error: 'Features must be numbers (capacity adherence true/false)' });
    res.json({ ecoScore: Math.round(score * 10) / 10 });
});

// Island-wide booking demand forecast from the LSTM
app.get('/api/forecast', (req, res) => {
    const days = Math.min(60, Math.max(1, parseInt(req.query.days, 10) || 14));
    const values = timed('demand', () => forecastDemand(days));
    const last = new Date(`${demandHistory[demandHistory.length - 1].date}T00:00:00Z`);
    const forecast = values.map((v, i) => {
        const d = new Date(last);
        d.setUTCDate(d.getUTCDate() + i + 1);
        return { date: d.toISOString().slice(0, 10), bookings: Math.round(v) };
    });
    res.json({ history: demandHistory.slice(-60), forecast });
});

// Model cards for the admin AI Model Monitor
app.get('/api/models', (req, res) => {
    const stats = Object.fromEntries(Object.entries(latency).map(([k, v]) => [k, {
        requests: v.count, avgMs: Math.round((v.totalMs / v.count) * 100) / 100, lastMs: v.lastMs,
    }]));
    res.json({ ...metrics, latency: stats });
});

// Lets staff try the intent classifier from the admin portal
app.post('/api/models/intent', (req, res) => {
    const text = String(req.body?.message || '').slice(0, 1000);
    if (!text.trim()) return res.status(400).json({ error: 'message is required' });
    res.json({ ranked: timed('chatbot', () => classifyIntent(text)).slice(0, 3) });
});

// Push broadcast proxy: Expo's push API cannot be called from a browser (CORS),
// and only staff may broadcast.
app.post('/api/push', requireAuth, requireStaff, async (req, res) => {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages is required' });
    }
    const valid = messages.filter(m => typeof m.to === 'string' && m.to.startsWith('ExponentPushToken'));
    const tickets = [];
    try {
        for (let i = 0; i < valid.length; i += 100) {
            const r = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(valid.slice(i, i + 100)),
            });
            const data = await r.json();
            tickets.push(...(data.data || []));
        }
        res.json({ success: true, sent: valid.length, tickets });
    } catch (e) {
        res.status(502).json({ error: 'Expo push service failed: ' + e.message });
    }
});

// Booking notifications (Sprint 3). The booking is read with the caller's own token, so
// Firestore rules guarantee the caller is part of it; the message is derived from the
// booking's real status, never from the request body.
async function readDoc(path, idToken) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return Object.fromEntries(Object.entries(data.fields || {}).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? null]));
}

function bookingMessage(booking, callerIsTraveller) {
    const kind = booking.driverId !== undefined || booking.vehicleType ? 'ride' : 'tour';
    const status = String(booking.status || 'pending').toLowerCase();
    if (callerIsTraveller) {
        if (status === 'pending') return { title: `New ${kind} request`, body: `${booking.userName || booking.touristName || 'A traveller'} sent a ${kind} request. Open CEYLO to accept or decline.` };
        if (status === 'cancelled') return { title: 'Booking cancelled', body: `A traveller cancelled their ${kind} request.` };
        if (status === 'confirmed') return { title: 'Booking confirmed', body: `The traveller confirmed the ${kind}.` };
        return null;
    }
    if (status === 'accepted' || status === 'confirmed') return { title: 'Booking accepted', body: `Your ${kind} request was accepted. Open CEYLO to chat and see the details.` };
    if (status === 'declined' || status === 'rejected') return { title: 'Booking declined', body: `Your ${kind} request was declined. CEYLO can suggest other providers nearby.` };
    if (status === 'completed') return { title: 'How was it?', body: `Your ${kind} is complete. Leave a review to help other travellers.` };
    return null;
}

app.post('/api/notify-booking', requireAuth, async (req, res) => {
    const bookingId = String(req.body?.bookingId || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(bookingId)) return res.status(400).json({ error: 'bookingId is required' });
    try {
        const booking = await readDoc(`bookings/${bookingId}`, req.idToken);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        const traveller = booking.touristId || booking.userId;
        const provider = booking.guideId || booking.driverId || booking.vendorId;
        const callerIsTraveller = req.uid === traveller;
        if (!callerIsTraveller && req.uid !== provider) return res.status(403).json({ error: 'Not part of this booking' });
        const recipient = callerIsTraveller ? provider : traveller;
        const message = bookingMessage(booking, callerIsTraveller);
        if (!recipient || !message) return res.json({ sent: 0 });
        const user = await readDoc(`users/${recipient}`, req.idToken);
        const to = user?.expoPushToken;
        if (!to || !String(to).startsWith('ExponentPushToken')) return res.json({ sent: 0, reason: 'recipient has no push token' });
        const r = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, sound: 'default', ...message, data: { type: 'booking', bookingId } }),
        });
        const data = await r.json();
        res.json({ sent: 1, ticket: data.data || null });
    } catch (e) {
        res.status(502).json({ error: 'Notification failed: ' + e.message });
    }
});

// SOS by SMS (FR-041). When a traveller raises an SOS online, the emergency desk also gets
// an SMS through the configured gateway (see sms.js: textbee for free development use, or
// Notify.lk). Without one the endpoint reports that SMS is not configured and the app keeps
// its pre-filled SMS fallback.
function sosSmsText(alert, alertId) {
    const lat = alert.location?.latitude, lon = alert.location?.longitude;
    const where = lat != null ? `https://maps.google.com/?q=${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}` : 'location not shared';
    return `CEYLO SOS ${alertId.slice(0, 6)}: ${alert.userName || 'Traveller'} needs help. ${where}. Phone: ${alert.phone || 'n/a'}`.slice(0, 300);
}

async function patchSosLog(alertId, fields, idToken) {
    const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/sos_alerts/${alertId}?${mask}`;
    const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: String(v) }])) };
    await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .catch(() => {});
}

app.post('/api/sos-sms', requireAuth, async (req, res) => {
    const alertId = String(req.body?.alertId || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(alertId)) return res.status(400).json({ error: 'alertId is required' });
    const { SOS_DESK_NUMBER } = process.env;
    try {
        const alert = await readDoc(`sos_alerts/${alertId}`, req.idToken);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        if (alert.userId !== req.uid) return res.status(403).json({ error: 'Only the traveller who raised the alert can send it' });
        if (!smsConfigured()) {
            await patchSosLog(alertId, { smsStatus: 'not_configured', smsAt: new Date().toISOString() }, req.idToken);
            return res.status(503).json({ sent: false, error: 'SMS gateway not configured' });
        }
        // readDoc flattens maps, so fetch the location separately when present
        const raw = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/sos_alerts/${alertId}`,
            { headers: { Authorization: `Bearer ${req.idToken}` } }).then(r => r.json());
        const loc = raw.fields?.location?.mapValue?.fields;
        const location = loc ? { latitude: loc.latitude?.doubleValue, longitude: loc.longitude?.doubleValue } : null;
        const text = sosSmsText({ ...alert, location }, alertId);
        const result = await sendSms(SOS_DESK_NUMBER, text);
        await patchSosLog(alertId, {
            smsStatus: result.ok ? 'sent' : 'failed', smsAt: new Date().toISOString(),
            smsTo: SOS_DESK_NUMBER, smsProvider: result.provider || '', smsDetail: String(result.detail || '').slice(0, 200),
        }, req.idToken);
        res.status(result.ok ? 200 : 502).json({ sent: result.ok, provider: result.provider });
    } catch (e) {
        res.status(502).json({ sent: false, error: 'SMS failed: ' + e.message });
    }
});

// Health check endpoint for system monitoring and frontend integration
app.get('/api/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'CEYLO AI Backend',
        destinationsLoaded: destinations.length,
        models: Object.fromEntries(Object.entries(metrics.models).map(([k, m]) => [k, { name: m.name, trained: m.trained }])),
        timestamp: new Date().toISOString()
    });
});

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`CEYLO AI Backend running on http://localhost:${PORT}`);
    });
    refreshBlockedDestinations();
    setInterval(refreshBlockedDestinations, 5 * 60 * 1000);
}

module.exports = app;
