const request = require('supertest');
const app = require('../server');
const { moodToVibe } = require('../server');

describe('RAG Recommendation API', () => {
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
        expect(seven.body.top_matches.every(d => d.vibe === 'Culture Seeker')).toBeTruthy();
    });

    it('should map onboarding mood ids and chatbot labels to dataset vibes', () => {
        expect(moodToVibe('eco')).toBe('Eco Explorer');
        expect(moodToVibe('Culture Seeker')).toBe('Culture Seeker');
        expect(moodToVibe('family')).toBe('Family Trip');
        expect(moodToVibe('spiritual')).toBe('Culture Seeker');
        expect(moodToVibe(undefined)).toBe('Eco Explorer');
    });

    it('should return numeric coordinates', async () => {
        const response = await request(app).post('/api/recommend').send({ mood: 'family' });
        const first = response.body.top_matches[0];
        expect(typeof first.lat).toBe('number');
        expect(typeof first.lon).toBe('number');
    });
});

describe('Protected endpoints', () => {
    it('should reject chat requests without a token', async () => {
        const response = await request(app).post('/api/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
        expect(response.statusCode).toBe(401);
    });

    it('should reject push requests without a token', async () => {
        const response = await request(app).post('/api/push').send({ messages: [] });
        expect(response.statusCode).toBe(401);
    });
});
