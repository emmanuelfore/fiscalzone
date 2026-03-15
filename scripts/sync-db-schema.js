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
        console.log('🔄 Starting Comprehensive Database Sync...');

        // 1. Check Companies Table
        console.log('\n--- Checking Table: companies ---');
        const compRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies';
        `);
        const compCols = compRes.rows.map(r => r.column_name);

        const missingCompCols = [
            { name: 'api_key_created_at', sql: 'ALTER TABLE companies ADD COLUMN api_key_created_at TIMESTAMP;' }
        ];

        for (const col of missingCompCols) {
            if (!compCols.includes(col.name)) {
                console.log(`➕ Adding missing column: companies.${col.name}`);
                await pool.query(col.sql);
            } else {
                console.log(`✅ Column exists: companies.${col.name}`);
            }
        }

        // 2. Check Subscriptions Table
        console.log('\n--- Checking Table: subscriptions ---');
        const subRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'subscriptions';
        `);
        const subCols = subRes.rows.map(r => r.column_name);

        const missingSubCols = [
            { name: 'payment_method', sql: "ALTER TABLE subscriptions ADD COLUMN payment_method TEXT DEFAULT 'paynow';" },
            { name: 'device_mac_address', sql: "ALTER TABLE subscriptions ADD COLUMN device_mac_address TEXT;" } // Checking this too as it was in schema
        ];

        for (const col of missingSubCols) {
            if (!subCols.includes(col.name)) {
                console.log(`➕ Adding missing column: subscriptions.${col.name}`);
                await pool.query(col.sql);
            } else {
                console.log(`✅ Column exists: subscriptions.${col.name}`);
            }
        }

        console.log('\n✨ Database sync completed successfully!');

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
