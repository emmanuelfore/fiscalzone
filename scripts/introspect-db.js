import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function introspect() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- INTROSPECTION START ---');

        const tables = ['companies', 'subscriptions'];
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY column_name;
            `);
            console.table(res.rows);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

introspect();
