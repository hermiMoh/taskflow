const request = require('supertest');

const app = require('../src/app');

describe('404 handler', () => {
    test('returns 404 for an unknown route', async () => {
        const response = await request(app)
            .get('/api/unknown');

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            'Route not found: GET /api/unknown'
        );
    });
});