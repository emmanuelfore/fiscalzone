
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

// Database connection
const connectionString = process.env.SUPABASE_DB_URL!;
const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema });

const SAMPLE_CUSTOMERS = [
    {
        name: "Acme Corp Zimbabwe",
        email: "accounts@acme.co.zw",
        phone: "+263 242 123456",
        address: "1 Granite Street, Msasa, Harare",
        city: "Harare",
        tin: "2000100010",
        vatNumber: "100555",
        customerType: "business"
    },
    {
        name: "Fresh Foods Pvt Ltd",
        email: "orders@freshfoods.co.zw",
        phone: "+263 772 111 222",
        address: "Stand 44, Vegetable Market",
        city: "Bulawayo",
        tin: "2000888999",
        vatNumber: "100777",
        customerType: "business"
    },
    {
        name: "John Doe",
        email: "john.doe@gmail.com",
        phone: "+263 773 555 123",
        address: "12 Acacia Avenue, Avondale",
        city: "Harare",
        customerType: "individual"
    },
    {
        name: "Tech Solutions Ltd",
        email: "info@techsolutions.yo",
        phone: "+263 8677 123456",
        address: "5th Floor, Joina City",
        city: "Harare",
        tin: "2000555666",
        vatNumber: "100999",
        customerType: "business"
    },
    {
        name: "Sarah Smith",
        email: "sarah.smith@yahoo.com",
        phone: "+263 712 987 654",
        city: "Mutare",
        customerType: "individual"
    }
];

const SAMPLE_PRODUCTS = [
    {
        name: "HP Laptop 15-inch",
        description: "Intel i5, 8GB RAM, 256GB SSD",
        sku: "HW-LAP-001",
        price: "650.00",
        costPrice: "500.00",
        taxRate: "15.00",
        productType: "good",
        stockLevel: "50",
        isTracked: true,
        hsCode: "8471.30"
    },
    {
        name: "Wireless Mouse",
        description: "Logitech Wireless Mouse M185",
        sku: "HW-ACC-002",
        price: "25.00",
        costPrice: "15.00",
        taxRate: "15.00",
        productType: "good",
        stockLevel: "100",
        isTracked: true,
        hsCode: "8471.60"
    },
    {
        name: "A4 Paper Ream",
        description: "Typek A4 Bond Paper Box (5 Reams)",
        sku: "STAT-PAP-001",
        price: "35.00",
        costPrice: "28.00",
        taxRate: "15.00",
        productType: "good",
        stockLevel: "200",
        isTracked: true,
        hsCode: "4802.56"
    },
    {
        name: "Solar Panel 400W",
        description: "Monocrystalline Solar Panel",
        sku: "NRG-SOL-400",
        price: "180.00",
        costPrice: "130.00",
        taxRate: "15.00",
        productType: "good",
        stockLevel: "20",
        isTracked: true,
        hsCode: "8541.40"
    },
    {
        name: "Inverter 5kVA",
        description: "Hybrid Solar Inverter 48V",
        sku: "NRG-INV-005",
        price: "850.00",
        costPrice: "600.00",
        taxRate: "15.00",
        productType: "good",
        stockLevel: "10",
        isTracked: true,
        hsCode: "8504.40"
    }
];

const SAMPLE_SERVICES = [
    {
        name: "IT Consultation",
        description: "Hourly consulting rate for IT support",
        sku: "SVC-IT-001",
        price: "50.00",
        taxRate: "15.00",
        productType: "service"
    },
    {
        name: "Software Installation",
        description: "Basic software setup and configuration",
        sku: "SVC-IT-002",
        price: "30.00",
        taxRate: "15.00",
        productType: "service"
    },
    {
        name: "Delivery Fee - Harare",
        description: "Standard delivery within Harare",
        sku: "SVC-DEL-HRE",
        price: "10.00",
        taxRate: "15.00",
        productType: "service"
    },
    {
        name: "Annual Maintenance Contract",
        description: "Yearly support and maintenance fee",
        sku: "SVC-AMC-001",
        price: "1200.00",
        taxRate: "15.00",
        productType: "service"
    }
];

async function seedData() {
    console.log("🌱 Starting data seed...");

    try {
        // 1. Get the Demo Company
        // We assume the company created in standard seed exists, or we pick the first one
        const companies = await db.select().from(schema.companies).limit(1);

        if (companies.length === 0) {
            console.error("❌ No companies found. Please run valid setup first.");
            process.exit(1);
        }

        const companyId = companies[0].id;
        console.log(`Checking data for Company: ${companies[0].name} (ID: ${companyId})`);

        // 2. Seed Customers
        console.log("... Seeding customers");
        for (const cust of SAMPLE_CUSTOMERS) {
            // Check existence by name (simple check)
            const existing = await db.query.customers.findFirst({
                where: (c, { eq, and }) => and(eq(c.companyId, companyId), eq(c.name, cust.name))
            });

            if (!existing) {
                await db.insert(schema.customers).values({
                    ...cust,
                    companyId
                });
                console.log(`   + Added customer: ${cust.name}`);
            } else {
                console.log(`   . Skipped existing customer: ${cust.name}`);
            }
        }

        // 3. Seed Products
        console.log("... Seeding products");
        for (const prod of SAMPLE_PRODUCTS) {
            const existing = await db.query.products.findFirst({
                where: (p, { eq, and }) => and(eq(p.companyId, companyId), eq(p.sku, prod.sku))
            });

            if (!existing) {
                await db.insert(schema.products).values({
                    ...prod,
                    companyId
                });
                console.log(`   + Added product: ${prod.name}`);
            } else {
                console.log(`   . Skipped existing product: ${prod.name}`);
            }
        }

        // 4. Seed Services
        console.log("... Seeding services");
        for (const svc of SAMPLE_SERVICES) {
            const existing = await db.query.products.findFirst({
                where: (p, { eq, and }) => and(eq(p.companyId, companyId), eq(p.sku, svc.sku))
            });

            if (!existing) {
                await db.insert(schema.products).values({
                    ...svc,
                    companyId
                });
                console.log(`   + Added service: ${svc.name}`);
            } else {
                console.log(`   . Skipped existing service: ${svc.name}`);
            }
        }

        console.log("✅ Data seeding complete!");

    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        process.exit(0);
    }
}

seedData();
