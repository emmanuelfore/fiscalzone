-- Add ZIMRA invoice numbering fields to invoices table
-- ZIMRA Field [17]: Receipt Counter (daily counter, resets each fiscal day)
-- ZIMRA Field [18]: Receipt Global Number (global counter, never resets)

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS receipt_counter INTEGER,
ADD COLUMN IF NOT EXISTS receipt_global_no INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN invoices.receipt_counter IS 'ZIMRA Field [17] - Daily receipt counter within fiscal day';
COMMENT ON COLUMN invoices.receipt_global_no IS 'ZIMRA Field [18] - Global receipt number (never resets)';
