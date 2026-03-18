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
        const compRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'api_key_created_at'");
        const subRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_method'");

        console.log('companies.api_key_created_at:', compRes.rows.length > 0 ? 'FOUND' : 'MISSING');
        console.log('subscriptions.payment_method:', subRes.rows.length > 0 ? 'FOUND' : 'MISSING');

        if (compRes.rows.length === 0 || subRes.rows.length === 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

check();
