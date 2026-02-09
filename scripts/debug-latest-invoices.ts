
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { desc } from "drizzle-orm";

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool, { schema });

async function debugInvoices() {
    console.log("Fetching last 5 invoices...");
    const invoices = await db.query.invoices.findMany({
        orderBy: [desc(schema.invoices.id)],
        limit: 5,
        columns: {
            id: true,
            invoiceNumber: true,
            status: true,
            fdmsStatus: true,
            validationStatus: true,
            receiptGlobalNo: true,
            receiptCounter: true,
            fiscalCode: true
        }
    });

    console.table(invoices);

    // Also fetch company counters
    const company = await db.query.companies.findFirst({
        columns: {
            id: true,
            lastReceiptGlobalNo: true,
            dailyReceiptCount: true
        }
    });
    console.log("\nCompany Counters:");
    console.table([company]);

    pool.end();
}

debugInvoices();
