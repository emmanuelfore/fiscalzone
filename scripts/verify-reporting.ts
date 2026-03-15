import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { users, companies, invoices, invoiceItems, products } from "../shared/schema";
import { eq, count } from "drizzle-orm";

async function verifyReporting() {
    console.log("Starting Reporting Verification...");

    try {
        // 1. Get a company
        const [company] = await db.select().from(companies).limit(1);
        if (!company) {
            console.log("No company found. Cannot verify.");
            return;
        }
        console.log(`Using Company ID: ${company.id} (${company.name})`);

        // 2. Check Data Existence & Seed if Empty
        let invoiceCount = await db.select({ count: count(invoices.id) }).from(invoices).where(eq(invoices.companyId, company.id));
        let totalInvoices = invoiceCount[0]?.count || 0;
        console.log(`Total Invoices for Company: ${totalInvoices}`);

        if (totalInvoices === 0) {
            console.log("Seeding test data...");
            // Create Product
            const product = await storage.createProduct({
                companyId: company.id,
                name: "Test Product A",
                description: "Test",
                price: "10.00",
                currency: "USD",
                stockLevel: "100",
                minStockLevel: "10",
                category: "General",
                taxTypeId: 1, // Assuming ID 1 exists
                status: "active",
                localId: "TP001"
            } as any); // Type cast as necessary if strict

            // Get or Create Customer
            let [customer] = await storage.getCustomers(company.id);
            if (!customer) {
                customer = await storage.createCustomer({
                    companyId: company.id,
                    name: "Test Customer",
                    email: "test@example.com",
                    phoneNumber: "123456789",
                    address: "123 Test St",
                    vatNumber: "123456789",
                    status: "active"
                } as any);
            }

            // Create Invoice
            const invoice = await storage.createInvoice({
                companyId: company.id,
                customerId: customer.id, // Use valid customer ID
                items: [
                    { productId: product.id, quantity: 5, unitPrice: 10, lineTotal: 50, taxTotal: 0, discount: 0, description: "Test Item", taxRate: "0" }
                ],
                total: 50,
                subtotal: 50,
                taxTotal: 0,
                discountTotal: 0,
                taxAmount: 0,
                currency: "USD",
                status: "paid",
                paymentMethod: "cash",
                transactionType: "Sale",
                issueDate: new Date(),
                dueDate: new Date(),
                notes: "Test Invoice"
            } as any);
            console.log(`Created Test Invoice ID: ${invoice.id}`);
        }

        // 3. Define Date Range
        const startDate = new Date(0); // Beginning of time
        const endDate = new Date(); // Now
        endDate.setHours(23, 59, 59, 999);

        // 3. Test Sales by Category
        console.log("\n--- Sales by Category ---");
        const salesByCategory = await storage.getSalesByCategory(company.id, startDate, endDate);
        console.table(salesByCategory);

        // 4. Test Sales by User
        console.log("\n--- Sales by User ---");
        const salesByUser = await storage.getSalesByUser(company.id, startDate, endDate);
        console.table(salesByUser);

        // 5. Test Product Performance (ABC)
        console.log("\n--- Product Performance (ABC) ---");
        const productPerf = await storage.getProductPerformance(company.id, startDate, endDate);
        // Show top 5
        console.table(productPerf.slice(0, 5));

        // 6. Test PIN Functionality
        console.log("\n--- Testing PIN Functionality ---");
        const pin = "1234";
        await storage.setUserPin(company.userId, pin); // Assuming company has userId owner
        // Actually, companies table doesn't have userId directly, need to fetch owner
        const companyUsers = await storage.getCompanyUsers(company.id);
        const owner = companyUsers.find(u => u.role === 'owner');

        if (owner) {
            await storage.setUserPin(owner.id, pin);

            // Debugging
            const [debugUser] = await db.select().from(users).where(eq(users.id, owner.id));
            console.log(`Debug stored PIN: ${debugUser?.pin}`);

            // Manual Verify in script
            const [hashed, salt] = (debugUser?.pin || "").split(".");
            const { scrypt } = await import("crypto");
            const { promisify } = await import("util");
            const scryptAsync = promisify(scrypt);

            const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
            const computedHash = buf.toString("hex");
            console.log(`Salt: ${salt}`);
            console.log(`Computed Hash: ${computedHash}`);
            console.log(`Stored Hash:   ${hashed}`);
            console.log(`Match? ${computedHash === hashed}`);

            const isValid = await storage.verifyUserPin(owner.id, pin);
            console.log(`Storage Verify Result: ${isValid ? "SUCCESS" : "FAILED"}`);
        } else {
            console.log("No owner found to test PIN.");
        }

        console.log("\nVerification Complete!");
    } catch (error) {
        console.error("Verification Failed:", error);
    } finally {
        process.exit(0);
    }
}

verifyReporting();
