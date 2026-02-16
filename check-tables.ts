
import { db } from "./server/db.js";
import { sql } from "drizzle-orm";
import fs from "fs";

async function checkTables() {
    try {
        const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const tables = res.rows.map(r => r.table_name);
        fs.writeFileSync("tables-check.log", JSON.stringify(tables, null, 2));
        console.log("Tables found:", tables);
    } catch (err) {
        console.error("Error:", err);
        fs.writeFileSync("tables-check.log", "Error: " + err);
    } finally {
        process.exit(0);
    }
}

checkTables();
