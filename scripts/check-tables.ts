
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkTables() {
    try {
        const tables = ["suppliers", "inventory_transactions", "expenses", "product_performance"];
        console.log("Checking tables...");

        for (const table of tables) {
            try {
                const result = await db.execute(sql`SELECT 1 FROM ${sql.identifier(table)} LIMIT 1`);
                console.log(`[OK] Table "${table}" exists.`);
            } catch (err: any) {
                console.log(`[MISSING] Table "${table}" does not exist. Error: ${err.message}`);
            }
        }

    } catch (err: any) {
        console.error("DEBUG ERROR:", err.message);
    }
}

checkTables().then(() => process.exit(0)).catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
