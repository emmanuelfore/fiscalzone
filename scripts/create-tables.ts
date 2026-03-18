
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function createMissingTables() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Creating missing tables...\n');

        const sql = `
            CREATE TABLE IF NOT EXISTS quotations (
              id SERIAL PRIMARY KEY,
              company_id INTEGER NOT NULL REFERENCES companies(id),
              customer_id INTEGER NOT NULL REFERENCES customers(id),
              quotation_number TEXT NOT NULL,
              issue_date TIMESTAMP DEFAULT NOW(),
              expiry_date TIMESTAMP,
              subtotal DECIMAL(10, 2) NOT NULL,
              tax_amount DECIMAL(10, 2) NOT NULL,
              total DECIMAL(10, 2) NOT NULL,
              status TEXT DEFAULT 'draft',
              tax_inclusive BOOLEAN DEFAULT FALSE,
              currency TEXT DEFAULT 'USD',
              notes TEXT,
              invoice_template TEXT DEFAULT 'modern',
              created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS quotation_items (
              id SERIAL PRIMARY KEY,
              quotation_id INTEGER NOT NULL REFERENCES quotations(id),
              product_id INTEGER REFERENCES products(id),
              description TEXT NOT NULL,
              quantity DECIMAL(10, 2) NOT NULL,
              unit_price DECIMAL(10, 2) NOT NULL,
              tax_rate DECIMAL(5, 2) NOT NULL,
              line_total DECIMAL(10, 2) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS recurring_invoices (
              id SERIAL PRIMARY KEY,
              company_id INTEGER NOT NULL REFERENCES companies(id),
              customer_id INTEGER NOT NULL REFERENCES customers(id),
              description TEXT,
              currency TEXT NOT NULL DEFAULT 'USD',
              tax_inclusive BOOLEAN DEFAULT FALSE,
              items JSONB NOT NULL,
              frequency TEXT NOT NULL,
              start_date TIMESTAMP NOT NULL DEFAULT NOW(),
              end_date TIMESTAMP,
              next_run_date TIMESTAMP NOT NULL,
              last_run_date TIMESTAMP,
              status TEXT DEFAULT 'active',
              auto_send BOOLEAN DEFAULT FALSE,
              auto_fiscalize BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS zimra_logs (
              id SERIAL PRIMARY KEY,
              invoice_id INTEGER NOT NULL REFERENCES invoices(id),
              request_payload JSONB NOT NULL,
              response_payload JSONB NOT NULL,
              status_code INTEGER,
              error_message TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `;

        await pool.query(sql);
        console.log('✅ Tables created or already existed.');

    } catch (error: any) {
        console.error('❌ Error creating tables:', error.message);
    } finally {
        await pool.end();
    }
}

createMissingTables();
