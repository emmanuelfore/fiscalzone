
import { db } from "./server/db";
import { zimraLogs } from "./shared/schema";
import { count } from "drizzle-orm";

async function main() {
    console.log("Checking ZIMRA Logs...");
    const result = await db.select({ count: count() }).from(zimraLogs);
    console.log(`Total Logs in DB: ${result[0].count}`);

    if (result[0].count > 0) {
        const logs = await db.select().from(zimraLogs).limit(5);
        console.log("Recent Logs:", JSON.stringify(logs, null, 2));
    }
}

main().catch(console.error).finally(() => process.exit());
