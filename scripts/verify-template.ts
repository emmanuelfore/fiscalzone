
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
        console.log('Testing access to invoices.invoice_template...');
        const res = await pool.query('SELECT invoice_template FROM invoices LIMIT 1');
        console.log('✅ Success! Found:', res.rows.length, 'rows');

        console.log('\nChecking for missing tables...');
        const tables = ['quotations', 'recurring_invoices', 'zimra_logs'];
        for (const table of tables) {
            const check = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`);
            console.log(`Table ${table} exists:`, check.rows[0].exists);
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verify();
