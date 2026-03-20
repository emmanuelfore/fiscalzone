/**
 * Fix: reset lastReceiptAt for a company to now (or a specific time).
 * Run with: npx tsx fix-last-receipt-at.ts <companyId>
 */
import "dotenv/config";
import { db } from "./server/db";
import { companies } from "./shared/schema";
import { eq } from "drizzle-orm";

const companyId = parseInt(process.argv[2] || "0");
if (!companyId) {
  console.error("Usage: npx tsx fix-last-receipt-at.ts <companyId>");
  process.exit(1);
}

async function main() {
  const [before] = await db.select({ lastReceiptAt: companies.lastReceiptAt })
    .from(companies).where(eq(companies.id, companyId));

  console.log(`Current lastReceiptAt: ${before?.lastReceiptAt}`);

  // Set to now — the guard will bump by 1s if needed on next submission
  const now = new Date();
  await db.update(companies)
    .set({ lastReceiptAt: now })
    .where(eq(companies.id, companyId));

  console.log(`Reset to: ${now.toISOString()}`);
  console.log("Done. Next submission will use real current time.");
}

main().catch(err => { console.error(err); process.exit(1); });
