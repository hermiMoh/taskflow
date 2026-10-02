const request = require('supertest');

const app = require('../src/app');

describe('Task validation', () => {
    test('rejects a task without a title', async () => {
        const response = await request(app)
            .post('/api/tasks')
            .send({
                priority: 'high',
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    test('rejects an invalid priority', async () => {
        const response = await request(app)
            .post('/api/tasks')
            .send({
                title: 'Deploy TaskFlow',
                priority: 'critical',
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    msg: 'Priority must be low, medium or high',
                }),
            ])
        );
    });

    test('rejects an invalid status', async () => {
        const response = await request(app)
            .post('/api/tasks')
            .send({
                title: 'Deploy TaskFlow',
                status: 'running',
            });

        expect(response.statusCode).toBe(400);
    });
});