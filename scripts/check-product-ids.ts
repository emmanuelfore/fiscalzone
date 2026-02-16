
import "dotenv/config";
import { db } from "../server/db";
import { products, companies } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function checkProductIds() {
    console.log("--- PRODUCT ID CHECK ---");
    const allProducts = await db.select().from(products).orderBy(desc(products.id)); // Show newest first

    console.log(`Total Products: ${allProducts.length}`);
    if (allProducts.length > 0) {
        console.log("Top 10 Newest Products:");
        allProducts.slice(0, 10).forEach(p => {
            console.log(`[${p.id}] ${p.name} (Company: ${p.companyId})`);
        });
    } else {
        console.log("No products found.");
    }
    process.exit(0);
}

checkProductIds();
