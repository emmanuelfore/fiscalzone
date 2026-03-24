
import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { products, companies } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
    const args = process.argv.slice(2);
    const companyId = parseInt(args[0]);
    const force = args.includes("--force");

    if (isNaN(companyId)) {
        console.error("Usage: npx tsx scripts/delete-company-products.ts <companyId> [--force]");
        process.exit(1);
    }

    // 1. Check company exists
    const company = await storage.getCompany(companyId);
    if (!company) {
        console.error(`Error: Company with ID ${companyId} not found.`);
        process.exit(1);
    }

    console.log(`--- PRODUCT CLEANUP FOR: ${company.name} (ID: ${companyId}) ---`);

    // 2. Initial Count
    const allProducts = await db.select().from(products).where(eq(products.companyId, companyId));
    const nonTestProducts = allProducts.filter(p => !p.name.toLowerCase().includes("test"));
    const testProducts = allProducts.filter(p => p.name.toLowerCase().includes("test"));

    console.log(`Total Products for Company: ${allProducts.length}`);
    console.log(`- Non-test Products to delete: ${nonTestProducts.length}`);
    console.log(`- Test Products to keep: ${testProducts.length}`);

    if (nonTestProducts.length === 0) {
        console.log("No non-test products found to delete.");
        process.exit(0);
    }

    if (!force) {
        console.log("\n⚠️  DRY RUN: No data will be deleted.");
        console.log("To perform actual deletion, run with the --force flag.");
        process.exit(0);
    }

    console.log("\n🚀 DELETING PRODUCTS...");
    try {
        await storage.deleteCompanyProducts(companyId);
        console.log("✅ Successfully deleted non-test products and related data.");
    } catch (error: any) {
        console.error("❌ Deletion failed:");
        console.error("  Message:", error.message);
        if (error.code) console.error("  Code:", error.code);
        if (error.detail) console.error("  Detail:", error.detail);
        if (error.hint) console.error("  Hint:", error.hint);
        if (error.constraint) console.error("  Constraint:", error.constraint);
        if (error.stack) console.error("  Stack Trace:", error.stack);
        process.exit(1);
    }

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
