
import { db } from "../server/db";
import { invoices, invoiceItems, payments, validationErrors, zimraLogs } from "@shared/schema";
import { eq } from "drizzle-orm";

async function clearInvoices() {
    console.log("🧹 Starting invoice data cleanup...");

    try {
        // 1. Delete Validation Errors
        console.log("- Deleting validation errors...");
        await db.delete(validationErrors);

        // 2. Delete Payments
        console.log("- Deleting payments...");
        await db.delete(payments);

        // 3. Delete Invoice Items
        console.log("- Deleting invoice items...");
        await db.delete(invoiceItems);

        // 4. Delete ZIMRA Logs
        console.log("- Deleting ZIMRA logs...");
        await db.delete(zimraLogs);

        // 5. Delete Invoices
        console.log("- Deleting invoices...");
        await db.delete(invoices);

        console.log("✅ Cleanup complete! All invoices, items, payments, and logs have been removed.");
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    clearInvoices().then(() => process.exit(0));
}

export { clearInvoices };
