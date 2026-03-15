
import crypto from 'crypto';

// User provided example data
const deviceID = "321";
const fiscalDayNo = 84;
const fiscalDayDate = "2019-09-23";
const fiscalDayUpdated = "2019-09-23T22:21:14";
const reconciliationMode = "AUTO";

const countersWithMockIDs = [
    { type: 'SaleByTax', currency: 'ZWL', value: 23000.00, taxPercent: null, id: 1 },
    { type: 'SaleByTax', currency: 'ZWL', value: 12000.00, taxPercent: 0, id: 2 },
    { type: 'SaleByTax', currency: 'USD', value: 25.00, taxPercent: 15, id: 3 },
    { type: 'SaleByTax', currency: 'ZWL', value: 12.00, taxPercent: 15, id: 3 },

    { type: 'SaleTaxByTax', currency: 'USD', value: 2.50, taxPercent: 15, id: 3 },
    { type: 'SaleTaxByTax', currency: 'ZWL', value: 2300.00, taxPercent: 15, id: 3 },

    { type: 'BalanceByMoneyType', currency: 'ZWL', value: 15000.00, moneyType: 'CARD', moneyTypeID: 1 },
    { type: 'BalanceByMoneyType', currency: 'USD', value: 37.00, moneyType: 'CASH', moneyTypeID: 0 },
    { type: 'BalanceByMoneyType', currency: 'ZWL', value: 20000.00, moneyType: 'CASH', moneyTypeID: 0 }
];

const deviceSignature = "YyXTSizBBrMjMk4VQL+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sOHVdjeRBebjQgAQQIMTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc=";

function runTest() {
    // Sort Logic (Derived from Step 798 Text + Order)
    // 1. Type
    // 2. Currency (Ascending)
    // 3. ID (Ascending TaxID or MoneyType ID)

    const sorted = countersWithMockIDs.sort((a, b) => {
        // 1. Sort by Type Priority
        const typeMap: any = {
            'SaleByTax': 1,
            'SaleTaxByTax': 2,
            'BalanceByMoneyType': 7
        };
        const ta = typeMap[a.type] || 99;
        const tb = typeMap[b.type] || 99;
        if (ta !== tb) return ta - tb;

        // 2. Sort by Currency (Alphabetical) - PRIORITY OVER FEATURE if Step 798 text is TRUE
        // "type → currency (alphabetical) → taxID/moneyType (ascending)"
        const cComp = a.currency.localeCompare(b.currency);
        if (cComp !== 0) return cComp;

        // 3. Sort by Feature (TaxID or MoneyType ID)
        if (a.id !== undefined && b.id !== undefined) {
            return a.id - b.id;
        } else if (a.moneyTypeID !== undefined && b.moneyTypeID !== undefined) {
            return a.moneyTypeID - b.moneyTypeID;
        }
        return 0;
    });

    // Generate String
    const generatedCounterString = sorted.map(c => {
        const type = c.type.toUpperCase();
        const curr = c.currency.toUpperCase();
        let field3 = "";

        // Formatting Logic - Clean
        if (c.taxPercent === null) field3 = "";
        else if (c.taxPercent !== undefined) field3 = c.taxPercent.toFixed(2);
        else if (c.moneyType) {
            field3 = c.moneyType.toUpperCase();
        }

        const val = Math.round(c.value * 100);
        return `${type}${curr}${field3}${val}`;
    }).join("");

    console.log("FULL GENERATED STRING (LOGIC 2):");
    console.log(generatedCounterString);

    // Verify ordering
    // USD vs ZWL
    const usdIndex = generatedCounterString.indexOf("USD");
    const zwlIndex = generatedCounterString.indexOf("ZWL");

    // ZWL CASH vs ZWL CARD (Same currency)
    const zwlCashIndex = generatedCounterString.indexOf("ZWLCASH");
    const zwlCardIndex = generatedCounterString.indexOf("ZWLCARD");

    console.log(`\nIndex of USD: ${usdIndex}`);
    console.log(`Index of ZWL: ${zwlIndex}`);
    console.log(`Index of ZWLCASH: ${zwlCashIndex}`);
    console.log(`Index of ZWLCARD: ${zwlCardIndex}`);

    let checks = 0;
    // Check 1: Currency Order (USD before ZWL)
    if (usdIndex !== -1 && zwlIndex !== -1 && usdIndex < zwlIndex) {
        console.log("Check 1 PASS: USD comes before ZWL (Sorted by Currency).");
        checks++;
    } else {
        console.log("Check 1 FAIL: Currency sort order incorrect.");
    }

    // Check 2: MoneyType Order within ZWL (CASH before CARD) - Wait, is it?
    // If ID Sort: Cash(0) < Card(1). So CASH before CARD.
    if (zwlCashIndex !== -1 && zwlCardIndex !== -1 && zwlCashIndex < zwlCardIndex) {
        console.log("Check 2 PASS: ZWL CASH comes before ZWL CARD (Sorted by MoneyType ID).");
        checks++;
    } else {
        console.log("Check 2 FAIL: MoneyType sort order incorrect (Expected CASH < CARD).");
    }

    if (checks === 2) {
        console.log("\nVERDICT: LOGIC MATCHES STEP 798 DESCRIPTION.");
    } else {
        console.log("\nVERDICT: LOGIC DOES NOT MATCH.");
    }

    // Hash Verdict
    const fullString = `${deviceID}${fiscalDayNo}${fiscalDayDate}${fiscalDayUpdated}${reconciliationMode}${generatedCounterString}${deviceSignature}`;
    const hash = crypto.createHash('sha256').update(fullString).digest('base64');

    console.log("\nCLEAN HASH (LOGIC 2):", hash);
}

runTest();
