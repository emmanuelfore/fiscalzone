-- ZIMRA FDMS - Test Environment Cleanup Script
-- DANGER: This script will delete ALL invoices, items, and related ZIMRA logs.
-- USE ONLY FOR TESTING PURPOSES.

-- 1. Clear validation errors
DELETE FROM validation_errors;

-- 2. Clear payments
DELETE FROM payments;

-- 3. Clear invoice items
DELETE FROM invoice_items;

-- 4. Clear ZIMRA logs
DELETE FROM zimra_logs;

-- 5. Clear invoices
DELETE FROM invoices;

-- Optional: Reset receipt counters for companies (if you want to start from receipt #1)
-- UPDATE companies SET "daily_receipt_count" = 0, "last_receipt_global_no" = 0;

-- Optional: Reset fiscal day status (be careful with this if device is already registered)
-- UPDATE companies SET "fiscal_day_open" = false, "current_fiscal_day_no" = 0;
