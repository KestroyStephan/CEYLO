const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');
const models = require('../ai/models');
const recommenderModel = require('../ai/recommenderModel');
const contentModel = require('../models/content_recommender.json');
const { destinations } = require('../ai/places');
const { recommend } = require('../ai/recommender');
const weather = require('../ai/weather');
const { reply, extractDays, extractBudget, extractMood } = require('../ai/concierge');

// Open-Meteo is never called from tests: a rainy week everywhere
const RAINY_WEEK = {
    current: { temperature_2m: 24, precipitation: 3, weather_code: 63, wind_speed_10m: 10 },
    daily: {
        time: ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'],
        weather_code: [63, 63, 95, 61, 80, 63, 61],
        temperature_2m_max: [30, 30, 29, 29, 30, 31, 30],
        temperature_2m_min: [21, 21, 21, 22, 21, 22, 21],
        precipitation_probability_max: [90, 85, 100, 80, 75, 90, 70],
    },
};
beforeEach(() => {
    weather._cache.clear();
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (String(url).includes('open-meteo')) return { ok: true, json: async () => RAINY_WEEK };
        return { ok: false, status: 503, json: async () => ({}) };
    });
});
afterEach(() => jest.restoreAllMocks());

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
        expect(seven.body.modelVersion).toBe(contentModel.version);
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

describe('Context-aware ranking', () => {
    const rainy = weather.parse(RAINY_WEEK);
    const outdoorShare = (r) => r.top_matches.filter(m => ['Beach', 'Waterfall', 'Nature & Viewpoint'].includes(m.category)).length;

    it('ranks fewer outdoor places when rain is forecast', () => {
        const dry = recommend({ mood: 'family', days: 7, count: 10 });
        const wet = recommend({ mood: 'family', days: 7, count: 10, weather: rainy });
        expect(outdoorShare(wet)).toBeLessThan(outdoorShare(dry));
        expect(wet.top_matches.some(m => m.reason.includes('rain'))).toBe(true);
    });

    it('favours quieter places when the traveller avoids crowds', () => {
        const avg = (r) => r.top_matches.reduce((s, m) => s + m.crowdIndex, 0) / r.top_matches.length;
        const normal = recommend({ mood: 'culture', days: 10 });
        const quiet = recommend({ mood: 'culture', days: 10, avoidCrowds: true });
        expect(avg(quiet)).toBeLessThanOrEqual(avg(normal));
    });

    it('location strategy keeps picks close to the traveller', () => {
        const origin = { lat: 6.0535, lon: 80.221 }; // Galle
        const near = recommend({ mood: 'eco', days: 5, strategy: 'location', origin });
        const mood = recommend({ mood: 'eco', days: 5, strategy: 'mood', origin });
        const meanKm = (r) => r.top_matches.reduce((s, m) => s + Math.hypot(m.lat - origin.lat, m.lon - origin.lon), 0);
        expect(near.strategy).toBe('location');
        expect(meanKm(near)).toBeLessThan(meanKm(mood));
    });

    it('looks up the LSTM crowd forecast by month, falling back to the same month of the last forecast year', () => {
        const f = { '2026-08': 0.9, '2027-08': 0.8, '2027-01': 0.2 };
        expect(recommenderModel.crowdFor(f, 2026, 8)).toBe(0.9);
        expect(recommenderModel.crowdFor(f, 2030, 8)).toBe(0.8);
        expect(recommenderModel.crowdFor(f, 2030, 3)).toBe(0);
        expect(destinations.every(d => Object.keys(d.crowd_forecast).length === 24)).toBe(true);
    });

    it('phone and backend share the same crowd forecast', () => {
        const mobile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'mobile', 'assets', 'data', 'crowd_forecast.json'), 'utf-8'));
        for (const d of destinations.slice(0, 20)) expect(mobile[d.destination_id]).toEqual(d.crowd_forecast);
    });

    it('builds TensorFlow Lite input with one zero-padded row per destination', () => {
        const profile = recommenderModel.profileFromApp({ mood: 'culture', budget: 'Standard', days: 5 });
        const input = recommenderModel.tfliteInput(contentModel, profile, destinations.slice(0, 3), 8);
        const { batch, features } = contentModel.tflite;
        expect(input.length).toBe(batch * features);
        const row1 = recommenderModel.userFeatures(contentModel, profile, 8).concat(recommenderModel.destinationFeatures(contentModel, destinations[1], 8));
        expect(Array.from(input.slice(features, 2 * features))).toEqual(row1.map(v => Math.fround(v)));
        expect(input.slice(3 * features).every(v => v === 0)).toBe(true);
        expect(fs.existsSync(path.join(__dirname, '..', '..', 'mobile', contentModel.tflite.file))).toBe(true);
    });

    it('skips destinations out of season for the trip month', () => {
        const r = recommend({ mood: 'family', days: 10, month: 7, count: 275 });
        expect(r.top_matches.every(m => destinations.find(d => d.destination_id === m.id).seasonal_availability !== 'Nov-April')).toBe(true);
    });

    it('serves the weather and uses it for a named place', async () => {
        const w = await request(app).get('/api/weather?place=Kandy');
        expect(w.statusCode).toBe(200);
        expect(w.body.daily.length).toBe(7);
        expect(w.body.daily[0].rainy).toBe(true);
        const r = await request(app).post('/api/recommend').send({ mood: 'family', days: 5, destination: 'Kandy' });
        expect(r.body.weather.rainyShare).toBe(1);
    });

    it('rejects weather requests outside Sri Lanka', async () => {
        const r = await request(app).get('/api/weather?lat=51.5&lon=-0.1');
        expect(r.statusCode).toBe(400);
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

    it('content-based recommender', () => {
        for (const c of contentModel.checks) {
            const d = destinations.find(x => x.destination_id === c.destinationId);
            expect(recommenderModel.scoreDestinations(contentModel, c.profile, [d], c.month)[0]).toBeCloseTo(c.score, 5);
        }
    });

    it('the phone runs the same recommender code and model as the backend', () => {
        const mobile = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'mobile', f), 'utf-8').replace(/\r\n/g, '\n');
        const backend = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf-8').replace(/\r\n/g, '\n');
        expect(mobile('utils/recommenderModel.js')).toBe(backend('ai/recommenderModel.js'));
        expect(JSON.parse(mobile('assets/data/content_recommender.json'))).toEqual(contentModel);
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
        expect(Object.keys(response.body.models)).toEqual(['chatbot', 'recommender', 'demand', 'eco', 'crowd']);
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
