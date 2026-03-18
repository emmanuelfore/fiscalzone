
import "dotenv/config";
import { storage } from "../server/storage";
import { pool } from "../server/db";

async function test() {
    try {
        console.log("Testing storage.getInventoryTransactions(26)...");
        const results = await storage.getInventoryTransactions(26);
        console.log(`[SUCCESS] Found ${results.length} transactions.`);
    } catch (err: any) {
        console.error(`[FAILED] storage.getInventoryTransactions failed: ${err.message}`);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

test();
