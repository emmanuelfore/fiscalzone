
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env");
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

async function seedSuperAdmin() {
    console.log("🚀 Starting Super Admin seed...");

    const adminUser = {
        email: "admin@zimra.co.zw",
        password: "SuperAdminPassword123!",
        name: "System Super Admin",
    };

    try {
        // 1. Create/Get Auth User in Supabase
        console.log(`Checking/Creating auth user: ${adminUser.email}...`);

        const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        let userId = authUsers.find(u => u.email === adminUser.email)?.id;

        if (!userId) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: adminUser.email,
                password: adminUser.password,
                email_confirm: true,
                user_metadata: { name: adminUser.name },
            });

            if (error) throw error;
            userId = data.user.id;
            console.log("✅ Auth user created.");
        } else {
            console.log("ℹ️ Auth user already exists.");
        }

        // 2. Sync and Promote in local database
        console.log("Promoting to Super Admin in local database...");

        const [existingDbUser] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        if (!existingDbUser) {
            await db.insert(schema.users).values({
                id: userId,
                email: adminUser.email,
                name: adminUser.name,
                isSuperAdmin: true,
            });
            console.log("✅ Created and promoted to Super Admin.");
        } else {
            await db.update(schema.users)
                .set({ isSuperAdmin: true })
                .where(eq(schema.users.id, userId));
            console.log("✅ Existing user promoted to Super Admin.");
        }

        console.log("\n✨ Super Admin seeding successful!");
        console.log("-----------------------------------");
        console.log(`Email: ${adminUser.email}`);
        console.log(`Password: ${adminUser.password}`);
        console.log("-----------------------------------");

    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seedSuperAdmin();
