/**
 * phoneAuth.js
 * FR-001 phone-number sign-in without a native Firebase module. The server texts a 6-digit
 * code through the SMS gateway (sms.js), checks it, and returns a Firebase custom token that
 * the app passes to signInWithCustomToken. The Firebase user is created with that phone
 * number the first time.
 *
 * Needs FIREBASE_SERVICE_ACCOUNT (the service-account JSON from Firebase console, as plain
 * JSON or base64) and a configured SMS gateway.
 */
const crypto = require('crypto');
const { sendSms, gatewayReady } = require('./sms');

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

const pending = new Map();   // phone -> { hash, expires, attempts, sentAt, sends: [timestamps] }
const secret = crypto.randomBytes(32);

let adminAuth = null;
function firebaseAuth(env = process.env) {
    if (adminAuth) return adminAuth;
    const raw = env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const admin = require('firebase-admin');
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    adminAuth = app.auth();
    return adminAuth;
}

/** Sri Lankan numbers may be typed as 07X XXX XXXX; everything else needs the + prefix. */
function normalisePhone(input) {
    let p = String(input || '').replace(/[\s()-]/g, '');
    if (/^0\d{9}$/.test(p)) p = `+94${p.slice(1)}`;
    if (/^94\d{9}$/.test(p)) p = `+${p}`;
    return PHONE_RE.test(p) ? p : null;
}

const hashCode = (phone, code) => crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');

function isAvailable(env = process.env) {
    return Boolean(env.FIREBASE_SERVICE_ACCOUNT) && gatewayReady(env);
}

/** Sends a code. Returns { status, body } for the HTTP response. */
async function startVerification(rawPhone, { now = Date.now(), send = sendSms, env = process.env } = {}) {
    if (!isAvailable(env)) return { status: 503, body: { error: 'Phone sign-in is not set up on the server' } };
    const phone = normalisePhone(rawPhone);
    if (!phone) return { status: 400, body: { error: 'Enter the number with country code, e.g. +94771234567' } };

    const entry = pending.get(phone);
    const sends = (entry?.sends || []).filter(t => now - t < 60 * 60 * 1000);
    if (entry && now - entry.sentAt < RESEND_MS) return { status: 429, body: { error: 'Please wait a minute before asking for a new code' } };
    if (sends.length >= MAX_SENDS_PER_HOUR) return { status: 429, body: { error: 'Too many codes for this number. Try again in an hour.' } };

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const result = await send(phone, `Your CEYLO code is ${code}. It expires in 5 minutes. Do not share it.`, env);
    if (!result.ok) return { status: 502, body: { error: 'Could not send the SMS. Please try again.' } };
    pending.set(phone, { hash: hashCode(phone, code), expires: now + CODE_TTL_MS, attempts: 0, sentAt: now, sends: [...sends, now] });
    return { status: 200, body: { sent: true, phone, expiresInSeconds: CODE_TTL_MS / 1000 } };
}

/** Checks a code; on success returns a Firebase custom token for the phone's account. */
async function verifyCode(rawPhone, code, { now = Date.now(), auth = null, env = process.env } = {}) {
    const phone = normalisePhone(rawPhone);
    const entry = phone && pending.get(phone);
    if (!entry || now > entry.expires) return { status: 400, body: { error: 'The code has expired. Ask for a new one.' } };
    if (entry.attempts >= MAX_ATTEMPTS) {
        pending.delete(phone);
        return { status: 429, body: { error: 'Too many wrong codes. Ask for a new one.' } };
    }
    entry.attempts += 1;
    const given = Buffer.from(hashCode(phone, String(code || '').trim()), 'hex');
    if (!crypto.timingSafeEqual(given, Buffer.from(entry.hash, 'hex'))) {
        return { status: 400, body: { error: 'That code is not right.', attemptsLeft: MAX_ATTEMPTS - entry.attempts } };
    }
    pending.delete(phone);

    const fbAuth = auth || firebaseAuth(env);
    if (!fbAuth) return { status: 503, body: { error: 'Phone sign-in is not set up on the server' } };
    let user;
    let isNew = false;
    try {
        user = await fbAuth.getUserByPhoneNumber(phone);
    } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
        user = await fbAuth.createUser({ phoneNumber: phone });
        isNew = true;
    }
    const token = await fbAuth.createCustomToken(user.uid);
    return { status: 200, body: { token, isNew, phone } };
}

module.exports = { startVerification, verifyCode, normalisePhone, isAvailable, _pending: pending };
