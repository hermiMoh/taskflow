const pool = require('../config/database');

// GET /api/tasks
async function getTasks(req, res) {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks ORDER BY created_at DESC'
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error retrieving tasks:', error.message);

        res.status(500).json({
            message: 'Unable to retrieve tasks',
        });
    }
}


// GET /api/tasks/:id
async function getTaskById(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Task not found',
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error retrieving task:', error.message);

        res.status(500).json({
            message: 'Unable to retrieve task',
        });
    }
}


// POST /api/tasks
async function createTask(req, res) {
    try {
        const {
            title,
            description,
            status = 'todo',
            priority = 'medium',
            dueDate,
        } = req.body;


        const result = await pool.query(
            `INSERT INTO tasks
                (title, description, status, priority, due_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                title,
                description || null,
                status,
                priority,
                dueDate || null,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error.message);

        res.status(500).json({
            message: 'Unable to create task',
        });
    }
}


// PUT /api/tasks/:id
async function updateTask(req, res) {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            status,
            priority,
            dueDate,
        } = req.body;

        const result = await pool.query(
            `UPDATE tasks
             SET
                title = $1,
                description = $2,
                status = $3,
                priority = $4,
                due_date = $5,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                title,
                description || null,
                status || 'todo',
                priority || 'medium',
                dueDate || null,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Task not found',
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error.message);

        res.status(500).json({
            message: 'Unable to update task',
        });
    }
}


// DELETE /api/tasks/:id
async function deleteTask(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Task not found',
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error.message);

        res.status(500).json({
            message: 'Unable to delete task',
        });
    }
}


module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
};