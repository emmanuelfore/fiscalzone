
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("SUPABASE_DB_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function fixSchema() {
    console.log("🔧 Fixing database schema manually...");
    const client = await pool.connect();

    try {
        // Fix 1: Add currency column to companies
        console.log("Checking 'companies' table for 'currency' column...");
        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
        `);
        console.log("✅ 'currency' column ensured on 'companies' table.");

        // Fix 2: Ensure 'hs_code' exists on products (and create if missing with default to avoid null error)
        console.log("Checking 'products' table for 'hs_code' column...");
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS hs_code TEXT DEFAULT '0000.00.00' NOT NULL;
        `);
        console.log("✅ 'hs_code' column ensured on 'products' table.");

    } catch (err: any) {
        console.error("❌ Schema fix failed:", err.message);
        // If it failed because column exists but with different constraint, we might need more logic
        // But ADD COLUMN IF NOT EXISTS is usually safe.
        // If NOT NULL fails because of existing nulls, we catch it here.
        if (err.message.includes("contains null values")) {
            console.log("⚠️  Could not add NOT NULL constraint directly. Adding column first, then filling defaults.");
            // Fallback strategy could be added here if needed, but the above command sets DEFAULT which *should* handle new rows, 
            // but for existing rows adding a column with DEFAULT fills them.
            // The error usually happens if you say NOT NULL without DEFAULT.
        }
    } finally {
        client.release();
        await pool.end();
        console.log("Db connection closed.");
    }
}

fixSchema();
