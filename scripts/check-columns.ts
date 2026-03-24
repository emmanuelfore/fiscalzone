
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
    console.log("--- COLUMNS IN 'products' ---");
    const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'products';
    `);

    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
}

run();
