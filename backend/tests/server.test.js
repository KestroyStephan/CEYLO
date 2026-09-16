const request = require('supertest');
const app = require('../server');

describe('RAG Recommendation API', () => {
    it('should return a 200 OK status on valid request', async () => {
        const response = await request(app)
            .post('/api/recommend')
            .send({
                mood: 'Adventure'
            });
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('context');
        expect(response.body.context).toHaveProperty('destinations');
    });

    it('should filter events when given a valid date range', async () => {
        const response = await request(app)
            .post('/api/recommend')
            .send({
                startDate: '2025-01-01',
                endDate: '2025-02-01'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.context).toHaveProperty('events');
        expect(Array.isArray(response.body.context.events)).toBeTruthy();
    });
});
