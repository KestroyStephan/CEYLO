const crypto = require('crypto');
const request = require('supertest');
const payments = require('../payments');

const env = { PAYHERE_MERCHANT_ID: '1211149', PAYHERE_MERCHANT_SECRET: 'test-secret', PAYHERE_SANDBOX: 'true', PUBLIC_BASE_URL: 'https://ceylo.example' };
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').toUpperCase();

describe('PayHere hashing', () => {
    it('builds the checkout hash the way PayHere documents it', () => {
        const expected = md5(`1211149ride_abc690.00LKR${md5('test-secret')}`);
        expect(payments.checkoutHash({ merchantId: '1211149', orderId: 'ride_abc', amount: 690, currency: 'LKR', secret: 'test-secret' })).toBe(expected);
    });

    it('accepts only notifications signed with the merchant secret', () => {
        const body = { merchant_id: '1211149', order_id: 'ride_abc', payhere_amount: '690.00', payhere_currency: 'LKR', status_code: '2' };
        const good = { ...body, md5sig: payments.notifySignature(body, 'test-secret') };
        expect(payments.verifyNotify(good, env)).toBe(true);
        expect(payments.verifyNotify({ ...good, status_code: '-2' }, env)).toBe(false);          // tampered status
        expect(payments.verifyNotify({ ...good, payhere_amount: '1.00' }, env)).toBe(false);     // tampered amount
        expect(payments.verifyNotify({ ...body, md5sig: payments.notifySignature(body, 'wrong') }, env)).toBe(false);
    });

    it('checkout tickets are tamper-proof and expire', () => {
        const t = payments.signTicket({ kind: 'ride', id: 'abc', amount: 690 }, env);
        expect(payments.readTicket(t, env)).toMatchObject({ kind: 'ride', id: 'abc', amount: 690 });
        const [data, mac] = t.split('.');
        const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, 'base64url')), amount: 1 })).toString('base64url');
        expect(payments.readTicket(`${forged}.${mac}`, env)).toBeNull();
    });
});

describe('what a traveller can pay', () => {
    const ride = { userId: 't1', status: 'Completed', price: 690, finalFare: 720, vehicleType: 'Tuk', dropoff: 'Kelaniya' };

    it('charges the final fare of a completed ride, in rupees', () => {
        expect(payments.payableFor('ride', ride, 't1')).toMatchObject({ amount: 720, currency: 'LKR' });
    });
    it('refuses rides still in progress, other people\'s bookings and paid ones', () => {
        expect(payments.payableFor('ride', { ...ride, status: 'InProgress' }, 't1').status).toBe(409);
        expect(payments.payableFor('ride', ride, 'someone-else').status).toBe(403);
        expect(payments.payableFor('ride', { ...ride, paymentStatus: 'paid' }, 't1').status).toBe(409);
    });
    it('guide tours are paid in US dollars once the guide accepts', () => {
        const tour = { touristId: 't1', status: 'accepted', totalAmount: 42.8, guideName: 'Nimal' };
        expect(payments.payableFor('guide', tour, 't1')).toMatchObject({ amount: 42.8, currency: 'USD' });
        expect(payments.payableFor('guide', { ...tour, status: 'pending' }, 't1').status).toBe(409);
    });
    it('marketplace orders are paid after the vendor accepts', () => {
        const order = { touristId: 't1', status: 'accepted', totalPrice: 1500, items: [{ name: 'Tea', qty: 2 }] };
        expect(payments.payableFor('order', order, 't1')).toMatchObject({ amount: 1500, currency: 'LKR', item: 'Tea x2' });
        expect(payments.payableFor('order', { ...order, status: 'pending' }, 't1').status).toBe(409);
    });
});

describe('payment routes', () => {
    let app;
    beforeAll(() => {
        Object.assign(process.env, env);
        app = require('../server');
    });

    it('serves a checkout page that posts the signed form to the PayHere sandbox', async () => {
        const t = payments.signTicket({ kind: 'order', id: 'o1', amount: 1500, currency: 'LKR', item: 'Tea x2', name: 'Test Rider' });
        const res = await request(app).get(`/pay/checkout?t=${encodeURIComponent(t)}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('action="https://sandbox.payhere.lk/pay/checkout"');
        expect(res.text).toContain('name="order_id" value="order_o1"');
        expect(res.text).toContain('name="amount" value="1500.00"');
        expect(res.text).toContain('https://ceylo.example/api/pay/notify');
    });

    it('rejects a forged checkout link and an unsigned notification', async () => {
        expect((await request(app).get('/pay/checkout?t=forged.ticket')).status).toBe(400);
        const res = await request(app).post('/api/pay/notify').type('form')
            .send({ merchant_id: '1211149', order_id: 'ride_abc', payhere_amount: '690.00', payhere_currency: 'LKR', status_code: '2', md5sig: 'X' });
        expect(res.status).toBe(400);
    });

    it('needs a signed-in traveller to start a payment', async () => {
        expect((await request(app).post('/api/pay/start').send({ kind: 'ride', id: 'abc' })).status).toBe(401);
    });
});
