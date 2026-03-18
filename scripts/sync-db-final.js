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
        console.log('🔄 Starting Robust Database Schema Sync...');

        // 1. Companies Table
        console.log('\n--- Checking companies table in public schema ---');
        await pool.query(`ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP;`);
        console.log('✅ companies.api_key_created_at check/add done.');

        // 2. Subscriptions Table
        console.log('\n--- Checking subscriptions table in public schema ---');
        await pool.query(`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paynow';`);
        await pool.query(`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS device_mac_address TEXT;`);
        console.log('✅ subscriptions columns check/add done.');

        console.log('\n✨ Database sync completed successfully!');

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
