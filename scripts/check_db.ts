
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkDb() {
    console.log("🔍 Checking database schema...");
    const client = await pool.connect();

    try {
        const schemaData: any = {};
        // Get all tables
        const resTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        for (const row of resTables.rows) {
            const tableName = row.table_name;

            // Get columns for this table
            const resColumns = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                ORDER BY ordinal_position;
            `, [tableName]);

            schemaData[tableName] = resColumns.rows;
        }

        const fs = await import("fs");
        fs.writeFileSync("db_schema.json", JSON.stringify(schemaData, null, 2));
        console.log("✅ Schema written to db_schema.json");

    } catch (err: any) {
        console.error("❌ Check failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDb();
