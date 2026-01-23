-- Add qr_url column to companies table for ZIMRA Field [48]
-- This stores the URL for QR validation from ZIMRA FDMS config

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.qr_url IS 'ZIMRA Field [48] - URL for QR validation (from FDMS getConfig)';
