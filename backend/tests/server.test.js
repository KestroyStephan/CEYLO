const request = require('supertest');
const app = require('../server');
const models = require('../ai/models');
const { reply, extractDays, extractBudget, extractMood } = require('../ai/concierge');

describe('Recommendation API (trained recommender)', () => {
    it('should return a 200 OK status on valid request', async () => {
        const response = await request(app)
            .post('/api/recommend')
            .send({ mood: 'Adventure' });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.top_matches)).toBeTruthy();
        expect(response.body.top_matches.length).toBe(5);
    });

    it('should return one destination per trip day, between 5 and 10', async () => {
        const many = await request(app).post('/api/recommend').send({ mood: 'eco', days: 14 });
        expect(many.body.top_matches.length).toBe(10);

        const seven = await request(app).post('/api/recommend').send({ mood: 'culture', days: 7 });
        expect(seven.body.top_matches.length).toBe(7);
        expect(seven.body.vibe).toBe('Culture Seeker');
        expect(seven.body.top_matches.every(d => d.category === 'Heritage & Culture')).toBeTruthy();
    });

    it('should explain each pick with the model prediction', async () => {
        const response = await request(app).post('/api/recommend').send({ mood: 'family' });
        const first = response.body.top_matches[0];
        expect(typeof first.lat).toBe('number');
        expect(typeof first.lon).toBe('number');
        expect(typeof first.predictedEngagement).toBe('number');
        expect(first.reason).toMatch(/Model predicts/);
    });

    it('should keep to the requested province', async () => {
        const response = await request(app).post('/api/recommend').send({ mood: 'culture', days: 5, destination: 'the south' });
        expect(response.body.top_matches.every(d => d.province === 'Southern Province')).toBeTruthy();
    });
});

describe('JavaScript inference matches the Python models', () => {
    it('intent classifier', () => {
        for (const c of models.checks.chatbot) {
            const top = models.classifyIntent(c.text)[0];
            expect(top.intent).toBe(c.intent);
            expect(top.confidence).toBeCloseTo(c.confidence, 4);
        }
    });

    it('two-tower recommender', () => {
        for (const c of models.checks.recommender) {
            expect(models.predictEngagement(models.cohortFor(c.cohort).vector, c.destinationId)).toBeCloseTo(c.score, 3);
        }
    });

    it('demand LSTM', () => {
        const forecast = models.forecastDemand(7);
        models.checks.demand.forecast7.forEach((v, i) => expect(Math.abs(forecast[i] - v)).toBeLessThan(0.5));
    });

    it('eco random forest', () => {
        for (const c of models.checks.eco) {
            const input = Object.fromEntries(models.ecoFeatures.map((f, i) => [f, c.input[i]]));
            expect(models.predictEcoScore(input)).toBeCloseTo(c.score, 3);
        }
    });
});

describe('Concierge chatbot', () => {
    it('extracts trip details', () => {
        expect(extractDays('we have 5 days', false)).toBe(5);
        expect(extractDays('one week', false)).toBe(7);
        expect(extractDays('4 nights', false)).toBe(5);
        expect(extractDays('7', true)).toBe(7);
        expect(extractDays('7', false)).toBeNull();
        expect(extractBudget('something cheap')).toBe('Economy');
        expect(extractBudget('luxury please')).toBe('Luxury');
        expect(extractMood('temples and ruins')).toBe('Culture Seeker');
        expect(extractMood('safari and waterfalls')).toBe('Eco Explorer');
    });

    it('builds a trip profile over several turns', () => {
        let state = {};
        state = reply('I want to plan a trip', state).extractedState;
        const place = reply('Kandy', state);
        expect(place.extractedState.destination).toBe('Kandy');
        expect(place.recommendations.length).toBe(3);
        const days = reply('5 days', place.extractedState);
        expect(days.extractedState.days).toBe(5);
        expect(days.isReady).toBe(true);
        expect(days.ui_options).toEqual(['Economy', 'Standard', 'Luxury']);
    });

    it('answers FAQs from the trained model without changing the trip', () => {
        const r = reply('Is the tap water safe to drink?', { destination: 'Galle', days: 3 });
        expect(r.intent).toBe('faq_07');
        expect(r.resp).toMatch(/bottled/);
        expect(r.extractedState.destination).toBe('Galle');
    });

    it('lists events for a month', () => {
        const r = reply('what festivals are on in august?', {});
        expect(r.intent).toBe('events');
        expect(r.resp).toMatch(/Esala Perahera/);
    });

    it('serves chat over HTTP with no auth or AI keys', async () => {
        const response = await request(app).post('/api/chat').send({ message: 'hello', state: {} });
        expect(response.statusCode).toBe(200);
        expect(response.body.result.intent).toBe('greeting');
        expect(response.body.result.resp).toMatch(/Ayubowan/);
    });

    it('rejects an empty message', async () => {
        const response = await request(app).post('/api/chat').send({ message: '' });
        expect(response.statusCode).toBe(400);
    });
});

describe('Other model endpoints', () => {
    it('predicts an eco score', async () => {
        const response = await request(app).post('/api/eco-score').send({
            carbon_footprint_index: 20, wildlife_disturbance_risk: 10, plastic_pollution_risk: 15,
            community_benefit_score: 85, carrying_capacity_adherence: true,
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.ecoScore).toBeGreaterThan(0);
        expect(response.body.ecoScore).toBeLessThanOrEqual(100);
    });

    it('rejects an eco score request with missing features', async () => {
        const response = await request(app).post('/api/eco-score').send({ carbon_footprint_index: 20 });
        expect(response.statusCode).toBe(400);
    });

    it('forecasts demand', async () => {
        const response = await request(app).get('/api/forecast?days=10');
        expect(response.body.forecast.length).toBe(10);
        expect(response.body.history.length).toBe(60);
        expect(response.body.forecast[0].date > response.body.history[59].date).toBe(true);
    });

    it('returns destination insights with nearby places', async () => {
        const response = await request(app).post('/api/insights').send({ name: 'Sigiriya Rock Fortress' });
        expect(response.body.found).toBe(true);
        expect(response.body.explore_nearby.length).toBe(3);
        expect(response.body.sustainability).toMatch(/random forest/);
    });

    it('lists model metrics', async () => {
        const response = await request(app).get('/api/models');
        expect(Object.keys(response.body.models)).toEqual(['chatbot', 'recommender', 'demand', 'eco']);
    });

    it('reports models, not AI provider keys, in the health check', async () => {
        const response = await request(app).get('/api/health');
        expect(response.body.models.chatbot.name).toBeTruthy();
        expect(response.body.aiProviders).toBeUndefined();
    });
});

describe('Protected endpoints', () => {
    it('should reject push requests without a token', async () => {
        const response = await request(app).post('/api/push').send({ messages: [] });
        expect(response.statusCode).toBe(401);
    });
});
