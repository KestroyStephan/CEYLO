/**
 * Checks that PayHere accepts this merchant's checkout requests (merchant ID, secret, domain).
 * Sends one checkout request for a made-up LKR 10 order to the sandbox and prints PayHere's answer.
 * Nothing is charged and no CEYLO record is touched.
 *
 *   PowerShell:  $env:PAYHERE_MERCHANT_ID="1238543"; $env:PAYHERE_MERCHANT_SECRET="..."; node backend/scripts/payhere-check.js
 */
const payments = require('../payments');

const env = {
    ...process.env,
    PAYHERE_SANDBOX: process.env.PAYHERE_SANDBOX || 'true',
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://ceylo.onrender.com',
};
if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) {
    console.log('Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET first.');
    process.exit(1);
}

(async () => {
    const html = payments.checkoutPage({
        kind: 'check', id: String(Date.now()), amount: 10, currency: 'LKR',
        item: 'CEYLO configuration check', name: 'Config Check', email: 'check@ceylo.lk',
    }, env);
    const fields = {};
    for (const m of html.matchAll(/name="([a-z_0-9]+)" value="([^"]*)"/g)) fields[m[1]] = m[2].replace(/&amp;/g, '&');
    const res = await fetch(env.PAYHERE_SANDBOX === 'false' ? 'https://www.payhere.lk/pay/checkout' : 'https://sandbox.payhere.lk/pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: `${env.PUBLIC_BASE_URL}/` },
        body: new URLSearchParams(fields),
    });
    const text = (await res.text())
        .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    if (/Unauthorized payment request/i.test(text)) {
        console.log('PAYHERE CHECK: REJECTED - "Unauthorized payment request". The merchant ID, secret or domain do not match.');
    } else if (/CEYLO configuration check/.test(text)) {
        console.log('PAYHERE CHECK: OK - PayHere accepted the request and opened its checkout for this merchant.');
    } else if (/merchant'?s error|not allowed/i.test(text)) {
        console.log(`PAYHERE CHECK: REJECTED - ${text.slice(0, 200)}`);
    } else if (/card|visa|master|pay now|ez ?cash|genie|Pay with PayHere/i.test(text)) {
        console.log(`PAYHERE CHECK: OK - PayHere accepted the request. Page says: ${text.slice(0, 160)}`);
    } else {
        console.log(`PAYHERE CHECK: UNCLEAR (HTTP ${res.status}): ${text.slice(0, 300)}`);
    }
})().catch(e => console.log('PAYHERE CHECK: FAILED -', e.message));
