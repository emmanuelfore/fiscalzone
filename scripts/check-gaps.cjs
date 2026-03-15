
const { Pool } = require('pg');
require('dotenv').config();

async function debugGaps() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not found in environment.");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    console.log("--- ZIMRA SEQUENCE GAP ANALYSIS ---\n");

    try {
        const companiesRes = await pool.query('SELECT id, name, fdms_device_id, current_fiscal_day_no, last_receipt_global_no, daily_receipt_count FROM companies WHERE fdms_device_id IS NOT NULL');

        for (const company of companiesRes.rows) {
            console.log(`Company: ${company.name} (ID: ${company.id})`);
            console.log(`  Device ID: ${company.fdms_device_id}`);
            console.log(`  Current Fiscal Day: ${company.current_fiscal_day_no}`);
            console.log(`  Last Global No: ${company.last_receipt_global_no}`);
            console.log(`  Daily Count: ${company.daily_receipt_count}`);

            const invoicesRes = await pool.query(
                'SELECT invoice_number, receipt_counter, receipt_global_no, synced_with_fdms, status FROM invoices WHERE company_id = $1 AND fiscal_day_no = $2 ORDER BY receipt_counter ASC',
                [company.id, company.current_fiscal_day_no]
            );

            if (invoicesRes.rows.length === 0) {
                console.log("  No invoices found for this fiscal day.");
                continue;
            }

            console.log(`  Found ${invoicesRes.rows.length} invoices today.`);

            let expectedCounter = 1;
            for (const inv of invoicesRes.rows) {
                const actualCounter = inv.receipt_counter;

                if (actualCounter !== expectedCounter) {
                    console.error(`  [GAP] Expected counter ${expectedCounter}, but found ${actualCounter} at ${inv.invoice_number}`);
                    expectedCounter = actualCounter; // Sync back to actual to find next gap
                }

                if (!inv.synced_with_fdms) {
                    console.warn(`  [UNSYNCED] Invoice ${inv.invoice_number} (Counter: ${actualCounter}, Status: ${inv.status})`);
                }

                expectedCounter++;
            }

            // Final check against company daily count
            if (company.daily_receipt_count >= expectedCounter) {
                console.error(`  [GAP] Company says ${company.daily_receipt_count} receipts, but only tracked up to ${expectedCounter - 1}. Possible missing sync record.`);
            }
        }
    } catch (err) {
        console.error("Database query error:", err);
    } finally {
        await pool.end();
    }
}

debugGaps();
