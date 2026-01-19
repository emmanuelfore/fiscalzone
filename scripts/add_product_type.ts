
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("SUPABASE_DB_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function addProductType() {
    console.log("🛠️ Adding 'product_type' column to 'products' table...");
    const client = await pool.connect();

    try {
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'good' NOT NULL;
        `);
        console.log("✅ Column 'product_type' added successfully.");
    } catch (err: any) {
        console.error("❌ Failed to add column:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addProductType();
