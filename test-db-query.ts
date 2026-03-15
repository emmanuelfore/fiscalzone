import { db } from "./server/db";
import { companies } from "./shared/schema";

async function test() {
  try {
    const result = await db.select().from(companies).limit(1);
    console.log("SUCCESS:", result);
  } catch (e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}

test();
