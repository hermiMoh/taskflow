const { body, validationResult } = require('express-validator');

const validateTask = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters'),

    body('status')
        .optional()
        .isIn(['todo', 'in_progress', 'done'])
        .withMessage('Status must be todo, in_progress or done'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Priority must be low, medium or high'),

    body('dueDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('Due date must be a valid date'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        next();
    },
];

module.exports = {
    validateTask,
};