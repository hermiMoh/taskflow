const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const taskRoutes = require('./routes/taskRoutes');

const app = express();

const {
    notFoundHandler,
    errorHandler,
} = require('./middleware/errorHandler');

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: 'taskflow-api',
        version: '0.1.0',
    });
});

app.use('/api/tasks', taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;