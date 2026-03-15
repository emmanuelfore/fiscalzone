import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Adding locking columns to invoices table...");

    try {
        await db.execute(sql`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS locked_at timestamp;
    `);
        console.log("Successfully added locked_by and locked_at columns.");
    } catch (error) {
        console.error("Error adding columns:", error);
    }

    process.exit(0);
}

main();
