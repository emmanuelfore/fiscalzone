
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function checkDb() {
    console.log("Checking DB connection with config:");
    console.log("URL:", process.env.DATABASE_URL ? "Set" : "Not Set");

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connecting...");
        const client = await pool.connect();
        console.log("✅ Successfully connected to DB!");
        const res = await client.query('SELECT NOW()');
        console.log("Query result:", res.rows[0]);
        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ DB Connection Failed:", err);
        process.exit(1);
    }
}

checkDb();
