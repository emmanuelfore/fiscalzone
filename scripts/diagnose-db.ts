
import "dotenv/config";
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function diagnose() {
    try {
        console.log("--- DATABASE DIAGNOSTIC ---");

        // Check current database and search path
        const meta = await db.execute(sql`SELECT current_database(), current_schema(), current_user, session_user`);
        console.log("Connection Metadata:", JSON.stringify(meta.rows[0], null, 2));

        const searchPath = await db.execute(sql`SHOW search_path`);
        console.log("Search Path:", JSON.stringify(searchPath.rows[0], null, 2));

        // Check if tables exist in public schema
        const tables = ["suppliers", "inventory_transactions", "expenses", "invoices"];
        console.log("\nChecking tables in public schema:");

        for (const table of tables) {
            const res = await db.execute(sql`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE  table_schema = 'public'
                    AND    table_name   = ${table}
                );
            `);
            console.log(`Table "${table}" exists: ${res.rows[0].exists}`);
        }

        // Try a direct select
        console.log("\nAttempting direct SELECT from inventory_transactions:");
        try {
            await db.execute(sql`SELECT 1 FROM inventory_transactions LIMIT 1`);
            console.log("[SUCCESS] Direct SELECT from inventory_transactions worked.");
        } catch (err: any) {
            console.log(`[FAILED] Direct SELECT failed: ${err.message}`);
        }

    } catch (err: any) {
        console.error("DIAGNOSTIC ERROR:", err.message);
    } finally {
        await pool.end();
    }
}

diagnose();
