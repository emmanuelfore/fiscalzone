import { sql } from "drizzle-orm";
import { db } from "../server/db.js";

async function addValidationErrorsTable() {
  try {
    console.log("Adding validation_errors table and validation columns to invoices...");

    // Add validation columns to invoices table
    await db.execute(sql`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS validation_status TEXT,
      ADD COLUMN IF NOT EXISTS last_validation_attempt TIMESTAMP;
    `);

    // Create validation_errors table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS validation_errors (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id),
        error_code TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_color TEXT NOT NULL,
        requires_previous_receipt BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Validation errors table and columns added successfully!");
  } catch (error) {
    console.error("❌ Error adding validation errors table:", error);
    throw error;
  }
}

// Run the migration
addValidationErrorsTable()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });