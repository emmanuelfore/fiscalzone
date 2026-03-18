BEGIN;

-- 1. Identify IDs of invoices to be deleted based on the user's criteria
-- Target: Company 21, QR Code contains 'test'
CREATE TEMP TABLE invoices_to_delete AS
SELECT id FROM invoices 
WHERE company_id = 21 AND qr_code_data LIKE '%test%';

-- 2. Delete from related child tables to maintain referential integrity
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices_to_delete);
DELETE FROM validation_errors WHERE invoice_id IN (SELECT id FROM invoices_to_delete);
DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices_to_delete);
DELETE FROM zimra_logs WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- 3. Clear self-references in the invoices table (e.g., Credit/Debit note links)
-- This prevents foreign key violations within the invoices table itself
UPDATE invoices SET related_invoice_id = NULL WHERE related_invoice_id IN (SELECT id FROM invoices_to_delete);

-- 4. Finally, delete the identified invoice records
DELETE FROM invoices WHERE id IN (SELECT id FROM invoices_to_delete);

-- 5. Optional: Reset receipt counters for company 21
-- UPDATE companies SET "daily_receipt_count" = 0, "last_receipt_global_no" = 0 WHERE id = 21;

-- 6. Optional: Reset fiscal day status for company 21
-- UPDATE companies SET "fiscal_day_open" = false, "current_fiscal_day_no" = 0 WHERE id = 21;

-- 7. Clean up temporary resources
DROP TABLE invoices_to_delete;

-- Verify the result (optional)
-- SELECT count(*) FROM invoices WHERE company_id = 21 AND qr_code_data LIKE '%test%';

COMMIT;
