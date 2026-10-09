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
const phoneAuth = require('./phoneAuth');
const payments = require('./payments');

const app = express();
// Render (and most hosts) sit behind one proxy hop; without this every user shares the proxy's IP
// and therefore one rate-limit bucket
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Firebase Web API key is public by design; it is only used to validate ID tokens.
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyACNB5L3HjIjZIwuYA4T-f6cUFt-G4NOk8';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ceylo-app';
// Local drills: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST point the REST calls at the emulators
const FIRESTORE_BASE = process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}` : 'https://firestore.googleapis.com';
const IDENTITY_BASE = process.env.FIREBASE_AUTH_EMULATOR_HOST ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'support', 'content_manager'];

// Verifies a Firebase ID token by asking the Identity Toolkit who it belongs to.
async function verifyIdToken(idToken) {
    const res = await fetch(`${IDENTITY_BASE}/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
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
    const url = `${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
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
        const url = `${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
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

// Chatbot code modification

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

app.post('/api/chat', aiLimiter, async (req, res) => {
    const { message, state } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    // previous code
    // const result = timed('chatbot', () => reply(message.slice(0, 1000), state && typeof state === 'object' ? state : {}));
    // res.json({ model: 'ceylo-intent-classifier', result });

    // Parameters: the tourist's trip details from the app
    const trip = state && typeof state === 'object' ? state : {};
    const destination = trip.destination || 'not decided yet';
    const mood = trip.mood || 'not decided yet';
    const days = trip.days || 'not decided yet';
    const budget = trip.budget || 'not decided yet';

    // Instructions for the model: tourism questions only
    const systemPrompt = `You are Ceylo, a friendly travel assistant for tourists in Sri Lanka.
Only answer questions about travel and tourism in Sri Lanka: places, trip plans, culture, festivals, food, transport, hotels, safety, weather, money and visas.
If the question is not about travel or tourism, reply with one polite sentence saying you can only help with Sri Lanka travel, and nothing else.
Use simple English and keep the answer under 80 words. Do not invent prices, phone numbers or hospitals.
For emergencies tell them to press the SOS button or call 1990 (ambulance) or 119 (police).
The tourist's trip: destination ${destination}, mood ${mood}, days ${days}, budget ${budget}.
Answer only the tourist's latest message.`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message.slice(0, 1000) },
                ],
            }),
        });
        const data = await response.json();
        const answer = data.message ? data.message.content.trim() : '';
        if (!answer) {
            throw new Error(data.error || 'empty answer from Ollama');
        }

        // Same shape the app's chatbot screen expects
        res.json({ model: OLLAMA_MODEL, result: { resp: answer, extractedState: trip, isReady: false, ui_options: [] } });
    } catch (error) {
        console.log('Ollama error:', error.message);
        res.json({
            model: OLLAMA_MODEL,
            result: { resp: 'Sorry, the travel assistant is not available right now. Please try again in a moment.', extractedState: trip, isReady: false, ui_options: [] },
        });
    }
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
// Firestore REST values -> plain JS (maps and arrays included)
function fromFirestore(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromFirestore(x)]));
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestore);
    return null;
}

async function readDoc(path, idToken) {
    const url = `${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return Object.fromEntries(Object.entries(data.fields || {}).map(([k, v]) => [k, fromFirestore(v)]));
}

// Online drivers of one vehicle type (drivers are readable by any signed-in user)
async function onlineDrivers(vehicleType, idToken) {
    const url = `${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
    const body = { structuredQuery: {
        from: [{ collectionId: 'drivers' }],
        where: { compositeFilter: { op: 'AND', filters: [
            { fieldFilter: { field: { fieldPath: 'isOnline' }, op: 'EQUAL', value: { booleanValue: true } } },
            { fieldFilter: { field: { fieldPath: 'vehicleType' }, op: 'EQUAL', value: { stringValue: vehicleType } } },
        ] } },
        limit: 200,
    } };
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.filter(r => r.document).map(r => ({
        id: r.document.name.split('/').pop(),
        ...Object.fromEntries(Object.entries(r.document.fields || {}).map(([k, v]) => [k, fromFirestore(v)])),
    }));
}

const { nearbyDrivers: nearbyForPickup } = require('./dispatch');

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
        // A new ride request goes to free online drivers of that vehicle type near the pickup
        if (callerIsTraveller && !provider && booking.vehicleType && String(booking.status).toLowerCase() === 'pending') {
            const drivers = nearbyForPickup(await onlineDrivers(booking.vehicleType, req.idToken), booking.pickupCoords);
            const tokens = [];
            for (const d of drivers.slice(0, 20)) {
                const t = (await readDoc(`push_tokens/${d.id}`, req.idToken))?.token;
                if (t && String(t).startsWith('ExponentPushToken')) tokens.push({ t, km: d.km });
            }
            if (!tokens.length) return res.json({ sent: 0, nearbyDrivers: drivers.length });
            const price = booking.price ? ` · LKR ${Number(booking.price).toLocaleString()}` : '';
            const messages = tokens.map(({ t, km }) => ({
                to: t, sound: 'default', title: `New ${booking.vehicleType} request`,
                body: `Pickup ${km.toFixed(1)} km away${price}. Open CEYLO to accept.`,
                data: { type: 'ride_request', bookingId },
            }));
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(messages),
            });
            return res.json({ sent: messages.length, nearbyDrivers: drivers.length });
        }
        if (!recipient || !message) return res.json({ sent: 0 });
        // Tokens live in push_tokens (travellers' profiles are private); older accounts only in users
        const tokenDoc = await readDoc(`push_tokens/${recipient}`, req.idToken);
        const to = tokenDoc?.token || (await readDoc(`users/${recipient}`, req.idToken))?.expoPushToken;
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
    const url = `${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/sos_alerts/${alertId}?${mask}`;
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
        const raw = await fetch(`${FIRESTORE_BASE}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/sos_alerts/${alertId}`,
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

// FR-001 phone sign-in: SMS code -> Firebase custom token (see phoneAuth.js)
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, skip: skipLimits });
app.get('/api/auth/phone/available', (req, res) => res.json({ available: phoneAuth.isAvailable() }));
app.post('/api/auth/phone/start', otpLimiter, async (req, res) => {
    try {
        const { status, body } = await phoneAuth.startVerification(req.body?.phone);
        res.status(status).json(body);
    } catch (e) {
        res.status(502).json({ error: 'Could not start phone sign-in' });
    }
});
app.post('/api/auth/phone/verify', otpLimiter, async (req, res) => {
    try {
        const { status, body } = await phoneAuth.verifyCode(req.body?.phone, req.body?.code);
        res.status(status).json(body);
    } catch (e) {
        console.warn('Phone verification failed:', e.message);
        res.status(502).json({ error: 'Could not finish phone sign-in' });
    }
});

// ---------------------------------------------------------------------------------------------
// Payments (PayHere). See payments.js for the flow.
let adminDb = null;
function firestoreAdmin(env = process.env) {
    if (adminDb) return adminDb;
    const { getApps, initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    let app = getApps()[0];
    if (!app && env.FIRESTORE_EMULATOR_HOST) {
        app = initializeApp({ projectId: FIREBASE_PROJECT_ID });
    } else if (!app && env.FIREBASE_SERVICE_ACCOUNT) {
        const raw = env.FIREBASE_SERVICE_ACCOUNT;
        const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
        app = initializeApp({ credential: cert(JSON.parse(json)) });
    }
    if (!app) return null;
    adminDb = getFirestore(app);
    return adminDb;
}

// Name and email from the (already verified) ID token, to prefill the PayHere form
function tokenClaims(idToken) {
    try {
        return JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'));
    } catch {
        return {};
    }
}

app.get('/api/pay/available', (req, res) => res.json({
    available: payments.isConfigured() && Boolean(firestoreAdmin()),
    sandbox: payments.config().sandbox,
}));

app.post('/api/pay/start', requireAuth, async (req, res) => {
    const kind = String(req.body?.kind || '');
    const id = String(req.body?.id || '');
    if (!['ride', 'guide', 'order'].includes(kind) || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        return res.status(400).json({ error: 'kind and id are required' });
    }
    if (!payments.isConfigured() || !firestoreAdmin()) return res.status(503).json({ error: 'Online payments are not set up' });
    try {
        const record = await readDoc(`${payments.collectionFor(kind)}/${id}`, req.idToken);
        const due = payments.payableFor(kind, record, req.uid);
        if (due.error) return res.status(due.status).json({ error: due.error });
        const claims = tokenClaims(req.idToken);
        const ticket = payments.signTicket({
            kind, id, uid: req.uid, amount: due.amount, currency: due.currency, item: due.item,
            name: claims.name || record.userName || record.customerName || record.touristName, email: claims.email, phone: claims.phone_number,
        });
        const base = payments.config().baseUrl || `${req.protocol}://${req.get('host')}`;
        res.json({ url: `${base}/pay/checkout?t=${encodeURIComponent(ticket)}`, amount: due.amount, currency: due.currency });
    } catch (e) {
        res.status(502).json({ error: 'Could not start the payment' });
    }
});

app.get('/pay/checkout', (req, res) => {
    const ticket = payments.readTicket(req.query.t);
    if (!ticket) return res.status(400).type('html').send(payments.resultPage(false));
    const env = payments.config().baseUrl ? process.env : { ...process.env, PUBLIC_BASE_URL: `${req.protocol}://${req.get('host')}` };
    res.type('html').send(payments.checkoutPage(ticket, env));
});
app.get('/pay/return', (req, res) => res.type('html').send(payments.resultPage(true)));
app.get('/pay/cancel', (req, res) => res.type('html').send(payments.resultPage(false)));

// Server-to-server notification from PayHere: the only thing that marks a payment as paid
app.post('/api/pay/notify', express.urlencoded({ extended: false }), async (req, res) => {
    const body = req.body || {};
    if (!payments.verifyNotify(body)) return res.status(400).send('bad signature');
    const [kind, ...rest] = String(body.order_id || '').split('_');
    const id = rest.join('_');
    const db = firestoreAdmin();
    if (!db || !['ride', 'guide', 'order'].includes(kind) || !id) return res.status(400).send('unknown order');
    const paid = String(body.status_code) === '2';
    try {
        const ref = db.collection(payments.collectionFor(kind)).doc(id);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists || snap.get('paymentStatus') === 'paid') return;
            tx.update(ref, paid ? {
                paymentStatus: 'paid',
                paidAmount: Number(body.payhere_amount),
                paidCurrency: body.payhere_currency,
                paymentId: String(body.payment_id || ''),
                paymentMethod: String(body.method || 'card'),
                paidAt: new Date().toISOString(),
            } : { paymentStatus: String(body.status_code) === '0' ? 'pending' : 'failed' });
        });
        await db.collection('payments').doc(String(body.payment_id || `${kind}_${id}_${Date.now()}`)).set({
            kind, recordId: id, statusCode: Number(body.status_code), amount: Number(body.payhere_amount),
            currency: body.payhere_currency, method: body.method || null, cardNo: body.card_no || null,
            gateway: 'payhere', sandbox: payments.config().sandbox, at: new Date().toISOString(),
        });
        res.send('ok');
    } catch (e) {
        console.error('Payment notify failed:', e.message);
        res.status(500).send('error');
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
