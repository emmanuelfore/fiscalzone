
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
    try {
        console.log("Starting migration for missing tables...");

        // 1. suppliers
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "suppliers" (
                "id" serial PRIMARY KEY,
                "company_id" integer NOT NULL REFERENCES "companies"("id"),
                "name" text NOT NULL,
                "contact_person" text,
                "email" text,
                "phone" text,
                "address" text,
                "tin" text,
                "vat_number" text,
                "is_active" boolean DEFAULT true,
                "created_at" timestamp DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers" ("company_id");
        `);
        console.log("[DONE] Created table 'suppliers'");

        // 2. inventory_transactions
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "inventory_transactions" (
                "id" serial PRIMARY KEY,
                "company_id" integer NOT NULL REFERENCES "companies"("id"),
                "product_id" integer NOT NULL REFERENCES "products"("id"),
                "supplier_id" integer REFERENCES "suppliers"("id"),
                "type" text NOT NULL,
                "quantity" decimal(10, 2) NOT NULL,
                "unit_cost" decimal(10, 2),
                "total_cost" decimal(10, 2),
                "reference_type" text,
                "reference_id" text,
                "remaining_quantity" decimal(10, 2),
                "batch_number" text,
                "expiry_date" timestamp,
                "notes" text,
                "created_at" timestamp DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS "inv_trans_company_id_idx" ON "inventory_transactions" ("company_id");
            CREATE INDEX IF NOT EXISTS "inv_trans_product_id_idx" ON "inventory_transactions" ("product_id");
        `);
        console.log("[DONE] Created table 'inventory_transactions'");

        // 3. expenses
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "expenses" (
                "id" serial PRIMARY KEY,
                "company_id" integer NOT NULL REFERENCES "companies"("id"),
                "supplier_id" integer REFERENCES "suppliers"("id"),
                "category" text NOT NULL,
                "description" text NOT NULL,
                "amount" decimal(10, 2) NOT NULL,
                "currency" text DEFAULT 'USD' NOT NULL,
                "expense_date" timestamp DEFAULT now() NOT NULL,
                "payment_method" text,
                "reference" text,
                "status" text DEFAULT 'paid',
                "attachment_url" text,
                "notes" text,
                "created_at" timestamp DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS "expenses_company_id_idx" ON "expenses" ("company_id");
        `);
        console.log("[DONE] Created table 'expenses'");

        console.log("Migration completed successfully.");
    } catch (err: any) {
        console.error("MIGRATION ERROR:", err.message);
        process.exit(1);
    }
}

migrate().then(() => process.exit(0));
