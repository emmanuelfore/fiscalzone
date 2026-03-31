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
    // Tables
    `CREATE TABLE IF NOT EXISTS product_variations (
        id SERIAL PRIMARY KEY,
        product_id integer REFERENCES products(id) NOT NULL,
        name text NOT NULL,
        sku text,
        barcode text,
        price numeric(10, 2) NOT NULL,
        stock_level numeric(10, 2) DEFAULT '0',
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS product_batches (
        id SERIAL PRIMARY KEY,
        product_id integer REFERENCES products(id) NOT NULL,
        variation_id integer REFERENCES product_variations(id),
        batch_number text NOT NULL,
        expiry_date date NOT NULL,
        stock_level numeric(10, 2) DEFAULT '0',
        cost_price numeric(10, 2),
        is_expired boolean DEFAULT false,
        created_at timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_sections (
        id SERIAL PRIMARY KEY,
        company_id integer REFERENCES companies(id) NOT NULL,
        name text NOT NULL,
        last_updated timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_tables (
        id SERIAL PRIMARY KEY,
        section_id integer REFERENCES restaurant_sections(id) NOT NULL,
        table_number text NOT NULL,
        capacity integer DEFAULT 2,
        status text DEFAULT 'free',
        pos_x integer DEFAULT 0,
        pos_y integer DEFAULT 0,
        width integer DEFAULT 60,
        height integer DEFAULT 60,
        shape text DEFAULT 'square',
        current_invoice_id integer REFERENCES invoices(id)
    )`,
    `CREATE TABLE IF NOT EXISTS recipe_items (
        id SERIAL PRIMARY KEY,
        parent_product_id integer REFERENCES products(id) NOT NULL,
        ingredient_product_id integer REFERENCES products(id) NOT NULL,
        quantity numeric(10, 4) NOT NULL,
        unit text NOT NULL
    )`,

    // Invoices
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shift_id integer REFERENCES pos_shifts(id)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_pos boolean DEFAULT false`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT '0.00'`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS split_payments jsonb`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS table_id integer`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES users(id)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS covers integer DEFAULT 1`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dining_option text DEFAULT 'dine_in'`,
    
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
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS restaurant_settings jsonb`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS pharmacy_settings jsonb`,
    
    // Products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type_id integer REFERENCES tax_types(id)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_ingredient boolean DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS has_recipe boolean DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_prescription_only boolean DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_tracking_enabled boolean DEFAULT false`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_name text`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS generic_name text`,
    
    // Users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false`,

    // Invoice Items
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_type_id integer REFERENCES tax_types(id)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cogs_amount numeric(10, 2)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT '0.00'`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS modifiers jsonb`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS batch_id integer`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS variation_id integer`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS expiry_date date`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS batch_number text`,
    
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
