
import 'dotenv/config';
import { db } from '../server/db';
import { invoices, companies } from '../shared/schema';
import { eq, isNull, and } from 'drizzle-orm';

async function main() {
    console.log("Starting fiscal day repair...");

    // 1. Get all companies
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies.`);

    for (const company of allCompanies) {
        if (!company.currentFiscalDayNo) {
            console.log(`Skipping Company ${company.id} (No current fiscal day).`);
            continue;
        }

        console.log(`Checking Company ${company.id} (Current Fiscal Day: ${company.currentFiscalDayNo})...`);

        // 2. Find broken invoices
        const brokenInvoices = await db.select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.companyId, company.id),
                    eq(invoices.syncedWithFdms, true),
                    isNull(invoices.fiscalDayNo)
                )
            );

        if (brokenInvoices.length === 0) {
            console.log(`  No broken invoices found.`);
            continue;
        }

        console.log(`  Found ${brokenInvoices.length} invoices with missing fiscalDayNo.`);

        // 3. Update them
        for (const inv of brokenInvoices) {
            await db.update(invoices)
                .set({ fiscalDayNo: company.currentFiscalDayNo })
                .where(eq(invoices.id, inv.id));
            console.log(`  - Fixed Invoice ${inv.invoiceNumber} (ID: ${inv.id}) -> Fiscal Day ${company.currentFiscalDayNo}`);
        }
    }

    console.log("Repair complete.");
    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
