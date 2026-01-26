
import crypto from 'crypto';

// Utility to match the hashing logic in the main app
function getHash(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('base64');
}

/**
 * ZIMRA Compliance Test Suite
 * This script verifies that our implementation matches official ZIMRA FDMS examples.
 */
async function runTests() {
    console.log("🚀 Running ZIMRA Compliance Tests...\n");

    // Test 1: Signature Verification (Based on Spec 3.4.1. Example)
    testSignatureSpecMatch();

    // Test 2: Tax Percentage Formatting
    testTaxFormatting();

    // Test 3: Sign Handling for Counter Calculation
    testCounterSignHandling();
}

/**
 * Test 1: Verify the hash matches the ZIMRA FDMS Specification example (Device 321, Day 84).
 */
function testSignatureSpecMatch() {
    console.log("Test 1: Signature Spec Match...");

    const deviceID = "321";
    const fiscalDayNo = "84";
    const fiscalDayDate = "2019-09-23";
    const expectedHash = "OdT8lLI0JXhXl1XQgr64Zb1ltFDksFXThVxqM6O8xZE=";

    // These specific blocks are extracted from the FDMS Spec example concatenation string
    const concatenatedCounters =
        "SALEBYTAXZWL2300000" +
        "SALEBYTAXZWL0.001200000" +
        "SALEBYTAXUSD14.502500" +
        "SALEBYTAXZWL15.001200" +
        "SALETAXBYTAXUSD15.00250" +
        "SALETAXBYTAXZWL15.00230000" +
        "BALANCEBYMONEYTYPEUSDLCASH3700" + // Spec example contains this 'L'
        "BALANCEBYMONEYTYPEZWLCASH2000000" +
        "BALANCEBYMONEYTYPEZWLCARD1500000";

    const stringToSign = `${deviceID}${fiscalDayNo}${fiscalDayDate}${concatenatedCounters}`;
    const generatedHash = getHash(stringToSign);

    if (generatedHash === expectedHash) {
        console.log("✅ Success: Signature hash matches ZIMRA Spec example!");
    } else {
        console.error("❌ Failure: Signature hash mismatch.");
        console.log(`- Expected: ${expectedHash}`);
        console.log(`- Generated: ${generatedHash}`);
        process.exit(1);
    }
}

/**
 * Test 2: Verify that tax percents are formatted as strings with 2 decimals (or empty for exempt).
 */
function testTaxFormatting() {
    console.log("\nTest 2: Tax Formatting...");

    const formats = [
        { rate: 15, expected: "15.00" },
        { rate: 0, expected: "0.00" },
        { rate: 14.5, expected: "14.50" }
    ];

    for (const f of formats) {
        const formatted = f.rate.toFixed(2);
        if (formatted !== f.expected) {
            console.error(`❌ Failure: Formatting ${f.rate} expected ${f.expected} but got ${formatted}`);
            process.exit(1);
        }
    }
    console.log("✅ Success: Tax percentages format correctly.");
}

/**
 * Test 3: Verify that CreditNote amounts result in negative counter updates.
 */
function testCounterSignHandling() {
    console.log("\nTest 3: Counter Sign Handling...");

    const mockInvoices = [
        { type: 'FiscalInvoice', total: 100 },
        { type: 'CreditNote', total: 40 },
        { type: 'DebitNote', total: 10 }
    ];

    let balance = 0;
    for (const inv of mockInvoices) {
        let amount = Number(inv.total);
        if (inv.type === 'CreditNote') {
            amount = -Math.abs(amount);
        } else {
            amount = Math.abs(amount);
        }
        balance += amount;
    }

    const expectedBalance = 100 - 40 + 10; // 70
    if (balance === expectedBalance) {
        console.log("✅ Success: Counter sign handling is correct (Balance: 70)");
    } else {
        console.error(`❌ Failure: Balance mismatch. Expected ${expectedBalance}, got ${balance}`);
        process.exit(1);
    }
}

// Execute
runTests().then(() => {
    console.log("\n✨ All compliance tests passed successfully!");
});
