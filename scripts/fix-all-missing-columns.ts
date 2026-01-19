/**
 * Comprehensive Database Migration Script
 * Adds all missing columns to the companies table
 * 
 * Run with: npx tsx scripts/fix-all-missing-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
    process.exit(1);
}

async function runMigration() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔄 Connecting to database...');

        // Get all existing columns
        const existingColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies';
    `;

        const existingResult = await pool.query(existingColumnsQuery);
        const existingColumns = new Set(existingResult.rows.map(r => r.column_name));

        console.log('📋 Existing columns:', Array.from(existingColumns).join(', '));
        console.log('');

        // Define all required columns with their SQL definitions
        const requiredColumns = [
            { name: 'fdms_device_id', sql: 'ALTER TABLE companies ADD COLUMN fdms_device_id TEXT;' },
            { name: 'fdms_api_key', sql: 'ALTER TABLE companies ADD COLUMN fdms_api_key TEXT;' },
            { name: 'zimra_private_key', sql: 'ALTER TABLE companies ADD COLUMN zimra_private_key TEXT;' },
            { name: 'zimra_certificate', sql: 'ALTER TABLE companies ADD COLUMN zimra_certificate TEXT;' },
            { name: 'zimra_environment', sql: "ALTER TABLE companies ADD COLUMN zimra_environment TEXT DEFAULT 'test';" },
            { name: 'fiscal_day_open', sql: 'ALTER TABLE companies ADD COLUMN fiscal_day_open BOOLEAN DEFAULT false;' },
            { name: 'current_fiscal_day_no', sql: 'ALTER TABLE companies ADD COLUMN current_fiscal_day_no INTEGER DEFAULT 0;' },
            { name: 'last_fiscal_day_status', sql: 'ALTER TABLE companies ADD COLUMN last_fiscal_day_status TEXT;' },
            { name: 'last_receipt_global_no', sql: 'ALTER TABLE companies ADD COLUMN last_receipt_global_no INTEGER DEFAULT 0;' },
            { name: 'device_reporting_frequency', sql: 'ALTER TABLE companies ADD COLUMN device_reporting_frequency INTEGER DEFAULT 1440;' },
            { name: 'last_ping', sql: 'ALTER TABLE companies ADD COLUMN last_ping TIMESTAMP;' },
            { name: 'last_fiscal_hash', sql: 'ALTER TABLE companies ADD COLUMN last_fiscal_hash TEXT;' },
            { name: 'daily_receipt_count', sql: 'ALTER TABLE companies ADD COLUMN daily_receipt_count INTEGER DEFAULT 0;' },
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
        const verifyResult = await pool.query(existingColumnsQuery);
        const finalColumns = new Set(verifyResult.rows.map(r => r.column_name));

        const missingColumns = requiredColumns.filter(col => !finalColumns.has(col.name));

        if (missingColumns.length === 0) {
            console.log('✅ All required columns are present!');
        } else {
            console.log('⚠️  Still missing columns:', missingColumns.map(c => c.name).join(', '));
        }

        // Show current companies
        console.log('');
        console.log('📊 Current companies:');
        const companiesQuery = `
      SELECT id, name, zimra_environment, fiscal_day_open, current_fiscal_day_no 
      FROM companies 
      LIMIT 5;
    `;

        const companiesResult = await pool.query(companiesQuery);
        console.table(companiesResult.rows);

        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('🔄 Please restart your server for changes to take effect.');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        console.error('Details:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
runMigration();
