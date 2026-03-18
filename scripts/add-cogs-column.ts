import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(`
      ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cogs_amount DECIMAL(10,2);
      ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS cogs_amount DECIMAL(10,2);
    `);
        console.log('✅ Migration done: cogs_amount added to invoice_items and quotation_items');
    } catch (e: any) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
