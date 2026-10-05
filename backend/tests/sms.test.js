const { sendSms, isConfigured, provider } = require('../sms');

const desk = '+94771234567';

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('SOS SMS gateway', () => {
    it('is not configured without a gateway key and desk number', async () => {
        expect(isConfigured({})).toBe(false);
        expect(isConfigured({ TEXTBEE_API_KEY: 'k' })).toBe(false);
        const r = await sendSms(desk, 'help', {});
        expect(r).toEqual({ ok: false, provider: null, detail: 'not_configured' });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('uses textbee by default when its key is set', () => {
        expect(provider({ TEXTBEE_API_KEY: 'k', NOTIFY_LK_USER_ID: 'u', NOTIFY_LK_API_KEY: 'a' })).toBe('textbee');
        expect(provider({ SMS_PROVIDER: 'notifylk', TEXTBEE_API_KEY: 'k' })).toBe('notifylk');
    });

    it('sends through textbee with the API key header and recipients list', async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { smsBatchId: 'b1' } }) });
        const r = await sendSms(desk, 'CEYLO SOS test', { TEXTBEE_API_KEY: 'secret', SOS_DESK_NUMBER: desk });
        expect(r).toEqual({ ok: true, provider: 'textbee', detail: 'accepted' });
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('https://api.textbee.dev/api/v1/gateway/send-sms');
        expect(opts.headers['x-api-key']).toBe('secret');
        expect(JSON.parse(opts.body)).toEqual({ recipients: [desk], message: 'CEYLO SOS test' });
    });

    it('reports a textbee limit or device error instead of throwing', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ message: 'Daily limit reached' }) });
        const r = await sendSms(desk, 'x', { TEXTBEE_API_KEY: 'k', SOS_DESK_NUMBER: desk });
        expect(r).toEqual({ ok: false, provider: 'textbee', detail: 'Daily limit reached' });
    });

    it('sends through Notify.lk without the plus sign', async () => {
        global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success' }) });
        const env = { SMS_PROVIDER: 'notifylk', NOTIFY_LK_USER_ID: 'u', NOTIFY_LK_API_KEY: 'a', SOS_DESK_NUMBER: desk };
        const r = await sendSms(desk, 'x', env);
        expect(r.ok).toBe(true);
        expect(global.fetch.mock.calls[0][0]).toContain('to=94771234567');
    });
});
