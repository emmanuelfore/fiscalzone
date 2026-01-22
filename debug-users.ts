
import { db } from "./server/db";
import { users, companies, companyUsers } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("--- Users ---");
    const allUsers = await db.select().from(users);
    allUsers.forEach(u => console.log(`${u.id}: ${u.email}`));

    console.log("\n--- Companies ---");
    const allCompanies = await db.select().from(companies);
    allCompanies.forEach(c => console.log(`${c.id}: ${c.name}`));

    console.log("\n--- Company Users ---");
    const allCompanyUsers = await db.select().from(companyUsers);
    allCompanyUsers.forEach(cu => console.log(`User ${cu.userId} -> Company ${cu.companyId}: ${cu.role}`));
}

main().catch(console.error).finally(() => process.exit());
