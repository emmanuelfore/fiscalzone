
import { db } from "./server/db.js";
import { users, companyUsers, companies } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";

async function checkUsers() {
    let output = "";
    try {
        const allUsers = await db.select().from(users);
        output += "--- USERS ---\n";
        output += JSON.stringify(allUsers.map(u => ({ id: u.id, email: u.email, isSuperAdmin: u.isSuperAdmin })), null, 2) + "\n";

        for (const user of allUsers) {
            const roles = await db.select().from(companyUsers).where(eq(companyUsers.userId, user.id));
            output += `Roles for ${user.email}:\n`;
            output += JSON.stringify(roles.map(r => ({ companyId: r.companyId, role: r.role })), null, 2) + "\n";
        }

        const allCompanies = await db.select().from(companies);
        output += "--- COMPANIES ---\n";
        output += JSON.stringify(allCompanies.map(c => ({ id: c.id, name: c.name })), null, 2) + "\n";

    } catch (err) {
        output += "Error: " + err + "\n";
    } finally {
        fs.writeFileSync("db-check.log", output);
        process.exit(0);
    }
}

checkUsers();
