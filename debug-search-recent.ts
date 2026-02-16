
import "dotenv/config";
import { db } from "./server/db";
import { products, companies } from "./shared/schema";
import { desc, gt, sql } from "drizzle-orm";

async function searchRecentProducts() {
    console.log("Searching for recent products across ALL companies...");

    // Search for products created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentProducts = await db.select({
        id: products.id,
        name: products.name,
        companyId: products.companyId,
        companyName: companies.name,
        createdAt: products.createdAt
    })
        .from(products)
        .leftJoin(companies, sql`${products.companyId} = ${companies.id}`)
        .where(gt(products.createdAt, sevenDaysAgo))
        .orderBy(desc(products.createdAt))
        .limit(50);


    const fs = await import('fs');
    if (recentProducts.length === 0) {
        fs.writeFileSync('recent_products_report.txt', "No recent products found in the last 7 days.");
    } else {
        const output = JSON.stringify(recentProducts.map(p => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : 'N/A'
        })), null, 2);
        fs.writeFileSync('recent_products_report.txt', output);
        console.log("Written to recent_products_report.txt");
    }

    process.exit(0);
}

searchRecentProducts();
