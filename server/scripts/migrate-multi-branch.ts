import "dotenv/config";
import { db } from "../db.js";
import { companies, branches, invoices, posShifts, payments, inventoryTransactions, expenses, stockTakes, restaurantSections, branchStocks, products } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

async function migrate() {
  console.log("Starting multi-branch migration...");

  const allCompanies = await db.select().from(companies);

  for (const company of allCompanies) {
    console.log(`Migrating company: ${company.name} (ID: ${company.id})`);

    // 1. Create default branch for each company using its current fiscal settings
    const [branch] = await db.insert(branches).values({
      companyId: company.id,
      name: company.branchName || "Main Branch",
      address: company.address,
      city: company.city,
      phone: company.phone,
      email: company.email,
      fdmsDeviceId: company.fdmsDeviceId,
      fdmsDeviceSerialNo: company.fdmsDeviceSerialNo,
      fdmsApiKey: company.fdmsApiKey,
      zimraPrivateKey: company.zimraPrivateKey,
      zimraCertificate: company.zimraCertificate,
      zimraEnvironment: company.zimraEnvironment as any,
      fiscalDayOpen: company.fiscalDayOpen ?? false,
      currentFiscalDayNo: company.currentFiscalDayNo ?? 0,
      fiscalDayOpenedAt: company.fiscalDayOpenedAt,
      lastFiscalDayStatus: company.lastFiscalDayStatus,
      lastReceiptGlobalNo: company.lastReceiptGlobalNo ?? 0,
      dailyReceiptCount: company.dailyReceiptCount ?? 0,
      lastFiscalHash: company.lastFiscalHash,
      lastReceiptAt: company.lastReceiptAt,
      qrUrl: company.qrUrl,
    }).returning();

    console.log(`  -> Created branch: ${branch.name} (ID: ${branch.id})`);

    // 2. Link all existing records to this branch
    console.log(`  -> Linking invoices...`);
    await db.update(invoices).set({ branchId: branch.id }).where(eq(invoices.companyId, company.id));
    
    console.log(`  -> Linking POS shifts...`);
    await db.update(posShifts).set({ branchId: branch.id }).where(eq(posShifts.companyId, company.id));
    
    console.log(`  -> Linking payments...`);
    await db.update(payments).set({ branchId: branch.id }).where(eq(payments.companyId, company.id));
    
    console.log(`  -> Linking inventory transactions...`);
    await db.update(inventoryTransactions).set({ branchId: branch.id }).where(eq(inventoryTransactions.companyId, company.id));
    
    console.log(`  -> Linking expenses...`);
    await db.update(expenses).set({ branchId: branch.id }).where(eq(expenses.companyId, company.id));
    
    console.log(`  -> Linking stock takes...`);
    await db.update(stockTakes).set({ branchId: branch.id }).where(eq(stockTakes.companyId, company.id));
    
    console.log(`  -> Linking restaurant sections...`);
    await db.update(restaurantSections).set({ branchId: branch.id }).where(eq(restaurantSections.companyId, company.id));

    // 3. Initialize branch_stocks from products table
    console.log(`  -> Initializing branch stocks...`);
    const companyProducts = await db.select().from(products).where(eq(products.companyId, company.id));
    if (companyProducts.length > 0) {
      for (const prod of companyProducts) {
        await db.insert(branchStocks).values({
          branchId: branch.id,
          productId: prod.id,
          stockLevel: prod.stockLevel || "0",
          lowStockThreshold: prod.lowStockThreshold || "10",
        }).onConflictDoNothing();
      }
    }
  }

  console.log("\nSuccess: Multi-branch migration completed!");
}

migrate()
  .catch((err) => {
    console.error("\nMigration failed:", err);
  })
  .finally(() => {
    process.exit();
  });
