-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own record
CREATE POLICY "Users can view own record"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Companies table policies
-- Users can view companies they belong to
CREATE POLICY "Users can view their companies"
  ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Company owners/admins can update their companies
CREATE POLICY "Company admins can update companies"
  ON companies
  FOR UPDATE
  USING (
    id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Company owners can insert companies
CREATE POLICY "Users can create companies"
  ON companies
  FOR INSERT
  WITH CHECK (true);

-- Company Users table policies
-- Users can view company memberships for their companies
CREATE POLICY "Users can view company memberships"
  ON company_users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Company owners/admins can manage memberships
CREATE POLICY "Company admins can manage memberships"
  ON company_users
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Customers table policies
-- Users can view customers from their companies
CREATE POLICY "Users can view company customers"
  ON customers
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Users can manage customers in their companies
CREATE POLICY "Users can manage company customers"
  ON customers
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Products table policies
-- Users can view products from their companies
CREATE POLICY "Users can view company products"
  ON products
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Users can manage products in their companies
CREATE POLICY "Users can manage company products"
  ON products
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Invoices table policies
-- Users can view invoices from their companies
CREATE POLICY "Users can view company invoices"
  ON invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Users can manage invoices in their companies
CREATE POLICY "Users can manage company invoices"
  ON invoices
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Invoice Items table policies
-- Users can view invoice items from their companies
CREATE POLICY "Users can view company invoice items"
  ON invoice_items
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id 
      FROM invoices 
      WHERE company_id IN (
        SELECT company_id 
        FROM company_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can manage invoice items in their companies
CREATE POLICY "Users can manage company invoice items"
  ON invoice_items
  FOR ALL
  USING (
    invoice_id IN (
      SELECT id 
      FROM invoices 
      WHERE company_id IN (
        SELECT company_id 
        FROM company_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
