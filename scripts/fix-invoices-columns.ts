/**
 * Add missing fiscal_day_no column to invoices table
 * Run with: npx tsx scripts/fix-invoices-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
}

async function fixInvoicesTable() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Fixing invoices table...\n');

        // Check existing columns
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices';
    `;

        const existing = await pool.query(checkQuery);
        const existingColumns = new Set(existing.rows.map(r => r.column_name));

        console.log('📋 Existing columns in invoices table:');
        console.log(Array.from(existingColumns).join(', '));
        console.log('');

        // Add fiscal_day_no if missing
        if (!existingColumns.has('fiscal_day_no')) {
            console.log('➕ Adding fiscal_day_no column...');
            await pool.query(`
        ALTER TABLE invoices 
        ADD COLUMN fiscal_day_no INTEGER;
      `);
            console.log('✅ Added fiscal_day_no column');
        } else {
            console.log('⏭️  fiscal_day_no already exists');
        }

        // Verify
        console.log('\n🔍 Verifying...');
        const verify = await pool.query(checkQuery);
        const finalColumns = new Set(verify.rows.map(r => r.column_name));

        if (finalColumns.has('fiscal_day_no')) {
            console.log('✅ fiscal_day_no column is present!');
        } else {
            console.log('❌ fiscal_day_no column still missing!');
        }

        console.log('\n✅ Migration completed!');
        console.log('🔄 Server should auto-reload');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixInvoicesTable();
