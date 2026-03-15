
import "dotenv/config";
import { db } from "./server/db";
import { zimraLogs } from "./shared/schema";
import { eq, desc } from "drizzle-orm";

async function findAllProductsFromLogs() {
    const companyId = 3;
    console.log(`Scanning ZIMRA Logs for ALL products for Company ${companyId}...`);

    const logs = await db.select().from(zimraLogs)
        .where(eq(zimraLogs.companyId, companyId));

    console.log(`Found ${logs.length} total transaction logs.`);

    const productMap = new Map<string, any>();

    logs.forEach(log => {
        const payload = log.requestPayload as any;
        let receiptObj = Array.isArray(payload) ? payload[0] : payload;

        // Handle different payload structures if necessary
        // Inspecting structure based on previous findings: root -> receipt -> recipientLines

        if (receiptObj?.receipt?.receiptLines) {
            receiptObj.receipt.receiptLines.forEach((l: any) => {
                const name = l.receiptLineName;
                if (name && !productMap.has(name)) {
                    productMap.set(name, {
                        name: name,
                        price: l.receiptLinePrice,
                        taxRate: l.taxPercent,
                        hsCode: l.receiptLineHSCode || "0000.00.00",
                        productType: "good" // default, though "Service" might be inferred if no stock?
                    });
                }
            });
        }
    });


    const fs = await import('fs');
    const products = Array.from(productMap.values());

    if (products.length > 0) {
        const output = JSON.stringify(products, null, 2);
        fs.writeFileSync('company-3-products-from-logs.json', output);
        console.log(`Written ${products.length} products to company-3-products-from-logs.json`);
    } else {
        console.log("No products found in logs.");
        fs.writeFileSync('company-3-products-from-logs.json', "[]");
    }

    process.exit(0);
}

findAllProductsFromLogs();
