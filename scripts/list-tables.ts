
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function listTables() {
    try {
        const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const tables = res.rows.map(r => r.table_name);
        fs.writeFileSync("existing_tables.json", JSON.stringify(tables, null, 2));
        console.log("Existing tables dumped to existing_tables.json");
    } catch (err: any) {
        console.error("ERROR:", err.message);
    }
}

listTables().then(() => process.exit(0));
