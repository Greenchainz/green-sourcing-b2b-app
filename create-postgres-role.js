// Adjust module search path to find backend node_modules
const path = require('path');
const backendPath = path.join(__dirname, 'backend', 'node_modules');
module.paths.unshift(backendPath);

const { DefaultAzureCredential } = require('@azure/identity');
const { Pool } = require('pg');

async function createPostgresRole() {
    try {
        // Get Entra token
        const credential = new DefaultAzureCredential();
        const token = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');

        // Create pool with Entra auth
        const pool = new Pool({
            host: 'greenchainz-db-prod.postgres.database.azure.com',
            port: 5432,
            database: 'postgres',
            user: 'founder1@greenchainz.com',
            password: token.token,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Run SQL commands
        const client = await pool.connect();
        try {
            // Create the azure_ad_user role if it doesn't exist
            console.log('Ensuring azure_ad_user role exists...');
            try {
                await client.query(`CREATE ROLE "azure_ad_user"`);
                console.log('  Created azure_ad_user role');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('  azure_ad_user role already exists');
                } else {
                    throw e;
                }
            }

            console.log('Creating role for managed identity...');
            try {
                await client.query(
                    `CREATE ROLE "greenchainz-container" WITH LOGIN PASSWORD 'token' IN ROLE azure_ad_user`
                );
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('  Role greenchainz-container already exists');
                } else {
                    throw e;
                }
            }

            console.log('Granting database privileges...');
            await client.query(
                `GRANT ALL PRIVILEGES ON DATABASE postgres TO "greenchainz-container"`
            );

            console.log('✅ PostgreSQL role created/configured successfully!');
        } finally {
            client.release();
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating role:', error.message);
        process.exit(1);
    }
}

createPostgresRole();
