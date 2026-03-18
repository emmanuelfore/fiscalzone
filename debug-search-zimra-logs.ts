
import "dotenv/config";
import { db } from "./server/db";
import { zimraLogs } from "./shared/schema";
import { sql, eq, desc, and } from "drizzle-orm";

async function searchZimraLogs() {
    const companyId = 3;
    const searchTerms = ["Balancing", "Fan", "Circulation"];

    console.log(`Searching ZIMRA Logs for Company ${companyId}...`);

    for (const term of searchTerms) {
        console.log(`\n--- Searching for "${term}" ---`);
        const results = await db.select({
            id: zimraLogs.id,
            createdAt: zimraLogs.createdAt,
            endpoint: zimraLogs.endpoint,
            invoiceId: zimraLogs.invoiceId,
            requestSnippet: sql<string>`substring(cast(${zimraLogs.requestPayload} as text) from 1 for 100)`,
            // We can't easily extract just the matching line in SQL without complex regex, 
            // so we'll fetch ID and then process in JS if needed, or just rely on the count.
            // actually let's just fetch the whole payload if it matches to show the user.
            requestPayload: zimraLogs.requestPayload
        })
            .from(zimraLogs)
            .where(and(
                eq(zimraLogs.companyId, companyId),
                sql`cast(${zimraLogs.requestPayload} as text) ILIKE ${`%${term}%`}`
            ))
            .limit(5);

        if (results.length === 0) {
            console.log("No matches found.");
        } else {
            console.log(`Found ${results.length} matches:`);
            results.forEach(r => {
                console.log(`[ID: ${r.id}] ${r.createdAt} - Invoice: ${r.invoiceId}`);
                console.log(`Payload: ${JSON.stringify(r.requestPayload).substring(0, 200)}...`);
            });
        }
    }

    // Fetch full details for the first match to extract product info
    console.log("\n--- Extracting Details for 'Balancing' ---");
    const specificLog = await db.select()
        .from(zimraLogs)
        .where(sql`cast(${zimraLogs.requestPayload} as text) ILIKE '%Balancing%'`)
        .limit(1);

    if (specificLog.length > 0) {
        console.log(JSON.stringify(specificLog[0].requestPayload, null, 2));
    }

    // Also list the last 5 logs for this company to verify we have ANY logs
    console.log("\n--- Recent Logs for Company 3 ---");
    const recentLogs = await db.select()
        .from(zimraLogs)
        .where(eq(zimraLogs.companyId, companyId))
        .orderBy(desc(zimraLogs.createdAt))
        .limit(5);

    if (recentLogs.length === 0) {
        console.log("No logs found for Company 3.");
    } else {
        console.table(recentLogs.map(l => ({
            id: l.id,
            createdAt: l.createdAt,
            endpoint: l.endpoint,
            status: l.statusCode
        })));
    }

    process.exit(0);
}

searchZimraLogs();
