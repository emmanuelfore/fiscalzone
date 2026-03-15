
import pg from 'pg';
const { Pool } = pg;

// Connection string from .env
const connectionString = "postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres";

async function findCompany() {
    console.log("Connecting...");
    const pool = new Pool({ connectionString });
    try {
        const res = await pool.query("SELECT id, name FROM companies WHERE name ILIKE '%LIPVIEW%'");
        console.log("Result:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        await pool.end();
    }
}

findCompany();
