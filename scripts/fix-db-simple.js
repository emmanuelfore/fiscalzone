import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function runMigration() {
    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL or SUPABASE_DB_URL not found');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 FORCE ADDING api_key_created_at column to companies table...');

        // Let's try to query the columns first to see what's actually there
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('--- COLUMNS START ---');
        columns.forEach(col => console.log('COL: ' + col));
        console.log('--- COLUMNS END ---');

        if (!columns.includes('api_key_created_at')) {
            console.log('Column is missing. Adding it...');
            await pool.query('ALTER TABLE companies ADD COLUMN api_key_created_at TIMESTAMP;');
            console.log('✅ Column added successfully.');
        } else {
            console.log('✅ Column already exists.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
