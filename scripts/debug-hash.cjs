
const crypto = require('crypto');

function getHash(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('base64');
}

const targetHash = "YpF1zZydS92T8CPUwGXUYg/sT83lzsrBn2WyhNRfMko=";

const deviceId = "32341";
const fiscalDayNo = "11";
const receiptCounter = "1";

const dates = [
    "2026-02-10",
    "2026-02-10T00:00:00",
    "2026-02-09",
    "2026-02-09T00:00:00",
    "2026-02-11", // Maybe futuristic?
    "",
];

const counters = [
    { Type: "SALEBYTAX", Curr: "USD", TaxP: "15.5", TaxID: "517", Val: "11550" },
    { Type: "SALETAXBYTAX", Curr: "USD", TaxP: "15.5", TaxID: "517", Val: "1550" },
    { Type: "BALANCEBYMONEYTYPE", Curr: "USD", Money: "CASH", Val: "11550" }
];

const field3Options = ["TaxP", "TaxID"];

function run() {
    for (const date of dates) {
        for (const f3 of field3Options) {
            for (const includeReceiptCounter of [true, false]) {

                let concatenatedCounters = "";
                for (const c of counters) {
                    let f3val = "";
                    if (c.Type.includes("BYTAX")) {
                        f3val = c[f3];
                    } else {
                        f3val = c.Money;
                    }
                    concatenatedCounters += `${c.Type}${c.Curr}${f3val}${c.Val}`;
                }

                const variations = [
                    `${deviceId}${fiscalDayNo}${date}${concatenatedCounters}`,
                    `${deviceId}${fiscalDayNo}${date}${concatenatedCounters}${receiptCounter}`,
                    `${deviceId}${fiscalDayNo}${concatenatedCounters}${receiptCounter}`,
                    `${deviceId}${fiscalDayNo}${concatenatedCounters}`
                ];

                for (let i = 0; i < variations.length; i++) {
                    const s = variations[i];
                    const h = getHash(s);
                    if (h === targetHash) {
                        console.log("MATCH FOUND!");
                        console.log(`Variation Index: ${i}`);
                        console.log(`F3 Option: ${f3}`);
                        console.log(`Date used: ${date}`);
                        const fs = require('fs');
                        fs.writeFileSync('scripts/match.txt', s);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

if (!run()) {
    console.log("No match found.");
}
