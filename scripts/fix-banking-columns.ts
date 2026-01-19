/**
 * Fix Missing Banking Columns in Companies Table
 * Run with: npx tsx scripts/fix-banking-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
}

async function fixBankingColumns() {
    console.log('🔗 Connecting to database...');
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Check existing columns
        console.log('🔍 Checking existing columns in companies table...');
        const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies';
    `);

        const existingColumns = new Set(result.rows.map(r => r.column_name));
        console.log(`📊 Found ${existingColumns.size} columns.`);

        const requiredColumns = [
            { name: 'bank_name', sql: 'ALTER TABLE companies ADD COLUMN bank_name TEXT;' },
            { name: 'account_number', sql: 'ALTER TABLE companies ADD COLUMN account_number TEXT;' },
            { name: 'account_name', sql: 'ALTER TABLE companies ADD COLUMN account_name TEXT;' },
            { name: 'branch_code', sql: 'ALTER TABLE companies ADD COLUMN branch_code TEXT;' }
        ];

        let changes = 0;

        for (const col of requiredColumns) {
            if (!existingColumns.has(col.name)) {
                console.log(`➕ Adding missing column: ${col.name}...`);
                await pool.query(col.sql);
                console.log(`✅ ${col.name} added successfully.`);
                changes++;
            } else {
                console.log(`⏭️  ${col.name} already exists.`);
            }
        }

        if (changes > 0) {
            console.log(`\n🎉 Migration successful! Added ${changes} columns.`);
        } else {
            console.log('\n✅ No changes needed. All banking columns exist.');
        }

    } catch (error: any) {
        console.error('\n❌ Error during migration:');
        console.error(error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixBankingColumns();
