
import { storage } from '../server/storage';

async function main() {
    try {
        const company = await storage.getCompany(1);
        console.log("Company ID: 1");
        console.log("Email Settings:", JSON.stringify(company?.emailSettings, null, 2));

        if (company?.emailSettings) {
            const settings = company.emailSettings as any;
            console.log("API Key present?", !!settings.apiKey);
            if (settings.apiKey) {
                console.log("API Key starts with:", settings.apiKey.substring(0, 4));
            }
        } else {
            console.log("No email settings found.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}

main();
