
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function runMigrationAndSeed() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Phase 1: Running migration...');
        const migrationSql = 'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;';
        await pool.query(migrationSql);
        console.log('✅ Column is_super_admin added or already exists.');

        console.log('🚀 Phase 2: Seeding Super Admin...');

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env");
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const db = drizzle(pool, { schema });
        const adminUser = {
            email: "admin@zimra.co.zw",
            password: "SuperAdminPassword123!",
            name: "System Super Admin",
        };

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

        console.log("\n✨ Success!");
        console.log("-----------------------------------");
        console.log(`Email: ${adminUser.email}`);
        console.log(`Password: ${adminUser.password}`);
        console.log("-----------------------------------");

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigrationAndSeed();
