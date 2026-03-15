
import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testPin() {
    console.log("Testing PIN...");
    const email = "demo@zimra.com"; // Use the known demo user
    const user = await storage.getUserByEmail(email);

    if (!user) {
        console.error("User not found");
        process.exit(1);
    }

    const pin = "1234";
    console.log(`Setting PIN for ${email} to ${pin}`);
    await storage.setUserPin(user.id, pin);

    console.log("Verifying PIN...");
    const isValid = await storage.verifyUserPin(user.id, pin);
    console.log(`isValid: ${isValid}`);

    if (isValid) {
        console.log("✅ SUCCESS");
    } else {
        console.log("❌ FAILED");
    }
    process.exit(0);
}

testPin();
