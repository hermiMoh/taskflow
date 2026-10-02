const express = require('express');

const {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
} = require('../controllers/taskController');

const {
    validateTask,
} = require('../middleware/taskValidation');

const router = express.Router();

router.get('/', getTasks);
router.get('/:id', getTaskById);

router.post('/', validateTask, createTask);

router.put('/:id', validateTask, updateTask);

router.delete('/:id', deleteTask);

module.exports = router;