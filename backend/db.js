const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Choose a sensible default host based on runtime: use env if provided, otherwise localhost.
// If you later containerize the backend with docker-compose, set POSTGRES_HOST=db.
const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'user',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'greenchainz_dev',
    // Optimized pool settings for better performance
    max: Number(process.env.PGPOOL_MAX || 20), // Increased from 10 to handle more concurrent requests
    min: Number(process.env.PGPOOL_MIN || 2), // Maintain minimum connections for faster response
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE || 30000),
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT || 5000), // Timeout for acquiring connection
    // Statement timeout to prevent long-running queries from blocking
    statement_timeout: Number(process.env.PGPOOL_STATEMENT_TIMEOUT || 30000),
    // SSL configuration for production (Azure, Supabase, etc.)
    ssl: process.env.POSTGRES_SSL === 'true' || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
};

const pool = new Pool(config);

pool.on('error', (err) => {
    console.error('Unexpected PG client error', err);
});

// Log pool statistics periodically for monitoring (development only)
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        console.log('Pool stats:', {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
        });
    }, 60000); // Log every minute
}

module.exports = { pool };
