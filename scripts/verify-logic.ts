
import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { companies, invoices, invoiceItems } from "@shared/schema";
import { eq } from "drizzle-orm";

async function verifyLogic() {
    console.log("🧪 Starting Logic Verification for Fiscal Counters...");

    try {
        const companyId = 1;
        const testFiscalDayNo = 999; // Use a high number to avoid conflict

        // 1. Cleanup previous test data
        console.log("🧹 Cleaning up old test data...");
        await db.delete(invoiceItems).where(eq(invoiceItems.id, -1)); // Not easily actionable without cascade, let's just insert new unique stuff
        // Or just filter by our specific fiscal day number which won't exist normally.

        // 2. Create Test Invoice 1: Standard Tax (15%)
        console.log("📝 Creating Test Invoice 1 (Standard Tax)...");
        const inv1 = await storage.createInvoice({
            companyId,
            customerId: 1, // Ensure customer 1 exists or create one? Assuming seeded.
            invoiceNumber: "TEST-INV-001",
            currency: "USD",
            issueDate: new Date(),
            dueDate: new Date(),
            status: "issued",
            items: [
                { description: "Item 1", quantity: "1", unitPrice: "100", lineTotal: "100", taxRate: "15" }
            ],
            subtotal: "100",
            taxAmount: "15",
            total: "115"
        });

        // Manually update fiscal info that isn't set by createInvoice default
        await storage.updateInvoice(inv1.id, {
            fiscalDayNo: testFiscalDayNo,
            paymentMethod: "CASH",
            status: "issued", // Ensure it's issued
            total: "115" // 100 + 15
        });

        // 3. Create Test Invoice 2: Zero Tax (0%)
        console.log("📝 Creating Test Invoice 2 (Zero Tax)...");
        const inv2 = await storage.createInvoice({
            companyId,
            customerId: 1,
            invoiceNumber: "TEST-INV-002",
            currency: "USD",
            issueDate: new Date(),
            dueDate: new Date(),
            status: "issued",
            items: [
                { description: "Item 2", quantity: "2", unitPrice: "50", lineTotal: "100", taxRate: "0" }
            ],
            subtotal: "100",
            taxAmount: "0",
            total: "100"
        });

        await storage.updateInvoice(inv2.id, {
            fiscalDayNo: testFiscalDayNo,
            paymentMethod: "CARD",
            status: "issued",
            total: "100" // 100 + 0
        });

        // 4. Run Calculation
        console.log(`🧮 Calculating Fiscal Counters for Day ${testFiscalDayNo}...`);
        const counters = await storage.calculateFiscalCounters(companyId, testFiscalDayNo);

        console.log("\n📊 Results:");
        console.log(JSON.stringify(counters, null, 2));

        // 5. Verify Expectations
        console.log("\n🔍 Verification:");

        // Check Tax Counters
        const standardTax = counters.find(c => c.fiscalCounterType === "SaleByTax" && c.fiscalCounterTaxPercent === 15);
        const zeroTax = counters.find(c => c.fiscalCounterType === "SaleByTax" && c.fiscalCounterTaxPercent === 0);

        let passed = true;

        if (standardTax?.fiscalCounterValue === 100) {
            console.log("✅ Standard Tax Base: Correct (100)");
        } else {
            console.log(`❌ Standard Tax Base: Failed (Expected 100, Got ${standardTax?.fiscalCounterValue})`);
            passed = false;
        }

        if (zeroTax?.fiscalCounterValue === 100) { // 2 * 50
            console.log("✅ Zero Tax Base: Correct (100)");
        } else {
            console.log(`❌ Zero Tax Base: Failed (Expected 100, Got ${zeroTax?.fiscalCounterValue})`);
            passed = false;
        }

        // Check Payment Counters
        const cash = counters.find(c => c.fiscalCounterType === "Balance" && c.fiscalCounterMoneyType === "CASH");
        const card = counters.find(c => c.fiscalCounterType === "Balance" && c.fiscalCounterMoneyType === "CARD");

        if (cash?.fiscalCounterValue === 115) {
            console.log("✅ Payment CASH: Correct (115)");
        } else {
            console.log(`❌ Payment CASH: Failed (Expected 115, Got ${cash?.fiscalCounterValue})`);
            passed = false;
        }

        if (card?.fiscalCounterValue === 100) {
            console.log("✅ Payment CARD: Correct (100)");
        } else {
            console.log(`❌ Payment CARD: Failed (Expected 100, Got ${card?.fiscalCounterValue})`);
            passed = false;
        }

        if (passed) {
            console.log("\n✨ SUCCESS: All fiscal logic checks passed!");
        } else {
            console.log("\n💀 FAILURE: Logic verification failed.");
            process.exit(1);
        }

        // Cleanup
        console.log("🧹 cleaning up...");
        await storage.deleteInvoice(inv1.id);
        await storage.deleteInvoice(inv2.id);

    } catch (err) {
        console.error("💥 Verify Error:", err);
        process.exit(1);
    }
}

verifyLogic();
