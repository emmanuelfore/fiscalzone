
import { createHash } from "crypto";

const payload = {
    deviceID: 31532,
    fiscalDayNo: 3,
    fiscalDayCounters: [
        {
            "fiscalCounterType": "SaleByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 100,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "SaleTaxByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 13.42,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "CreditNoteByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 50,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "CreditNoteTaxByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 6.71,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "DebitNoteByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 200,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "DebitNoteTaxByTax",
            "fiscalCounterTaxID": 3,
            "fiscalCounterValue": 26.84,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": null,
            "fiscalCounterTaxPercent": 15.5
        },
        {
            "fiscalCounterType": "BalanceByMoneyType",
            "fiscalCounterTaxID": 0,
            "fiscalCounterValue": 350,
            "fiscalCounterCurrency": "USD",
            "fiscalCounterMoneyType": "CASH",
            "fiscalCounterTaxPercent": 0
        }
    ],
    targetHash: "GYCLfu/g0OL8riwqQxfYvNlsQkwvJ72d44NPxgTBptg="
};

function getConcatenatedCounters(counters: any[]) {
    const moneyTypeMapping: Record<number, string> = { 0: "CASH", 1: "CARD" };

    const sortedCounters = counters.sort((a, b) => {
        // 1. Sort by Fiscal Counter Type Priority
        const typePriority = (type: string) => {
            if (type === 'SaleByTax') return 1;
            if (type === 'SaleTaxByTax') return 2;
            if (type === 'CreditNoteByTax') return 3;
            if (type === 'CreditNoteTaxByTax') return 4;
            if (type === 'DebitNoteByTax') return 5;
            if (type === 'DebitNoteTaxByTax') return 6;
            if (type === 'BalanceByMoneyType') return 7;
            return 99;
        };

        const pa = typePriority(a.fiscalCounterType);
        const pb = typePriority(b.fiscalCounterType);
        if (pa !== pb) return pa - pb;

        // 2. Sort by Currency
        if (a.fiscalCounterCurrency !== b.fiscalCounterCurrency) {
            return a.fiscalCounterCurrency.localeCompare(b.fiscalCounterCurrency);
        }

        // 3. Third Key
        const getThirdKey = (obj: any) => {
            if (obj.fiscalCounterTaxID !== undefined && obj.fiscalCounterTaxID !== null) {
                return obj.fiscalCounterTaxID;
            }
            if (obj.fiscalCounterTaxPercent !== undefined && obj.fiscalCounterTaxPercent !== null) {
                return obj.fiscalCounterTaxPercent;
            }
            if (obj.fiscalCounterMoneyType !== undefined && obj.fiscalCounterMoneyType !== null) {
                if (typeof obj.fiscalCounterMoneyType === 'number') {
                    return obj.fiscalCounterMoneyType === 0 ? 'CASH' : 'CARD';
                }
                return obj.fiscalCounterMoneyType;
            }
            return 0;
        };

        const k3a = getThirdKey(a);
        const k3b = getThirdKey(b);

        if (typeof k3a === 'number' && typeof k3b === 'number') {
            return k3a - k3b;
        }
        return String(k3a).localeCompare(String(k3b));
    });

    return sortedCounters.map((c: any) => {
        if (parseFloat(c.fiscalCounterValue) === 0) return "";

        const type = c.fiscalCounterType.toUpperCase();
        const currency = c.fiscalCounterCurrency.toUpperCase();
        const valueInCents = Math.round(c.fiscalCounterValue * 100);

        let field3 = "";

        if (type.includes('BYTAX')) {
            if (c.fiscalCounterTaxID !== 1 && c.fiscalCounterTaxPercent !== undefined && c.fiscalCounterTaxPercent !== null) {
                field3 = c.fiscalCounterTaxPercent.toFixed(2);
            }
        } else if (type.includes('BYMONEYTYPE')) {
            if (c.fiscalCounterMoneyType !== undefined && c.fiscalCounterMoneyType !== null) {
                // Code logic replica
                if (typeof c.fiscalCounterMoneyType === 'string') {
                    field3 = c.fiscalCounterMoneyType.toUpperCase();
                } else {
                    field3 = moneyTypeMapping[c.fiscalCounterMoneyType] || "";
                }
            }
        }

        return `${type}${currency}${field3}${valueInCents}`;
    }).join("");
}


const concatenated = getConcatenatedCounters([...payload.fiscalDayCounters]);
console.log("--- Concatenated Counters Debug ---");
// Log first 100 chars
console.log(concatenated.substring(0, 100));
console.log("...");
// Log last 100 chars
console.log(concatenated.substring(Math.max(0, concatenated.length - 100)));
console.log("-----------------------------------");

// Try to find the date
const datesToTry = [
    "2026-01-25", "2026-01-24", // Today/Yesterday
    "2025-01-25", // Year ago?
    "2025-03-03", // Random previous test date?
    new Date().toLocaleDateString('sv-SE') // Local system date format check
];

let matchFound = false;

for (const date of datesToTry) {
    const stringToSign = `${payload.deviceID}${payload.fiscalDayNo}${date}${concatenated}`;
    const hash = createHash('sha256').update(stringToSign, 'utf8').digest('base64');

    if (hash === payload.targetHash) {
        console.log(`MATCH FOUND! Date used: ${date}`);
        console.log(`Full String Signed: ${stringToSign}`);
        matchFound = true;
        break;
    }
}

if (!matchFound) {
    console.log("No match found for known dates.");
    console.log("Target Hash:   " + payload.targetHash);

    // Show what we generated for today to compare length/structure
    const date = "2026-01-25";
    const stringToSign = `${payload.deviceID}${payload.fiscalDayNo}${date}${concatenated}`;
    const hash = createHash('sha256').update(stringToSign, 'utf8').digest('base64');
    console.log(`Computed Hash: ${hash} (using ${date})`);
    console.log("Computed String: " + stringToSign);
}
