import { db } from "../db";
import { inventoryTransactions, products, companies } from "@shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export async function calculateCOGS(
    productId: number,
    quantitySold: number,
    companyId: number
) {
    // 1. Get company valuation method
    const [company] = await db
        .select({ method: companies.inventoryValuationMethod })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

    const method = company?.method || "FIFO";

    if (method === "WAC") {
        return calculateWAC(productId, quantitySold, companyId);
    } else if (method === "LIFO") {
        return calculateFIFO_LIFO(productId, quantitySold, companyId, "LIFO");
    } else {
        return calculateFIFO_LIFO(productId, quantitySold, companyId, "FIFO");
    }
}

async function calculateWAC(productId: number, quantitySold: number, companyId: number) {
    // Weighted Average Cost = Total Cost of Available Stock / Total Quantity of Available Stock
    const result = await db
        .select({
            totalQuantity: sql<number>`SUM(remaining_quantity)`,
            totalCost: sql<number>`SUM(remaining_quantity * unit_cost)`,
        })
        .from(inventoryTransactions)
        .where(
            and(
                eq(inventoryTransactions.productId, productId),
                eq(inventoryTransactions.companyId, companyId),
                sql`remaining_quantity > 0`
            )
        );

    const { totalQuantity, totalCost } = result[0];

    if (!totalQuantity || totalQuantity <= 0) return 0;

    const avgCost = totalCost / totalQuantity;
    const cogsAmount = avgCost * quantitySold;

    // Update remaining quantities (WAC reduces all proportionaly or we just take from the oldest)
    // Standard WAC implementation often just reduces from available batches until quantity is met
    // but keeps the cost constant.
    await reduceStock(productId, quantitySold, companyId, "FIFO");

    return cogsAmount;
}

async function calculateFIFO_LIFO(
    productId: number,
    quantitySold: number,
    companyId: number,
    method: "FIFO" | "LIFO"
) {
    const order = method === "FIFO" ? asc : desc;

    const batches = await db
        .select()
        .from(inventoryTransactions)
        .where(
            and(
                eq(inventoryTransactions.productId, productId),
                eq(inventoryTransactions.companyId, companyId),
                sql`remaining_quantity > 0`
            )
        )
        .orderBy(order(inventoryTransactions.createdAt));

    let remainingToSell = quantitySold;
    let totalCOGS = 0;

    for (const batch of batches) {
        if (remainingToSell <= 0) break;

        const availableInBatch = Number(batch.remainingQuantity);
        const takeFromBatch = Math.min(availableInBatch, remainingToSell);

        totalCOGS += takeFromBatch * Number(batch.unitCost);
        remainingToSell -= takeFromBatch;

        // Update batch remaining quantity
        await db
            .update(inventoryTransactions)
            .set({
                remainingQuantity: (availableInBatch - takeFromBatch).toString(),
            })
            .where(eq(inventoryTransactions.id, batch.id));
    }

    return totalCOGS;
}

async function reduceStock(
    productId: number,
    quantity: number,
    companyId: number,
    orderMethod: "FIFO" | "LIFO"
) {
    // This helper is used by WAC to reduce physical remaining quantities
    const order = orderMethod === "FIFO" ? asc : desc;
    const batches = await db
        .select()
        .from(inventoryTransactions)
        .where(
            and(
                eq(inventoryTransactions.productId, productId),
                eq(inventoryTransactions.companyId, companyId),
                sql`remaining_quantity > 0`
            )
        )
        .orderBy(order(inventoryTransactions.createdAt));

    let remainingToReduce = quantity;
    for (const batch of batches) {
        if (remainingToReduce <= 0) break;
        const available = Number(batch.remainingQuantity);
        const take = Math.min(available, remainingToReduce);
        await db
            .update(inventoryTransactions)
            .set({ remainingQuantity: (available - take).toString() })
            .where(eq(inventoryTransactions.id, batch.id));
        remainingToReduce -= take;
    }
}

export async function recordStockIn(
    productId: number,
    quantity: number,
    unitCost: number,
    companyId: number,
    supplierId?: number,
    notes?: string
) {
    // 1. Record the transaction
    await db.insert(inventoryTransactions).values({
        companyId,
        productId,
        supplierId: supplierId || null,
        type: "STOCK_IN",
        quantity: quantity.toString(),
        unitCost: unitCost.toString(),
        totalCost: (quantity * unitCost).toString(),
        referenceType: "GRN",
        remainingQuantity: quantity.toString(),
        notes,
    });

    // 2. Update product stock level
    await db
        .update(products)
        .set({
            stockLevel: sql`stock_level + ${quantity}`,
            costPrice: unitCost.toString(), // Update latest cost price
        })
        .where(eq(products.id, productId));
}

export async function recordBatchStockIn(
    companyId: number,
    items: { productId: number; quantity: number | string; unitCost: number | string }[],
    supplierId?: number,
    notes?: string
) {
    // Wrap in a transaction to ensure all or nothing
    await db.transaction(async (tx) => {
        for (const item of items) {
            const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
            const unitCost = typeof item.unitCost === 'string' ? parseFloat(item.unitCost) : item.unitCost;

            // 1. Record the transaction
            await tx.insert(inventoryTransactions).values({
                companyId,
                productId: item.productId,
                supplierId: supplierId || null,
                type: "STOCK_IN",
                quantity: quantity.toString(),
                unitCost: unitCost.toString(),
                totalCost: (quantity * unitCost).toString(),
                referenceType: "GRN",
                remainingQuantity: quantity.toString(),
                notes: notes || "Batch GRN",
            });

            // 2. Update product stock level
            await tx
                .update(products)
                .set({
                    stockLevel: sql`stock_level + ${quantity}`,
                    costPrice: unitCost.toString(),
                })
                .where(eq(products.id, item.productId));
        }
    });
}
