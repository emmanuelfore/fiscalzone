import "dotenv/config";
import { db } from "./server/db.js";
import { companies } from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function check() {
  try {
    const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'`);
    console.log("Columns in 'companies':", result.rows.map(r => r.column_name));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
