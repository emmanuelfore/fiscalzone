import "dotenv/config";
import { pool } from "../server/db";

async function checkDb() {
    try {
        console.log("Testing DB connection...");
        const client = await pool.connect();
        console.log("Successfully connected to DB");
        const res = await client.query('SELECT NOW()');
        console.log("Query result:", res.rows[0]);
        client.release();
        process.exit(0);
    } catch (err) {
        console.error("DB Connection Failed:", err);
        process.exit(1);
    }
}

checkDb();
