/**
 * Verify all required columns exist in the companies table
 * Run with: npx tsx scripts/verify-columns.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function verifyColumns() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Verifying database columns...\n');

        const query = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `;

        const result = await pool.query(query);

        console.log('📋 All columns in companies table:');
        console.table(result.rows);

        const requiredColumns = [
            'fdms_device_id',
            'fdms_api_key',
            'zimra_private_key',
            'zimra_certificate',
            'zimra_environment',
            'fiscal_day_open',
            'current_fiscal_day_no',
            'last_fiscal_day_status',
            'last_receipt_global_no',
            'device_reporting_frequency',
            'last_ping',
            'last_fiscal_hash',
            'daily_receipt_count',
            'bank_name',
            'account_number',
            'account_name',
            'branch_code'
        ];

        const existingColumns = new Set(result.rows.map(r => r.column_name));
        const missing = requiredColumns.filter(col => !existingColumns.has(col));

        console.log('\n✅ Verification Results:');
        console.log(`   Total columns: ${result.rows.length}`);
        console.log(`   Required ZIMRA columns: ${requiredColumns.length}`);
        console.log(`   Missing columns: ${missing.length}`);

        if (missing.length === 0) {
            console.log('\n🎉 All required columns are present!');
        } else {
            console.log('\n⚠️  Missing columns:', missing.join(', '));
        }

    } catch (error: any) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyColumns();
