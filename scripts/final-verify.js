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
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('companies', 'subscriptions') 
            AND column_name IN ('api_key_created_at', 'payment_method')
            ORDER BY table_name;
        `);
        console.log('FINAL_VERIFICATION_START');
        res.rows.forEach(r => console.log(`VERIFY: ${r.table_name}.${r.column_name}`));
        console.log('FINAL_VERIFICATION_END');
    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

check();
