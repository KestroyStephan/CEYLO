/**
 * payments.js
 * Card and wallet payments through PayHere (Sri Lanka). The app never marks anything paid:
 *
 *   1. the app asks POST /api/pay/start for a checkout link for one of its own bookings or orders;
 *      the server reads the amount from Firestore (never from the app) and signs a short-lived ticket
 *   2. the phone opens GET /pay/checkout?t=<ticket>, which posts the PayHere form
 *   3. PayHere calls POST /api/pay/notify; only a notification whose md5sig matches the merchant
 *      secret marks the record paid (through the Admin SDK, so the rules keep travellers out)
 *
 * Env: PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, PAYHERE_SANDBOX ("false" for live payments),
 * PUBLIC_BASE_URL (this server's https address, e.g. https://ceylo.onrender.com),
 * FIREBASE_SERVICE_ACCOUNT (to record the payment).
 */
const crypto = require('crypto');

const TICKET_TTL_MS = 30 * 60 * 1000;
const md5 = (s) => crypto.createHash('md5').update(String(s)).digest('hex').toUpperCase();
const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);

function config(env = process.env) {
    return {
        merchantId: env.PAYHERE_MERCHANT_ID || '',
        secret: env.PAYHERE_MERCHANT_SECRET || '',
        sandbox: String(env.PAYHERE_SANDBOX ?? 'true').toLowerCase() !== 'false',
        baseUrl: (env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
    };
}
const isConfigured = (env = process.env) => Boolean(config(env).merchantId && config(env).secret);
const checkoutAction = (env = process.env) => (config(env).sandbox
    ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout');

/** PayHere request hash: MD5(merchant_id + order_id + amount + currency + MD5(secret)) */
function checkoutHash({ merchantId, orderId, amount, currency, secret }) {
    return md5(`${merchantId}${orderId}${money(amount)}${currency}${md5(secret)}`);
}

/** PayHere notify signature: MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret)) */
function notifySignature({ merchant_id, order_id, payhere_amount, payhere_currency, status_code }, secret) {
    return md5(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${md5(secret)}`);
}

function verifyNotify(body, env = process.env) {
    const { merchantId, secret } = config(env);
    if (!secret || !body || String(body.merchant_id) !== String(merchantId)) return false;
    const expected = notifySignature(body, secret);
    const got = String(body.md5sig || '').toUpperCase();
    return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

// Tickets are signed with the merchant secret so the checkout page needs no server-side session
function signTicket(payload, env = process.env) {
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TICKET_TTL_MS })).toString('base64url');
    const mac = crypto.createHmac('sha256', config(env).secret).update(data).digest('base64url');
    return `${data}.${mac}`;
}
function readTicket(ticket, env = process.env) {
    const [data, mac] = String(ticket || '').split('.');
    if (!data || !mac) return null;
    const expected = crypto.createHmac('sha256', config(env).secret).update(data).digest('base64url');
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
}

/**
 * What a traveller owes for a record, or why they cannot pay it.
 * kind: 'ride' | 'guide' (both in bookings) or 'order' (orders)
 */
function payableFor(kind, record, uid) {
    if (!record) return { error: 'Not found', status: 404 };
    const payer = record.touristId || record.userId;
    if (payer !== uid) return { error: 'Only the traveller can pay for this', status: 403 };
    if (record.paymentStatus === 'paid') return { error: 'Already paid', status: 409 };
    const status = String(record.status || '').toLowerCase();
    let amount;
    let currency = 'LKR';
    let item;
    if (kind === 'ride') {
        if (status !== 'completed') return { error: 'Rides are paid when the trip is complete', status: 409 };
        amount = Number(record.finalFare ?? record.price);
        item = `${record.vehicleType || 'Ride'} ride to ${record.dropoff || 'destination'}`;
    } else if (kind === 'guide') {
        if (!['accepted', 'confirmed'].includes(status)) return { error: 'The guide has not accepted this booking yet', status: 409 };
        amount = Number(record.totalAmount);
        currency = 'USD'; // guides price tours in US dollars
        item = `Guided tour with ${record.guideName || 'your guide'}`;
    } else if (kind === 'order') {
        if (!['accepted', 'preparing', 'ready'].includes(status)) return { error: 'The vendor has not accepted this order yet', status: 409 };
        amount = Number(record.totalPrice);
        item = (record.items || []).map(i => `${i.name} x${i.qty || 1}`).join(', ').slice(0, 100) || 'Marketplace order';
    } else {
        return { error: 'Unknown payment type', status: 400 };
    }
    if (!(amount > 0)) return { error: 'This booking has no price to pay online', status: 409 };
    return { amount: Number(money(amount)), currency, item };
}

const collectionFor = (kind) => (kind === 'order' ? 'orders' : 'bookings');

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(title, body, autoSubmit = false) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F8F6;color:#1B2B28;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:#fff;border-radius:20px;padding:28px 24px;max-width:420px;width:100%;box-shadow:0 8px 28px rgba(0,77,64,.12);text-align:center}
h1{font-size:22px;margin:8px 0 6px}p{color:#4B5B57;line-height:1.5}.amt{font-size:30px;font-weight:800;color:#00695C;margin:10px 0}
.btn{display:inline-block;margin-top:14px;background:#00695C;color:#fff;border:0;border-radius:28px;padding:14px 26px;font-size:16px;font-weight:700;text-decoration:none;width:100%;box-sizing:border-box}
.muted{font-size:13px;color:#6B7A76}</style></head><body><div class="card">${body}</div>
${autoSubmit ? '<script>setTimeout(function(){document.getElementById("ph").submit()},600)</script>' : ''}</body></html>`;
}

function checkoutPage(ticket, env = process.env) {
    const { merchantId, secret, baseUrl } = config(env);
    const orderId = `${ticket.kind}_${ticket.id}`;
    const [first, ...rest] = String(ticket.name || 'CEYLO Traveller').trim().split(/\s+/);
    const fields = {
        merchant_id: merchantId,
        return_url: `${baseUrl}/pay/return?o=${encodeURIComponent(orderId)}`,
        cancel_url: `${baseUrl}/pay/cancel`,
        notify_url: `${baseUrl}/api/pay/notify`,
        order_id: orderId,
        items: ticket.item,
        currency: ticket.currency,
        amount: money(ticket.amount),
        first_name: first || 'CEYLO',
        last_name: rest.join(' ') || 'Traveller',
        email: ticket.email || 'traveller@ceylo.lk',
        phone: ticket.phone || '0770000000',
        address: 'Sri Lanka',
        city: 'Colombo',
        country: 'Sri Lanka',
        custom_1: ticket.kind,
        custom_2: ticket.id,
        hash: checkoutHash({ merchantId, orderId, amount: ticket.amount, currency: ticket.currency, secret }),
    };
    const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`).join('');
    return page('CEYLO payment', `
<h1>Secure payment</h1><p>${escapeHtml(ticket.item)}</p>
<div class="amt">${escapeHtml(ticket.currency)} ${escapeHtml(Number(ticket.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }))}</div>
<form id="ph" method="post" action="${checkoutAction(env)}">${inputs}<button class="btn" type="submit">Continue to PayHere</button></form>
<p class="muted">Card, eZ Cash, mCash and Genie through PayHere${config(env).sandbox ? ' (test mode: no real money is charged)' : ''}.</p>`, true);
}

const resultPage = (ok) => page(ok ? 'Payment received' : 'Payment cancelled', ok
    ? '<h1>Payment received</h1><p>Thank you. CEYLO updates as soon as PayHere confirms it, usually within a few seconds.</p><a class="btn" href="ceylo://">Back to CEYLO</a>'
    : '<h1>Payment cancelled</h1><p>Nothing was charged. You can pay again from the app, or pay in cash.</p><a class="btn" href="ceylo://">Back to CEYLO</a>');

module.exports = {
    config, isConfigured, checkoutHash, notifySignature, verifyNotify, signTicket, readTicket,
    payableFor, collectionFor, checkoutPage, resultPage, money,
};
