
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Starting migration: ZiG -> ZWG...");

    try {
        // 1. Update Currencies Table
        await db.execute(sql`UPDATE currencies SET code = 'ZWG', symbol = 'ZWG' WHERE code = 'ZiG'`);
        console.log("Updated currencies table.");

        // 2. Update Companies Table
        await db.execute(sql`UPDATE companies SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated companies records.");

        // 3. Update Customers Table
        await db.execute(sql`UPDATE customers SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated customers records.");

        // 4. Update Invoices Table
        await db.execute(sql`UPDATE invoices SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated invoices records.");

        // 5. Update Payments Table
        await db.execute(sql`UPDATE payments SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated payments records.");

        // 6. Update Quotations Table
        await db.execute(sql`UPDATE quotations SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated quotations records.");

        // 7. Update Recurring Invoices Table
        await db.execute(sql`UPDATE recurring_invoices SET currency = 'ZWG' WHERE currency = 'ZiG'`);
        console.log("Updated recurring_invoices records.");

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

main();
