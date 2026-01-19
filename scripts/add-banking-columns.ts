/**
 * Add Banking Columns to Companies Table
 * Run with: npx tsx scripts/add-banking-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
}

async function addBankingColumns() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Adding banking columns to companies table...\n');

        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies';
    `;

        const existing = await pool.query(checkQuery);
        const existingColumns = new Set(existing.rows.map(r => r.column_name));

        const columnsToAdd = [
            { name: 'bank_name', sql: 'ALTER TABLE companies ADD COLUMN bank_name TEXT;' },
            { name: 'account_number', sql: 'ALTER TABLE companies ADD COLUMN account_number TEXT;' },
            { name: 'account_name', sql: 'ALTER TABLE companies ADD COLUMN account_name TEXT;' },
            { name: 'branch_code', sql: 'ALTER TABLE companies ADD COLUMN branch_code TEXT;' }
        ];

        for (const col of columnsToAdd) {
            if (!existingColumns.has(col.name)) {
                console.log(`➕ Adding ${col.name}...`);
                await pool.query(col.sql);
                console.log(`✅ Added ${col.name}`);
            } else {
                console.log(`⏭️  ${col.name} already exists`);
            }
        }

        console.log('\n✅ Migration completed!');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addBankingColumns();
