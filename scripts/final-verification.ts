/**
 * Final verification of all database columns
 * Run with: npx tsx scripts/final-verification.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function finalVerification() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 FINAL DATABASE VERIFICATION\n');
        console.log('='.repeat(60));

        // Check Companies table
        console.log('\n📋 COMPANIES TABLE');
        console.log('-'.repeat(60));
        const companiesQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `;
        const companiesResult = await pool.query(companiesQuery);
        console.log(`Total columns: ${companiesResult.rows.length}`);

        const requiredCompaniesColumns = [
            'fdms_device_id', 'fdms_api_key', 'zimra_private_key', 'zimra_certificate',
            'zimra_environment', 'fiscal_day_open', 'current_fiscal_day_no',
            'last_fiscal_day_status', 'last_receipt_global_no', 'device_reporting_frequency',
            'last_ping', 'last_fiscal_hash', 'daily_receipt_count'
        ];

        const companiesColumns = new Set(companiesResult.rows.map(r => r.column_name));
        const missingCompanies = requiredCompaniesColumns.filter(col => !companiesColumns.has(col));

        if (missingCompanies.length === 0) {
            console.log('✅ All required ZIMRA columns present');
        } else {
            console.log('❌ Missing columns:', missingCompanies.join(', '));
        }

        // Check Invoices table
        console.log('\n📋 INVOICES TABLE');
        console.log('-'.repeat(60));
        const invoicesQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position;
    `;
        const invoicesResult = await pool.query(invoicesQuery);
        console.log(`Total columns: ${invoicesResult.rows.length}`);

        const requiredInvoicesColumns = [
            'tax_inclusive', 'fiscal_code', 'fiscal_signature', 'qr_code_data',
            'synced_with_fdms', 'fdms_status', 'submission_id', 'fiscal_day_no',
            'payment_method', 'exchange_rate', 'transaction_type', 'related_invoice_id'
        ];

        const invoicesColumns = new Set(invoicesResult.rows.map(r => r.column_name));
        const missingInvoices = requiredInvoicesColumns.filter(col => !invoicesColumns.has(col));

        if (missingInvoices.length === 0) {
            console.log('✅ All required ZIMRA columns present');
        } else {
            console.log('❌ Missing columns:', missingInvoices.join(', '));
        }

        // Overall status
        console.log('\n' + '='.repeat(60));
        console.log('📊 OVERALL STATUS');
        console.log('='.repeat(60));

        if (missingCompanies.length === 0 && missingInvoices.length === 0) {
            console.log('✅ ALL REQUIRED COLUMNS ARE PRESENT!');
            console.log('🎉 Database is ready for ZIMRA integration!');
            console.log('\n📝 Next steps:');
            console.log('   1. Restart your server if not auto-reloaded');
            console.log('   2. Test the application');
            console.log('   3. Verify no database errors');
        } else {
            console.log('⚠️  Some columns are still missing');
            console.log('   Companies missing:', missingCompanies.length);
            console.log('   Invoices missing:', missingInvoices.length);
        }

        console.log('');

    } catch (error: any) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

finalVerification();
