/**
 * This script verifies the subscription storage and retrieval logic.
 */
import { storage } from "../server/storage.js";

async function runVerification() {
    console.log("--- Starting Subscription Logic Verification ---");

    const testCompanyId = 1; // Assuming company 1 exists
    const testSerial = "VERIFY-SN-001";
    const testMac = "AA:BB:CC:DD:EE:FF";
    const testRef = `TEST-REF-${Date.now()}`;

    if (!process.env.DATABASE_URL) {
        console.warn("⚠️ DATABASE_URL not found in process.env. Make sure to run with environment variables loaded.");
    }

    try {
        // 1. Create a pending subscription
        console.log("1. Creating pending subscription...");
        const sub = await storage.createSubscription({
            companyId: testCompanyId,
            deviceSerialNo: testSerial,
            deviceMacAddress: testMac,
            paynowReference: testRef,
            amount: "10.00",
            status: "pending"
        });
        console.log("✅ Created subscription:", sub.id);

        // 2. Retrieve by reference
        console.log("2. Retrieving by reference...");
        const retrieved = await storage.getSubscriptionByReference(testRef);
        if (retrieved?.id === sub.id) {
            console.log("✅ Retrieval successful");
        } else {
            throw new Error("Retrieval failed");
        }

        // 3. Mark as paid
        console.log("3. Marking as paid...");
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        await storage.updateSubscription(sub.id, {
            status: "paid",
            startDate,
            endDate
        });
        console.log("✅ Subscription marked as paid");

        // 4. Verify Active Subscription check
        console.log("4. Verifying active subscription check...");
        const activeSub = await storage.getActiveSubscriptionByDevice(testCompanyId, testSerial, testMac);
        if (activeSub && activeSub.id === sub.id) {
            console.log("✅ Active subscription found correctly");
        } else {
            throw new Error("Active subscription NOT found");
        }

        // 5. Verify MAC address binding (different MAC)
        console.log("5. Verifying MAC address binding isolation...");
        const wrongMacSub = await storage.getActiveSubscriptionByDevice(testCompanyId, testSerial, "FF:EE:DD:CC:BB:AA");
        if (!wrongMacSub) {
            console.log("✅ Correctly rejected different MAC address");
        } else {
            throw new Error("Failed MAC address isolation");
        }

        console.log("\n--- Verification Completed Successfully! ---");
    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    }
}

runVerification();
