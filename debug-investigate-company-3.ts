
import "dotenv/config";
import { db } from "./server/db";
import { products, auditLogs } from "./shared/schema";
import { eq, desc, and } from "drizzle-orm";

async function investigate() {
    console.log("Investigating Company 3 Data...");

    // 1. Check ALL products for company 3 (including inactive)
    const allProducts = await db.select().from(products).where(eq(products.companyId, 3));
    console.log(`Total Products found: ${allProducts.length}`);
    console.table(allProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        isActive: p.isActive,
        createdAt: p.createdAt
    })));

    // 2. Check Audit Logs for Company 3
    console.log("\nChecking Audit Logs for Company 3...");
    const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.companyId, 3))
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

    if (logs.length === 0) {
        console.log("No audit logs found for company 3.");
    } else {
        console.table(logs.map(l => ({
            action: l.action,
            entity: l.entityType,
            details: JSON.stringify(l.details),
            date: l.createdAt
        })));
    }

    process.exit(0);
}

investigate();
