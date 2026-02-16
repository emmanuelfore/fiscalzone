
import "dotenv/config";
import { db } from "./server/db";
import { products, taxTypes } from "./shared/schema";
import { eq, and } from "drizzle-orm";
import * as fs from 'fs';

async function restoreProducts() {
    console.log("--- STARTING RESTORATION FROM LOGS ---");
    const companyId = 3;

    try {
        const raw = fs.readFileSync('company-3-products-from-logs.json', 'utf-8');
        const itemsToRestore = JSON.parse(raw);

        if (!Array.isArray(itemsToRestore) || itemsToRestore.length === 0) {
            console.log("No items to restore found in JSON file.");
            process.exit(0);
        }

        console.log(`Found ${itemsToRestore.length} items to restore.`);

        // Get Tax Types to map tax rate to ID
        // Assuming 15.5 is standard VAT, we need to find the tax type ID for it for this company
        // If not found, we might default or try to find by rate.
        const companyTaxTypes = await db.select().from(taxTypes).where(eq(taxTypes.companyId, companyId));

        // Helper to find tax type
        const findTaxTypeId = (rate: number) => {
            // Try to find exact match
            const match = companyTaxTypes.find(t => parseFloat(t.rate) === rate);
            if (match) return match.id;

            // Fallback: try to find by common codes just in case rate slightly off? 
            // 15.5 usually maps to VAT
            if (rate === 15.5 || rate === 15.0) {
                const vat = companyTaxTypes.find(t => t.code === 'VAT' || t.zimraCode === 'V');
                if (vat) return vat.id;
            }
            return null;
        };

        let restoredCount = 0;
        let skippedCount = 0;

        for (const item of itemsToRestore) {
            // Check existence
            const existing = await db.select().from(products).where(
                and(
                    eq(products.companyId, companyId),
                    eq(products.name, item.name)
                )
            );

            if (existing.length > 0) {
                console.log(`Skipping existing product: ${item.name}`);
                skippedCount++;
                continue;
            }

            console.log(`Restoring: ${item.name}`);

            await db.insert(products).values({
                companyId: companyId,
                name: item.name,
                description: "Restored from ZIMRA logs",
                sku: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Generate unique SKU
                price: item.price.toString(),
                taxRate: item.taxRate.toString(),
                hsCode: item.hsCode,
                productType: item.productType || 'good',
                taxTypeId: findTaxTypeId(item.taxRate),
                isActive: true,
                stockLevel: "0"
            });
            restoredCount++;
        }

        console.log(`\n--- DONE ---`);
        console.log(`Restored: ${restoredCount}`);
        console.log(`Skipped: ${skippedCount}`);

    } catch (err) {
        console.error("Restoration Failed:", err);
    }
    process.exit(0);
}

restoreProducts();
