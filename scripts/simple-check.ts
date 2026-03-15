
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Connecting...");
        const res = await pool.query(`
            SELECT id, "receipt_global_no", "fdms_status", "validation_status" 
            FROM invoices 
            ORDER BY id DESC 
            LIMIT 5
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
