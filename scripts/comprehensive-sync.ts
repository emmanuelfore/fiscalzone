
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
}

const logFile = 'sync_log.txt';
const logStream = fs.createWriteStream(logFile, { flags: 'w', encoding: 'utf8' });

function log(message: string) {
    console.log(message);
    logStream.write(message + '\n');
}

async function syncSchema() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        log('🔍 Starting comprehensive schema synchronization...\n');

        const dbSchemaQuery = `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, column_name;
        `;
        const dbResult = await pool.query(dbSchemaQuery);

        const dbTables: Record<string, Set<string>> = {};
        dbResult.rows.forEach(row => {
            if (!dbTables[row.table_name]) {
                dbTables[row.table_name] = new Set();
            }
            dbTables[row.table_name].add(row.column_name);
        });

        const expectedSchema: Record<string, { name: string, sql: string }[]> = {
            companies: [
                { name: 'invoice_template', sql: "ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern';" },
                { name: 'branch_name', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS branch_name TEXT;' },
                { name: 'vat_registered', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT TRUE;' },
                { name: 'email_settings', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_settings JSONB;' },
                { name: 'bank_name', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name TEXT;' },
                { name: 'account_number', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_number TEXT;' },
                { name: 'account_name', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_name TEXT;' },
                { name: 'branch_code', sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS branch_code TEXT;' }
            ],
            invoices: [
                { name: 'tax_inclusive', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE;' },
                { name: 'locked_by', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS locked_by UUID;' },
                { name: 'locked_at', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;' },
                { name: 'exchange_rate', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6) DEFAULT 1.000000;' },
                { name: 'transaction_type', sql: "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'FiscalInvoice';" },
                { name: 'related_invoice_id', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS related_invoice_id INTEGER;' },
                { name: 'notes', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;' },
                { name: 'invoice_template', sql: "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern';" }
            ],
            customers: [
                { name: 'is_active', sql: 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;' },
                { name: 'currency', sql: "ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';" }
            ],
            products: [
                { name: 'product_type', sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'good' NOT NULL;" },
                { name: 'tax_category_id', sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_category_id INTEGER;' }
            ],
            quotations: [
                { name: 'tax_inclusive', sql: 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE;' },
                { name: 'currency', sql: "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';" },
                { name: 'notes', sql: 'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;' },
                { name: 'invoice_template', sql: "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern';" }
            ],
            recurring_invoices: [
                { name: 'auto_send', sql: 'ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS auto_send BOOLEAN DEFAULT FALSE;' },
                { name: 'auto_fiscalize', sql: 'ALTER TABLE recurring_invoices ADD COLUMN IF NOT EXISTS auto_fiscalize BOOLEAN DEFAULT FALSE;' }
            ]
        };

        let totalAdded = 0;

        for (const [table, columns] of Object.entries(expectedSchema)) {
            log(`\nChecking table: ${table}`);

            if (!dbTables[table]) {
                log(`⚠️ Table ${table} does not exist in DB.`);
                continue;
            }

            for (const col of columns) {
                if (!dbTables[table].has(col.name)) {
                    log(`➕ Adding missing column: ${table}.${col.name}`);
                    try {
                        await pool.query(col.sql);
                        log(`✅ Success`);
                        totalAdded++;
                    } catch (err: any) {
                        log(`❌ Failed to add ${table}.${col.name}: ${err.message}`);
                    }
                } else {
                    log(`⏭️  ${col.name} already exists`);
                }
            }
        }

        log(`\n✨ Schema sync completed. Total columns added: ${totalAdded}`);

    } catch (error: any) {
        log('\n❌ Critical failure during schema sync: ' + error.message);
    } finally {
        await pool.end();
        logStream.end();
    }
}

syncSchema();
