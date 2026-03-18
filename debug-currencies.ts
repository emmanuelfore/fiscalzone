
import { db } from "./server/db";
import { currencies, companies } from "./shared/schema";
import { eq } from "drizzle-orm";

async function check() {
    try {
        const allCompanies = await db.select().from(companies);
        console.log(`Found ${allCompanies.length} companies.`);

        for (const company of allCompanies) {
            const companyCurrencies = await db.select().from(currencies).where(eq(currencies.companyId, company.id));
            console.log(`\nCompany ID ${company.id} (${company.name}):`);
            console.log(JSON.stringify(companyCurrencies, null, 2));
        }
    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}

check();
