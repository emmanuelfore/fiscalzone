-- Add missing ZIMRA-required fields to companies table
-- ZIMRA Field [21]: Device Serial Number - MANDATORY
-- ZIMRA Field [5]: Branch Name - Conditional (if different from company name)

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS fdms_device_serial_no TEXT,
ADD COLUMN IF NOT EXISTS branch_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.fdms_device_serial_no IS 'ZIMRA Fiscal Device Serial Number - Required for invoice display per ZIMRA spec field [21]';
COMMENT ON COLUMN companies.branch_name IS 'Branch name - Displayed only if different from company name per ZIMRA spec field [5]';
