
import "dotenv/config";
import { seedCompanyDefaults } from "./server/lib/seeding";
import { db } from "./server/db";

async function restore() {
    console.log("Starting restoration for Company 3...");
    try {
        await seedCompanyDefaults(3);
        console.log("Restoration complete.");
    } catch (error) {
        console.error("Restoration failed:", error);
    }
    process.exit(0);
}

restore();
