/**
 * Manual Database Migration Script
 * Adds the zimra_environment column to the companies table
 * 
 * Run with: npx tsx scripts/add-zimra-environment.ts
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

        // Check if column already exists
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name = 'zimra_environment';
    `;

        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✅ Column zimra_environment already exists');
            await pool.end();
            return;
        }

        console.log('📝 Adding zimra_environment column to companies table...');

        // Add the column
        const addColumnQuery = `
      ALTER TABLE companies 
      ADD COLUMN zimra_environment TEXT DEFAULT 'test';
    `;

        await pool.query(addColumnQuery);
        console.log('✅ Column added successfully');

        // Update existing rows
        console.log('📝 Updating existing companies to use test environment...');
        const updateQuery = `
      UPDATE companies 
      SET zimra_environment = 'test' 
      WHERE zimra_environment IS NULL;
    `;

        const updateResult = await pool.query(updateQuery);
        console.log(`✅ Updated ${updateResult.rowCount} companies`);

        // Verify the column
        console.log('🔍 Verifying column...');
        const verifyQuery = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name = 'zimra_environment';
    `;

        const verifyResult = await pool.query(verifyQuery);

        if (verifyResult.rows.length > 0) {
            console.log('✅ Verification successful:');
            console.log('   Column:', verifyResult.rows[0].column_name);
            console.log('   Type:', verifyResult.rows[0].data_type);
            console.log('   Default:', verifyResult.rows[0].column_default);
        }

        // Show current companies
        console.log('\n📊 Current companies:');
        const companiesQuery = `
      SELECT id, name, zimra_environment 
      FROM companies 
      LIMIT 5;
    `;

        const companiesResult = await pool.query(companiesQuery);
        console.table(companiesResult.rows);

        console.log('\n✅ Migration completed successfully!');
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
