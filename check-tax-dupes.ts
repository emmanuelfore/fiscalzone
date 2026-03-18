
import { db } from "./server/db";
import { taxTypes } from "./shared/schema";
import { sql } from "drizzle-orm";

async function checkTaxDuplicates() {
    try {
        console.log("Checking for duplicate tax types...");
        const result = await db.execute(sql`
            SELECT company_id, code, COUNT(*) 
            FROM tax_types 
            GROUP BY company_id, code 
            HAVING COUNT(*) > 1
        `);

        console.log("Duplicate Tax Types Found:", result.rows);

        if (result.rows.length > 0) {
            console.log("\nDetails of duplicates:");
            for (const row of result.rows) {
                const details = await db.execute(sql`
                    SELECT * FROM tax_types 
                    WHERE company_id = ${row.company_id} AND code = ${row.code}
                `);
                console.log(details.rows);
            }
        } else {
            console.log("No duplicates found. The constraint should apply cleanly.");
        }
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkTaxDuplicates();
