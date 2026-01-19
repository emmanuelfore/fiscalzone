
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env to seed auth users.");
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Database connection
const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool, { schema });

async function seed() {
    console.log("🌱 Starting seed...");

    const testUser = {
        email: "demo@zimra.com",
        password: "Password123!",
        name: "Demo User",
    };

    try {
        // 1. Create Auth User in Supabase
        console.log(`Creating auth user: ${testUser.email}...`);

        // Check if user exists first to avoid error
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let userId = existingUsers.users.find(u => u.email === testUser.email)?.id;

        if (!userId) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: testUser.email,
                password: testUser.password,
                email_confirm: true, // Auto confirm
                user_metadata: { name: testUser.name },
            });

            if (error) throw error;
            userId = data.user.id;
            console.log("✅ Auth user created.");
        } else {
            console.log("ℹ️ Auth user already exists.");
        }

        // 2. Sync to public.users table
        console.log("Syncing to local database...");

        const [existingDbUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        if (!existingDbUser) {
            await db.insert(schema.users).values({
                id: userId,
                email: testUser.email,
                name: testUser.name,
            });
            console.log("✅ Public user record created.");
        } else {
            console.log("ℹ️ Public user record already exists.");
        }

        // 3. Create Company
        console.log("Creating test company...");

        // Check if company exists for this user
        // We need to join manually or check by querying companyUsers first, but let's just insert if not exists
        // Simplification: Check if any company exists for this user ID in companyUsers

        const userCompanies = await db
            .select()
            .from(schema.companyUsers)
            .where(eq(schema.companyUsers.userId, userId));

        let companyId: number;

        if (userCompanies.length === 0) {
            const [newCompany] = await db.insert(schema.companies).values({
                name: "Demo Enterprises Pvt Ltd",
                tin: "2000200020",
                address: "123 Samora Machel Ave",
                city: "Harare",
                phone: "+263 777 000 000",
                email: "billing@demo.com",
                country: "Zimbabwe",
            }).returning();

            companyId = newCompany.id;

            await db.insert(schema.companyUsers).values({
                userId: userId,
                companyId: newCompany.id,
                role: "owner",
            });
            console.log("✅ Company created.");
        } else {
            companyId = userCompanies[0].companyId;
            console.log("ℹ️ Company already exists.");
        }

        // 4. Create dummy customers and products
        console.log("Seeding customers and products...");

        const [customer] = await db.insert(schema.customers).values({
            companyId,
            name: "Test Client A",
            email: "client@test.com",
            city: "Bulawayo",
            tin: "100100100",
        }).returning();

        const [product] = await db.insert(schema.products).values({
            companyId,
            name: "Consulting Service",
            price: "150.00",
            taxRate: "15.00",
        }).returning();

        // 5. Create an invoice
        await db.insert(schema.invoices).values({
            companyId,
            customerId: customer.id,
            invoiceNumber: "INV-001",
            issueDate: new Date(),
            dueDate: new Date(),
            subtotal: "150.00",
            taxAmount: "22.50",
            total: "172.50",
            status: "draft",
        });

        // 6. Extended Seeding: Customers, Products, Services
        console.log("🌱 performing extended seeding (Customers, Products, Services)...");

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

        // Seed Customers
        for (const cust of SAMPLE_CUSTOMERS) {
            const existing = await db.query.customers.findFirst({
                where: (c, { eq, and }) => and(eq(c.companyId, companyId), eq(c.name, cust.name))
            });
            if (!existing) {
                await db.insert(schema.customers).values({ ...cust, companyId });
                console.log(`   + Added customer: ${cust.name}`);
            }
        }

        // Seed Products & Services
        for (const item of [...SAMPLE_PRODUCTS, ...SAMPLE_SERVICES]) {
            const existing = await db.query.products.findFirst({
                where: (p, { eq, and }) => and(eq(p.companyId, companyId), eq(p.sku, item.sku))
            });
            if (!existing) {
                await db.insert(schema.products).values({ ...item, companyId });
                console.log(`   + Added item: ${item.name}`);
            }
        }

        console.log("✅ Seeding complete!");
        console.log(`\nLogin with:\nEmail: ${testUser.email}\nPassword: ${testUser.password}`);

    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        process.exit(0);
    }
}

seed();
