
import "dotenv/config";
import { db } from "../server/db";
import { products, companies, invoices, invoiceItems } from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

async function recoverProductsFromHistory() {
    console.log("--- PRODUCT RECOVERY START ---");

    // 1. Get the target company (assuming the one with recent invoices)
    const targetCompanyId = 11; // George Test Company based on recent logs, but let's make it dynamic or safe
    // Ideally we ask user, but let's recover for ALL companies to be safe?
    // Let's stick to the active one if possible, or just scan all items.

    // Fetch all invoice items
    const allItems = await db.select({
        itemId: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        productId: invoiceItems.productId,
        description: invoiceItems.description, // original product name
        price: invoiceItems.unitPrice,
        quantity: invoiceItems.quantity,
        total: invoiceItems.lineTotal,
        companyId: invoices.companyId
    })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id));

    console.log(`Scanned ${allItems.length} invoice items.`);

    let recoveredCount = 0;

    for (const item of allItems) {
        // Check if product exists
        const existingProduct = await db.select().from(products).where(eq(products.id, item.productId));

        if (existingProduct.length === 0) {
            // Product ID does not exist in products table! RECOVERY NEEDED.
            // But wait, we can't insert with specific ID usually unless we force it.
            // Better to check if a product with SAME NAME exists for that company.

            const existingByName = await db.select().from(products).where(
                and(
                    eq(products.name, item.description || "Unknown Product"),
                    eq(products.companyId, item.companyId)
                )
            );

            if (existingByName.length === 0) {
                console.log(`Recovering: ${item.description} for Company ${item.companyId}`);

                await db.insert(products).values({
                    companyId: item.companyId,
                    name: item.description || "Recovered Product",
                    description: "Recovered from invoice history",
                    price: item.price.toString(),
                    stockLevel: "0", // Unknown
                    taxRate: "15.5", // Defaulting
                    productType: "good"
                });
                recoveredCount++;
            }
        }
    }

    console.log(`\n--- RECOVERY COMPLETE ---`);
    console.log(`Recovered ${recoveredCount} products.`);
    process.exit(0);
}

recoverProductsFromHistory();
