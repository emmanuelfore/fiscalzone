import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Migration Script: Add ZIMRA-Required Fields
 * 
 * Adds missing fields required by ZIMRA specification:
 * - fdms_device_serial_no: Device Serial Number (Field [21])
 * - branch_name: Branch Name (Field [5])
 */

async function addZimraFields() {
    console.log("🔧 Starting ZIMRA fields migration...");

    try {
        // Add fdms_device_serial_no column
        console.log("Adding fdms_device_serial_no column...");
        await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS fdms_device_serial_no TEXT
    `);
        console.log("✅ Added fdms_device_serial_no column");

        // Add branch_name column
        console.log("Adding branch_name column...");
        await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS branch_name TEXT
    `);
        console.log("✅ Added branch_name column");

        // Add comments for documentation
        console.log("Adding column comments...");
        await db.execute(sql`
      COMMENT ON COLUMN companies.fdms_device_serial_no IS 'ZIMRA Fiscal Device Serial Number - Required for invoice display per ZIMRA spec field [21]'
    `);
        await db.execute(sql`
      COMMENT ON COLUMN companies.branch_name IS 'Branch name - Displayed only if different from company name per ZIMRA spec field [5]'
    `);
        console.log("✅ Added column comments");

        console.log("\n✨ Migration completed successfully!");
        console.log("\n📋 Next Steps:");
        console.log("1. Update your ZIMRA device settings to include the device serial number");
        console.log("2. The serial number will now be displayed on all invoices and PDFs");
        console.log("3. Credit/Debit notes will show complete original invoice information");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

// Run migration
addZimraFields()
    .then(() => {
        console.log("\n✅ All done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Migration error:", error);
        process.exit(1);
    });
