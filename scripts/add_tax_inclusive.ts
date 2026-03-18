
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("SUPABASE_DB_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function addTaxInclusive() {
    console.log("🛠️ Adding 'tax_inclusive' column to 'invoices' table...");
    const client = await pool.connect();

    try {
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        `);
        console.log("✅ Column 'tax_inclusive' added successfully.");
    } catch (err: any) {
        console.error("❌ Failed to add column:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addTaxInclusive();
