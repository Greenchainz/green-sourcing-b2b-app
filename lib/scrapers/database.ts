import { Pool } from 'pg';

// Simple shared PostgreSQL pool using DATABASE_URL
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function createScraperJob(
  jobType: 'supplier_discovery' | 'epd_refresh'
): Promise<string> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `INSERT INTO scraper_jobs (job_type, status)
       VALUES ($1, 'running')
       RETURNING id`,
      [jobType]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function completeScraperJob(
  jobId: string,
  stats: {
    recordsFound: number;
    recordsProcessed: number;
    recordsFailed?: number;
  }
): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `UPDATE scraper_jobs
       SET status = 'completed',
           completed_at = NOW(),
           records_found = $1,
           records_processed = $2,
           records_failed = $3
       WHERE id = $4`,
      [stats.recordsFound, stats.recordsProcessed, stats.recordsFailed ?? 0, jobId]
    );
  } finally {
    client.release();
  }
}

export async function failScraperJob(jobId: string, error: string): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `UPDATE scraper_jobs
       SET status = 'failed',
           completed_at = NOW(),
           error_log = $1
       WHERE id = $2`,
      [error, jobId]
    );
  } finally {
    client.release();
  }
}
