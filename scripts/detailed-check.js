import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function check() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- DETAILED SCHEMA CHECK ---');
        console.log('Connecting to:', DATABASE_URL.split('@')[1]); // Show host for verification

        const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')");
        console.log('Available Schemas:', schemas.rows.map(r => r.schema_name));

        const tables = ['companies', 'subscriptions'];
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const cols = await pool.query(`
                SELECT table_schema, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY table_schema, ordinal_position
            `);
            if (cols.rows.length === 0) {
                console.log('❌ TABLE NOT FOUND IN ANY SCHEMA');
            } else {
                console.table(cols.rows);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

check();
