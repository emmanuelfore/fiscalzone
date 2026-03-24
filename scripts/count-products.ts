
import "dotenv/config";
import { db } from "../server/db";
import { products, companies } from "../shared/schema";
import { eq, count, sql } from "drizzle-orm";

async function run() {
    console.log("--- PRODUCT COUNTS BY COMPANY ---");
    const counts = await db
        .select({
            companyId: products.companyId,
            productCount: count(products.id)
        })
        .from(products)
        .groupBy(products.companyId)
        .orderBy(sql`count(${products.id}) desc`);

    for (const c of counts) {
        const [company] = await db.select().from(companies).where(eq(companies.id, c.companyId));
        console.log(`[${c.companyId}] ${company?.name || 'Unknown'}: ${c.productCount} products`);
    }
    process.exit(0);
}

run();
