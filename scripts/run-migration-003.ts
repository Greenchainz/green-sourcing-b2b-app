
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // Fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('🔌 Connecting to Azure SQL database...');

    const config: sql.config = {
        user: process.env['AZURE_SQL_USER'],
        password: process.env['AZURE_SQL_PASSWORD'],
        server: process.env['AZURE_SQL_SERVER'] || '',
        database: process.env['AZURE_SQL_DATABASE'],
        options: {
            encrypt: true,
            trustServerCertificate: false,
        },
    };

    if (!config.server || !config.user || !config.password) {
        console.error('❌ Azure SQL connection variables are not defined in .env or .env.local');
        console.error('   Required: AZURE_SQL_USER, AZURE_SQL_PASSWORD, AZURE_SQL_SERVER, AZURE_SQL_DATABASE');
        process.exit(1);
    }

    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to Azure SQL');

        const migrationPath = path.join(__dirname, '../backend/migrations/003_supplier_dashboard.sql');
        console.log(`📖 Reading migration file: ${migrationPath}`);

        const sqlScript = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Executing migration...');
        await pool.request().batch(sqlScript);

        console.log('✅ Migration 003_supplier_dashboard.sql applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

runMigration();

