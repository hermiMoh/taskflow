const request = require('supertest');

const app = require('../src/app');

describe('Health endpoint', () => {
    test('GET /api/health returns API status', async () => {
        const response = await request(app)
            .get('/api/health');

        expect(response.statusCode).toBe(200);

        expect(response.body).toEqual({
            status: 'UP',
            service: 'taskflow-api',
            version: '0.1.0',
        });
    });
});