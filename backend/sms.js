/**
 * sms.js
 * SMS to the emergency desk (FR-041). Two gateways are supported:
 *
 *  - textbee (default, free for development): sends through an Android phone running the
 *    textbee app, using that phone's SIM. Free plan: 50 messages a day, 300 a month.
 *    Env: TEXTBEE_API_KEY
 *  - notifylk (Sri Lankan SMS gateway, paid): Env: NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY,
 *    NOTIFY_LK_SENDER_ID
 *
 * SMS_PROVIDER picks one explicitly; otherwise the first configured gateway is used.
 * SOS_DESK_NUMBER is the number that receives the alerts, in international format (+94...).
 */

function provider(env = process.env) {
    const chosen = (env.SMS_PROVIDER || '').toLowerCase();
    if (chosen === 'textbee' || chosen === 'notifylk') return chosen;
    if (env.TEXTBEE_API_KEY) return 'textbee';
    if (env.NOTIFY_LK_USER_ID && env.NOTIFY_LK_API_KEY) return 'notifylk';
    return null;
}

/** A gateway has its credentials (enough for sign-in codes). */
function gatewayReady(env = process.env) {
    const p = provider(env);
    if (p === 'textbee') return Boolean(env.TEXTBEE_API_KEY);
    if (p === 'notifylk') return Boolean(env.NOTIFY_LK_USER_ID && env.NOTIFY_LK_API_KEY);
    return false;
}

/** SOS SMS also needs the desk number to send to. */
function isConfigured(env = process.env) {
    return gatewayReady(env) && Boolean(env.SOS_DESK_NUMBER);
}

/** Sends one SMS. Resolves to { ok, provider, detail }; never throws for gateway errors. */
async function sendSms(to, message, env = process.env) {
    const p = provider(env);
    if (!gatewayReady(env)) return { ok: false, provider: p, detail: 'not_configured' };
    const number = String(to).trim();
    try {
        if (p === 'textbee') {
            const r = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
                method: 'POST',
                headers: { 'x-api-key': env.TEXTBEE_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients: [number.startsWith('+') ? number : `+${number}`], message }),
            });
            const data = await r.json().catch(() => ({}));
            // 200 means the gateway accepted it and pushed it to the phone; delivery depends on that phone
            return { ok: r.ok, provider: p, detail: r.ok ? 'accepted' : (data.message || data.error || `HTTP ${r.status}`) };
        }
        const qs = new URLSearchParams({
            user_id: env.NOTIFY_LK_USER_ID, api_key: env.NOTIFY_LK_API_KEY,
            sender_id: env.NOTIFY_LK_SENDER_ID || 'NotifyDEMO',
            to: number.replace(/^\+/, ''), message,
        });
        const r = await fetch(`https://app.notify.lk/api/v1/send?${qs}`);
        const data = await r.json().catch(() => ({}));
        const ok = r.ok && data.status === 'success';
        return { ok, provider: p, detail: ok ? 'sent' : (data.message || `HTTP ${r.status}`) };
    } catch (e) {
        return { ok: false, provider: p, detail: e.message };
    }
}

module.exports = { sendSms, isConfigured, gatewayReady, provider };
