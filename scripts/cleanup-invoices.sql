
-- SQL Script to delete all invoices that are not in 'draft' status
-- CAUTION: This will permanently delete data.

-- 1. Create a temporary table to store the IDs of invoices to be deleted
CREATE TEMP TABLE invoices_to_delete AS
SELECT id FROM invoices WHERE status != 'draft';

-- 2. Check how many records will be deleted (Optional, for verification)
SELECT COUNT(*) as invoices_count FROM invoices_to_delete;

-- 3. Delete related Validation Errors
DELETE FROM validation_errors
WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- 4. Delete related Invoice Items
DELETE FROM invoice_items
WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- 5. Delete related ZIMRA Logs (Fix for FK constraint error)
DELETE FROM zimra_logs
WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- 6. Delete related Payments (To prevent potential FK errors)
DELETE FROM payments
WHERE invoice_id IN (SELECT id FROM invoices_to_delete);

-- 7. Delete the Invoices themselves
DELETE FROM invoices
WHERE id IN (SELECT id FROM invoices_to_delete);

-- 8. Cleanup
DROP TABLE invoices_to_delete;

-- Verification
SELECT COUNT(*) as remaining_non_draft_invoices FROM invoices WHERE status != 'draft';
