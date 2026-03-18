-- Add missing zimra_environment column to companies table
-- Run this SQL script directly in your database

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS zimra_environment TEXT DEFAULT 'test';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'zimra_environment';

-- Optional: Update any existing companies to explicitly set test environment
UPDATE companies 
SET zimra_environment = 'test' 
WHERE zimra_environment IS NULL;
