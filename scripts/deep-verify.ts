
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function verify() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT vat_registered FROM companies LIMIT 1');
        console.log('✅ Success! vat_registered is accessible:', res.rows[0]);
    } catch (error: any) {
        console.error('❌ Error accessing vat_registered:', error.message);
    } finally {
        await pool.end();
    }
}

verify();
