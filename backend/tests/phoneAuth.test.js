const request = require('supertest');
const phoneAuth = require('../phoneAuth');

const env = { FIREBASE_SERVICE_ACCOUNT: '{}', TEXTBEE_API_KEY: 'k' };
let sentText = null;
const send = jest.fn(async (to, text) => { sentText = text; return { ok: true }; });
const codeFromSms = () => sentText.match(/\d{6}/)[0];

function fakeAuth(existing = {}) {
    return {
        getUserByPhoneNumber: jest.fn(async (p) => {
            if (existing[p]) return { uid: existing[p] };
            const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e;
        }),
        createUser: jest.fn(async ({ phoneNumber }) => ({ uid: `new_${phoneNumber}` })),
        createCustomToken: jest.fn(async (uid) => `token_for_${uid}`),
    };
}

beforeEach(() => {
    phoneAuth._pending.clear();
    send.mockClear();
    sentText = null;
});

describe('phone sign-in (FR-001)', () => {
    it('normalises Sri Lankan numbers', () => {
        expect(phoneAuth.normalisePhone('077 123 4567')).toBe('+94771234567');
        expect(phoneAuth.normalisePhone('94771234567')).toBe('+94771234567');
        expect(phoneAuth.normalisePhone('+44 7700 900123')).toBe('+447700900123');
        expect(phoneAuth.normalisePhone('12345')).toBeNull();
    });

    it('is unavailable until the service account and SMS gateway are set', async () => {
        expect(phoneAuth.isAvailable({})).toBe(false);
        const r = await phoneAuth.startVerification('0771234567', { env: {}, send });
        expect(r.status).toBe(503);
        expect(send).not.toHaveBeenCalled();
    });

    it('texts a 6-digit code and signs in an existing user', async () => {
        const start = await phoneAuth.startVerification('0771234567', { env, send });
        expect(start.status).toBe(200);
        expect(send.mock.calls[0][0]).toBe('+94771234567');
        const auth = fakeAuth({ '+94771234567': 'u1' });
        const r = await phoneAuth.verifyCode('+94771234567', codeFromSms(), { auth, env });
        expect(r).toEqual({ status: 200, body: { token: 'token_for_u1', isNew: false, phone: '+94771234567' } });
        expect(auth.createUser).not.toHaveBeenCalled();
    });

    it('creates the account on first sign-in', async () => {
        await phoneAuth.startVerification('+94770000001', { env, send });
        const auth = fakeAuth();
        const r = await phoneAuth.verifyCode('+94770000001', codeFromSms(), { auth, env });
        expect(r.body.isNew).toBe(true);
        expect(auth.createUser).toHaveBeenCalledWith({ phoneNumber: '+94770000001' });
    });

    it('rejects wrong codes, then locks after five attempts', async () => {
        await phoneAuth.startVerification('+94770000002', { env, send });
        const wrong = codeFromSms() === '000000' ? '111111' : '000000';
        const auth = fakeAuth();
        for (let i = 0; i < 5; i++) {
            const r = await phoneAuth.verifyCode('+94770000002', wrong, { auth, env });
            expect(r.status).toBe(400);
        }
        const locked = await phoneAuth.verifyCode('+94770000002', codeFromSms(), { auth, env });
        expect(locked.status).toBe(429);
        expect(auth.createCustomToken).not.toHaveBeenCalled();
    });

    it('expires codes after five minutes and limits resends', async () => {
        const t0 = 1_000_000;
        await phoneAuth.startVerification('+94770000003', { env, send, now: t0 });
        const again = await phoneAuth.startVerification('+94770000003', { env, send, now: t0 + 10_000 });
        expect(again.status).toBe(429);
        const late = await phoneAuth.verifyCode('+94770000003', codeFromSms(), { auth: fakeAuth(), env, now: t0 + 6 * 60 * 1000 });
        expect(late.status).toBe(400);
    });

    it('a code can be used only once', async () => {
        await phoneAuth.startVerification('+94770000004', { env, send });
        const code = codeFromSms();
        const auth = fakeAuth();
        expect((await phoneAuth.verifyCode('+94770000004', code, { auth, env })).status).toBe(200);
        expect((await phoneAuth.verifyCode('+94770000004', code, { auth, env })).status).toBe(400);
    });

    it('the HTTP endpoint reports when phone sign-in is not set up', async () => {
        const app = require('../server');
        const r = await request(app).post('/api/auth/phone/start').send({ phone: '0771234567' });
        expect(r.statusCode).toBe(503);
    });
});
