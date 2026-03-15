
import "dotenv/config";
import { db } from "./server/db";
import { products, invoiceItems, quotationItems, auditLogs, companies } from "./shared/schema";
import { ilike, sql, eq } from "drizzle-orm";

async function searchSpecific() {
    const searchTerm = "%Balancing%";
    console.log(`Searching for "${searchTerm}"...`);

    // 1. Products
    const foundProducts = await db.select({
        id: products.id,
        name: products.name,
        companyId: products.companyId,
        companyName: companies.name,
        isActive: products.isActive
    })
        .from(products)
        .leftJoin(companies, eq(products.companyId, companies.id))
        .where(ilike(products.name, searchTerm));

    console.log(`\n--- Products (${foundProducts.length}) ---`);
    console.table(foundProducts);

    // 2. Invoice Items
    const foundInvoiceItems = await db.select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        invoiceId: invoiceItems.invoiceId,
        companyId: companies.id,
        companyName: companies.name
    })
        .from(invoiceItems)
        // Join invoices to get company
        .innerJoin(sql`invoices`, eq(invoiceItems.invoiceId, sql`invoices.id`))
        .innerJoin(companies, eq(sql`invoices.company_id`, companies.id))
        .where(ilike(invoiceItems.description, searchTerm));

    console.log(`\n--- Invoice Items (${foundInvoiceItems.length}) ---`);
    console.table(foundInvoiceItems);

    // 3. Quotation Items
    const foundQuoteItems = await db.select({
        id: quotationItems.id,
        description: quotationItems.description,
        quotationId: quotationItems.quotationId
    })
        .from(quotationItems)
        .where(ilike(quotationItems.description, searchTerm));

    console.log(`\n--- Quotation Items (${foundQuoteItems.length}) ---`);
    console.table(foundQuoteItems);

    // 4. Audit Logs
    const foundLogs = await db.select({
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt
    })
        .from(auditLogs)
        .where(sql`CAST(${auditLogs.details} AS TEXT) ILIKE ${searchTerm}`);

    console.log(`\n--- Audit Logs (${foundLogs.length}) ---`);
    foundLogs.forEach(l => {
        console.log(`${l.createdAt} - ${l.action} - ${JSON.stringify(l.details)}`);
    });

    process.exit(0);
}

searchSpecific();
