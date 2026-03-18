
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL!;
const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema });

async function verify() {
    try {
        const customers = await db.select().from(schema.customers);
        const products = await db.select().from(schema.products);

        const goods = products.filter(p => p.productType === 'good');
        const services = products.filter(p => p.productType === 'service');

        console.log("--- SEED VERIFICATION ---");
        console.log(`Customers: ${customers.length}`);
        console.log(`Products (Goods): ${goods.length}`);
        console.log(`Services: ${services.length}`);
        console.log("-------------------------");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

verify();
