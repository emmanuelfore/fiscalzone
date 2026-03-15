
import "dotenv/config";
import { db } from "./server/db";
import { products, companies } from "./shared/schema";
import { desc, gt, sql } from "drizzle-orm";
import * as fs from 'fs';

async function searchRecentProducts() {
    console.log("Searching for recent products across ALL companies...");

    try {
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
            .limit(100);

        console.log(`Found ${recentProducts.length} products.`);

        if (recentProducts.length === 0) {
            fs.writeFileSync('product_report.txt', "No recent products found in the last 7 days.");
        } else {
            const output = JSON.stringify(recentProducts.map(p => ({
                ...p,
                createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : 'N/A'
            })), null, 2);
            fs.writeFileSync('product_report.txt', output);
            console.log("Written to product_report.txt");
        }
    } catch (err) {
        console.error("Error:", err);
        fs.writeFileSync('product_report.txt', "Error: " + err);
    }

    process.exit(0);
}

searchRecentProducts();
