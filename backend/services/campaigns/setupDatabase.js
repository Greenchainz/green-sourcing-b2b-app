const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres', // Replace with your database username
  host: 'localhost', // Replace with your database host (e.g., localhost or an IP address)
  database: 'green_sourcing', // Replace with your database name
  password: 'postgres', // Replace with your database password
  port: 5432, // Default PostgreSQL port
});

const setupDatabase = async () => {
  const client = await pool.connect();

  try {
    // 1. Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'Buyer',
        entra_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // 2. Create Suppliers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Suppliers" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id),
        company_name VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'Free'
      );
    `);

    // 3. Create Architects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Architects" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id),
        firm_name VARCHAR(255),
        license_number VARCHAR(100)
      );
    `);

    // 4. Insert Admin User
    await client.query(`
      INSERT INTO "Users" (email, full_name, role, created_at)
      VALUES ('your-email@greenchainz.com', 'Admin User', 'Admin', NOW())
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up the database:', error);
  } finally {
    client.release();
  }
};

setupDatabase();