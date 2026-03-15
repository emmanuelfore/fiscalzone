BEGIN;

-- 1. Identify IDs of invoices to be deleted based on the user's criteria
CREATE TEMP TABLE invoices_to_delete AS
SELECT id FROM invoices 
WHERE company_id = 8 AND qr_code_data LIKE '%fdmstest%';

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

-- 5. Clean up temporary resources
DROP TABLE invoices_to_delete;

-- Verify the result (optional, but good practice since it's within the transaction)
-- SELECT count(*) FROM invoices WHERE company_id = 8 AND qr_code_data LIKE '%fdmstest%';

COMMIT;
