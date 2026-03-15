
import { db } from "./server/db";
import { companies } from "./shared/schema";
import { ilike } from "drizzle-orm";

async function findCompany() {
    try {
        const result = await db.select().from(companies).where(ilike(companies.name, "%LIPVIEW%"));
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

findCompany();
