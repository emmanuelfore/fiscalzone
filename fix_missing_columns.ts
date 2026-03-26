import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  console.log('Adding missing columns...');
  
  const queries = [
    // Invoices
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shift_id integer REFERENCES pos_shifts(id)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_pos boolean DEFAULT false`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT '0.00'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS split_payments jsonb`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)`,
    
    // Companies
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key text UNIQUE`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key_created_at timestamp`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_day_opened_at timestamp`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS pos_settings jsonb`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_receipt_at timestamp`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS inventory_valuation_method text DEFAULT 'FIFO'`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end_date timestamp`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive'`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registered_mac_address text`,
    
    // Products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type_id integer REFERENCES tax_types(id)`,
    
    // Users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false`,

    // Invoice Items
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_type_id integer REFERENCES tax_types(id)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cogs_amount numeric(10, 2)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT '0.00'`,
    
    // Tax categories and types
    `ALTER TABLE tax_categories ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id)`,
    `ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id)`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('SUCCESS:', q.substring(0, 50) + '...');
    } catch (err) {
      console.error('FAILED:', q.substring(0, 50) + '...', err.message);
    }
  }

  await client.end();
  console.log('Done.');
}

fix();
