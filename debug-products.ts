import "dotenv/config";
import { db } from "./server/db";
import { products } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkProducts() {
    console.log("Checking products for companyId = 3...");
    try {
        const companyProducts = await db.select().from(products).where(eq(products.companyId, 3));
        console.log(`Found ${companyProducts.length} products for company 3.`);
        if (companyProducts.length > 0) {
            console.log("First 5 products:", JSON.stringify(companyProducts.slice(0, 5), null, 2));
        } else {
            // limit 10 generally
            const allProducts = await db.select().from(products).limit(10);
            console.log("First 10 products in DB (any company):", JSON.stringify(allProducts, null, 2));
        }
    } catch (error) {
        console.error("Error querying products:", error);
    }
    process.exit(0);
}

checkProducts();
