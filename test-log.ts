
import { db } from "./server/db";
import { zimraLogs } from "./shared/schema";

async function main() {
    console.log("Testing ZIMRA Log Insertion...");

    try {
        // 1. Get a valid company ID
        const companies = await db.query.companies.findMany({ limit: 1 });
        if (companies.length === 0) {
            console.error("No companies found to test log insertion against.");
            return;
        }
        const companyId = companies[0].id;
        console.log(`Using Company ID: ${companyId}`);

        // 2. Attempt Insert
        const result = await db.insert(zimraLogs).values({
            companyId: companyId,
            invoiceId: null, // Test generic log
            requestPayload: { test: "request" },
            responsePayload: { test: "response" },
            statusCode: 200,
            errorMessage: null,
            endpoint: "/test/manual-insert" // Add endpoint if schema supports it, check schema first
        }).returning();

        console.log("Insert Success:", result);
    } catch (error: any) {
        console.error("Insert Failed:", error);
        console.error("Details:", error.message);
    }
}

main().catch(console.error).finally(() => process.exit());
