import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

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
        console.log('🔄 Adding api_key_created_at column to companies table...');

        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP;');

        console.log('✅ Column added successfully or already exists.');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
