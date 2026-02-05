
import "dotenv/config";
import { invoices, invoiceItems, validationErrors } from "../shared/schema";
import { ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;

async function cleanupInvoices() {
    console.log("Starting invoice cleanup...");

    if (!process.env.DATABASE_URL) {
        console.error("ERROR: DATABASE_URL is not set.");
        process.exit(1);
    }

    // Force IPv4 if localhost (fix for Node 17+ favoring IPv6 ::1)
    if (process.env.DATABASE_URL.includes("localhost")) {
        console.log("Replacing localhost with 127.0.0.1 to force IPv4...");
        process.env.DATABASE_URL = process.env.DATABASE_URL.replace("localhost", "127.0.0.1");
    }

    const isLocal = process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1");
    console.log(`Environment detected: ${isLocal ? "Local" : "Remote"}`);

    // Masked URL logging
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]*@/, ":***@");
    console.log(`Using Database: ${maskedUrl}`);

    // Create a custom pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Only use SSL if NOT local (or if we suspect remote needs it)
        // If npm run dev works with SSL locally, we should try matching that, but connection refused suggests otherwise.
        // Let's try NO SSL first if local.
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000 // Fail fast if blocked
    });

    const db = drizzle(pool, { schema: { invoices, invoiceItems, validationErrors } });

    try {
        // Test connection
        console.log("Testing connection...");
        await pool.query('SELECT 1');
        console.log("Connection successful!");

        // 1. Identify non-draft invoices
        console.log("Querying for non-draft invoices...");
        const targetInvoices = await db.select({ id: invoices.id })
            .from(invoices)
            .where(ne(invoices.status, "draft"));

        console.log(`Query successful. Found ${targetInvoices.length} candidates.`);

        if (targetInvoices.length === 0) {
            console.log("No non-draft invoices found.");
            process.exit(0);
        }

        const targetIds = targetInvoices.map(i => i.id);
        console.log(`Found ${targetIds.length} non-draft invoices to delete.`);

        // 2. Delete related Validation Errors
        // Note: InArray handles empty arrays gracefully usually, but we have a check above
        const deletedErrors = await db.delete(validationErrors)
            .where(inArray(validationErrors.invoiceId, targetIds))
            .returning({ id: validationErrors.id });
        console.log(`Deleted ${deletedErrors.length} validation errors.`);

        // 3. Delete related Invoice Items
        const deletedItems = await db.delete(invoiceItems)
            .where(inArray(invoiceItems.invoiceId, targetIds))
            .returning({ id: invoiceItems.id });
        console.log(`Deleted ${deletedItems.length} invoice items.`);

        // 4. Delete the Invoices
        const deletedInvoices = await db.delete(invoices)
            .where(inArray(invoices.id, targetIds))
            .returning({ id: invoices.id });
        console.log(`Successfully deleted ${deletedInvoices.length} invoices.`);

    } catch (error) {
        console.error("Error during cleanup:", error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

cleanupInvoices();
