import { Pool } from 'pg';

function buildConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Support Azure Service Connector variables if present
  const host = process.env.AZURE_POSTGRESQL_HOST;
  const user = process.env.AZURE_POSTGRESQL_USER;
  const db = process.env.AZURE_POSTGRESQL_DATABASE;
  const port = process.env.AZURE_POSTGRESQL_PORT || '5432';
  const password = process.env.AZURE_POSTGRESQL_PASSWORD || process.env.DB_PASSWORD;
  const sslMode = process.env.AZURE_POSTGRESQL_SSL ? `?sslmode=${process.env.AZURE_POSTGRESQL_SSL}` : '?sslmode=require';

  if (host && user && db) {
    // If no password, this will still try; better than returning undefined.
    return `postgres://${user}:${password || ''}@${host}:${port}/${db}${sslMode}`;
  }

  return undefined;
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: unknown[]) {
  try {
    const res = await pool.query(text, params);
    // Duration calculation for potential monitoring
    // const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
