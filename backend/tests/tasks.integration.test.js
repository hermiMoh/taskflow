const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/database');

describe('Task API integration tests', () => {

    beforeEach(async () => {
        await pool.query('DELETE FROM tasks');
    });

    afterAll(async () => {
        await pool.query('DELETE FROM tasks');
        await pool.end();
    });


    test('creates, reads, updates and deletes a task', async () => {

        // CREATE
        const createResponse = await request(app)
            .post('/api/tasks')
            .send({
                title: 'Deploy TaskFlow',
                description: 'Deploy TaskFlow using Kubernetes',
                status: 'todo',
                priority: 'high',
                dueDate: '2026-10-15',
            });

        expect(createResponse.statusCode).toBe(201);

        expect(createResponse.body.title).toBe(
            'Deploy TaskFlow'
        );

        const taskId = createResponse.body.id;


        // READ
        const getResponse = await request(app)
            .get(`/api/tasks/${taskId}`);

        expect(getResponse.statusCode).toBe(200);

        expect(getResponse.body.id).toBe(taskId);

        expect(getResponse.body.status).toBe('todo');


        // UPDATE
        const updateResponse = await request(app)
            .put(`/api/tasks/${taskId}`)
            .send({
                title: 'Deploy TaskFlow',
                description: 'Deploy TaskFlow using Kubernetes',
                status: 'in_progress',
                priority: 'high',
                dueDate: '2026-10-15',
            });

        expect(updateResponse.statusCode).toBe(200);

        expect(updateResponse.body.status).toBe(
            'in_progress'
        );


        // DELETE
        const deleteResponse = await request(app)
            .delete(`/api/tasks/${taskId}`);

        expect(deleteResponse.statusCode).toBe(204);


        // VERIFY DELETION
        const getDeletedResponse = await request(app)
            .get(`/api/tasks/${taskId}`);

        expect(getDeletedResponse.statusCode).toBe(404);
    });
});