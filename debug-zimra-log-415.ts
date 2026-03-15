
import "dotenv/config";
import { db } from "./server/db";
import { zimraLogs } from "./shared/schema";
import { eq, sql } from "drizzle-orm";


async function getAllLogs() {
    const logs = await db.select().from(zimraLogs)
        .where(sql`cast(${zimraLogs.requestPayload} as text) ILIKE '%Balancing%'`)
        .limit(10);

    logs.forEach(log => {
        console.log(`\n--- Log ID: ${log.id} ---`);
        const payload = log.requestPayload as any;
        let receiptObj = Array.isArray(payload) ? payload[0] : payload;

        if (receiptObj.receipt && receiptObj.receipt.receiptLines) {
            receiptObj.receipt.receiptLines.forEach((l: any) => {
                console.log(`Item: ${l.receiptLineName} | Price: ${l.receiptLinePrice} | Tax: ${l.taxPercent}`);
            });
        }
    });
    process.exit(0);
}

getAllLogs();
