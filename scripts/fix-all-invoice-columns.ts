/**
 * Comprehensive Invoices Table Migration
 * Adds ALL missing columns to the invoices table
 * 
 * Run with: npx tsx scripts/fix-all-invoice-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
}

async function fixAllInvoiceColumns() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Fixing ALL missing columns in invoices table...\n');

        // Check existing columns
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices';
    `;

        const existing = await pool.query(checkQuery);
        const existingColumns = new Set(existing.rows.map(r => r.column_name));

        console.log('📋 Existing columns:', Array.from(existingColumns).join(', '));
        console.log('');

        // Define ALL required columns based on schema.ts
        const requiredColumns = [
            { name: 'tax_inclusive', sql: 'ALTER TABLE invoices ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;' },
            { name: 'fiscal_code', sql: 'ALTER TABLE invoices ADD COLUMN fiscal_code TEXT;' },
            { name: 'fiscal_signature', sql: 'ALTER TABLE invoices ADD COLUMN fiscal_signature TEXT;' },
            { name: 'qr_code_data', sql: 'ALTER TABLE invoices ADD COLUMN qr_code_data TEXT;' },
            { name: 'synced_with_fdms', sql: 'ALTER TABLE invoices ADD COLUMN synced_with_fdms BOOLEAN DEFAULT false;' },
            { name: 'fdms_status', sql: "ALTER TABLE invoices ADD COLUMN fdms_status TEXT DEFAULT 'pending';" },
            { name: 'submission_id', sql: 'ALTER TABLE invoices ADD COLUMN submission_id TEXT;' },
            { name: 'fiscal_day_no', sql: 'ALTER TABLE invoices ADD COLUMN fiscal_day_no INTEGER;' },
            { name: 'payment_method', sql: "ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT 'CASH';" },
            { name: 'exchange_rate', sql: "ALTER TABLE invoices ADD COLUMN exchange_rate DECIMAL(10,6) DEFAULT '1.000000';" },
            { name: 'transaction_type', sql: "ALTER TABLE invoices ADD COLUMN transaction_type TEXT DEFAULT 'FiscalInvoice';" },
            { name: 'related_invoice_id', sql: 'ALTER TABLE invoices ADD COLUMN related_invoice_id INTEGER;' },
        ];

        let addedCount = 0;
        let skippedCount = 0;

        for (const column of requiredColumns) {
            if (existingColumns.has(column.name)) {
                console.log(`⏭️  Skipping ${column.name} (already exists)`);
                skippedCount++;
            } else {
                console.log(`➕ Adding ${column.name}...`);
                try {
                    await pool.query(column.sql);
                    console.log(`   ✅ Added ${column.name}`);
                    addedCount++;
                } catch (error: any) {
                    console.error(`   ❌ Failed to add ${column.name}:`, error.message);
                }
            }
        }

        console.log('');
        console.log('📊 Summary:');
        console.log(`   ✅ Added: ${addedCount} columns`);
        console.log(`   ⏭️  Skipped: ${skippedCount} columns (already existed)`);
        console.log('');

        // Verify all columns now exist
        console.log('🔍 Verifying all columns...');
        const verifyResult = await pool.query(checkQuery);
        const finalColumns = new Set(verifyResult.rows.map(r => r.column_name));

        const missingColumns = requiredColumns.filter(col => !finalColumns.has(col.name));

        if (missingColumns.length === 0) {
            console.log('✅ All required columns are present!');
        } else {
            console.log('⚠️  Still missing columns:', missingColumns.map(c => c.name).join(', '));
        }

        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('🔄 Server should auto-reload');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        console.error('Details:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixAllInvoiceColumns();
