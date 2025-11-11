const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Choose a sensible default host based on runtime: use env if provided, otherwise localhost.
// If you later containerize the backend with docker-compose, set POSTGRES_HOST=db.
const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'user',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'greenchainz_dev',
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE || 30000)
};

const pool = new Pool(config);

pool.on('error', (err) => {
    console.error('Unexpected PG client error', err);
});

module.exports = { pool };
