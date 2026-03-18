
import "dotenv/config";
import { db } from "../server/db";
import { products, companies, invoices, invoiceItems } from "../shared/schema";
import { eq, count, desc } from "drizzle-orm";

async function diagnoseMissingData() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. List all companies
    const allCompanies = await db.select().from(companies);
    console.log(`\nFound ${allCompanies.length} Companies:`);
    allCompanies.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name} | TIN: ${c.tin}`);
    });

    // 2. Count products per company
    console.log("\n--- Product Counts per Company ---");
    for (const comp of allCompanies) {
        const prods = await db.select({ count: count() }).from(products).where(eq(products.companyId, comp.id));
        console.log(`Company ID ${comp.id} (${comp.name}): ${prods[0].count} products`);

        // List first 5 products as sample
        const sampleProds = await db.select().from(products).where(eq(products.companyId, comp.id)).limit(5);
        if (sampleProds.length > 0) {
            console.log("  Sample Products:");
            sampleProds.forEach(p => console.log(`    - [${p.id}] ${p.name} (${p.sku})`));
        }
    }

    // 3. Check Invoice Items for "Zombie" products (products sold in the past)
    console.log("\n--- Recent Transaction Items (Last 20) ---");
    const recentItems = await db.select({
        date: invoices.issueDate,
        invoice: invoices.invoiceNumber,
        productName: products.name,
        itemProductName: invoiceItems.description, // Fallback if product name missing?? No, schema might not have name on item
        lineTotal: invoiceItems.lineTotal
    })
        .from(invoiceItems)
        .leftJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
        .leftJoin(products, eq(invoiceItems.productId, products.id))
        .orderBy(desc(invoices.issueDate))
        .limit(20);

    recentItems.forEach(i => {
        console.log(`${i.date?.toISOString().split('T')[0]} | ${i.invoice} | Prod: ${i.productName || "DELETED PRODUCT"} | $${i.lineTotal}`);
    });

    console.log("\n--- DIAGNOSTIC END ---");
    process.exit(0);
}

diagnoseMissingData();
