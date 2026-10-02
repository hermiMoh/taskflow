require('dotenv').config();

const app = require('./app');
const pool = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query('SELECT 1');

        console.log('PostgreSQL connected successfully.');

        app.listen(PORT, () => {
            console.log(`TaskFlow API running on port ${PORT}.`);
        });
    } catch (error) {
        console.error('Unable to connect to PostgreSQL.');
        console.error(error.message);

        process.exit(1);
    }
}

startServer();