import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const res = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'invoices' AND (column_name = 'order_status' OR column_name = 'order_number');
  `);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
