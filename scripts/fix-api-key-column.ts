
import "dotenv/config"; // Load environment variables!
import { db } from "../server/db";
import { companies } from "../shared/schema";
import { sql, eq } from "drizzle-orm";
import crypto from "crypto";

async function main() {
    console.log("Checking for apiKey column...");

    // 1. Add column if not exists
    try {
        await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS "api_key" text UNIQUE;`);
        console.log("✅ Schema check/update complete");
    } catch (error: any) {
        console.warn("⚠️ Warning checking schema (might already exist):", error.message);
    }

    // 2. Generate keys for existing companies
    console.log("Generating keys for all companies...");
    const existingCompanies = await db.select().from(companies);
    let updatedcount = 0;

    for (const company of existingCompanies) {
        if (!company.apiKey) {
            const randomPart = crypto.randomBytes(12).toString('hex');
            const apiKey = `zk_live_${randomPart}`;

            await db.update(companies)
                .set({ apiKey })
                .where(eq(companies.id, company.id));

            console.log(`Updated company ${company.id} (${company.name}) with key: ${apiKey}`);
            updatedcount++;
        }
    }

    console.log(`✅ Key generation complete. Updated ${updatedcount} companies.`);

    if (existingCompanies.length > 0) {
        const check = await db.select().from(companies).where(eq(companies.id, existingCompanies[0].id));
        console.log("Verification sample:", check[0].apiKey ? "Has Key" : "No Key");
    }

    process.exit(0);
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
