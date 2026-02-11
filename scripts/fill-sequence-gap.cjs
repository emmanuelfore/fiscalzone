
const { Pool } = require('pg');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

async function fillSequenceGap() {
    const companyId = process.argv[2];
    if (!companyId) {
        console.error("Usage: node scripts/fill-sequence-gap.cjs <companyId>");
        process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not found.");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    console.log(`\n--- ZIMRA GAP FILLER (Company ID: ${companyId}) ---`);
    console.log("This script will bridge gaps in your sequence by submitting $0.01 Adjustment invoices.\n");

    try {
        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (companyRes.rows.length === 0) {
            console.error("Company not found.");
            return;
        }

        const company = companyRes.rows[0];
        if (!company.fdms_device_id || !company.zimra_private_key || !company.zimra_certificate) {
            console.error("Company missing ZIMRA configuration.");
            return;
        }

        const baseUrl = company.zimra_environment === 'production'
            ? 'https://fdmsapi.zimra.co.zw'
            : 'https://fdmsapitest.zimra.co.zw';

        const agent = new https.Agent({
            cert: company.zimra_certificate,
            key: company.zimra_private_key,
            rejectUnauthorized: false
        });

        const devicePath = `/Device/v1/${company.fdms_device_id}`;

        // 1. Fetch Cloud Status
        console.log("Checking ZIMRA Cloud Status...");
        const statusResponse = await axios.post(`${baseUrl}${devicePath}/Status`, {}, {
            httpsAgent: agent,
            headers: {
                'Content-Type': 'application/json',
                'DeviceModelName': 'Server',
                'DeviceModelVersion': '1.0'
            }
        });

        const status = statusResponse.data;
        let lastCloudGlobalNo = status.lastReceiptGlobalNo || 0;
        let lastCloudCounter = status.lastReceiptCounter || 0;
        let currentHash = status.fiscalDayServerSignature?.hash || null;

        console.log(`Cloud is currently at Global No: ${lastCloudGlobalNo}, Daily Count: ${lastCloudCounter}`);

        // We look for the "Next Real" invoice in our DB that is synced but has a higher number
        // OR we just ask the user what the target is.
        // Based on user report: Gap of 50, then 12 successful ones.
        // We will fill until we reach the GlobalNo of the first of those 12 invoices.

        const nextInvoices = await pool.query(
            'SELECT receipt_global_no, receipt_counter FROM invoices WHERE company_id = $1 AND synced_with_fdms = true AND receipt_global_no > $2 ORDER BY receipt_global_no ASC LIMIT 1',
            [companyId, lastCloudGlobalNo]
        );

        if (nextInvoices.rows.length === 0) {
            console.log("\n[INFO] No sequence gaps detected in your database relative to ZIMRA cloud.");
            console.log("If you are still stuck, try running scripts/resync-counters.cjs first.");
            return;
        }

        const targetGlobalNo = nextInvoices.rows[0].receipt_global_no;
        console.log(`Targeting synchronization with first valid invoice at Global No: ${targetGlobalNo}`);

        const gapSize = targetGlobalNo - lastCloudGlobalNo - 1;
        if (gapSize <= 0) {
            console.log("\n[SUCCESS] Sequence is already continuous.");
            return;
        }

        console.log(`\n[ACTION] Detected gap of ${gapSize} invoices. Filling with $0.01 adjustments...`);

        for (let i = 1; i <= gapSize; i++) {
            const nextGlobal = lastCloudGlobalNo + i;
            const nextCounter = lastCloudCounter + i;
            const rDate = new Date().toISOString().slice(0, 19);
            const rTotal = 0.01;
            const rTotalCents = 1;

            // Prepare Signature String
            // Format: deviceID + receiptType + currency + globalNo + date + totalInCents + concatenatedTaxes + previousHash
            // For $0.01 Adjustment (Exempt ID 1, $0 tax, $0.01 sales)
            // concatenatedTaxes for ID 1: "" (taxPercent) + "0" (taxAmount in cents) + "1" (salesAmountWithTax in cents)
            const concatenatedTaxes = "01";
            const stringToSign = `${parseInt(company.fdms_device_id)}FISCALINVOICEUSD${nextGlobal}${rDate}${rTotalCents}${concatenatedTaxes}${currentHash || ''}`;

            const hash = crypto.createHash('sha256').update(stringToSign, 'utf8').digest('base64');
            const sign = crypto.createSign('SHA256').update(stringToSign).end();
            const signature = sign.sign(company.zimra_private_key, 'base64');

            const payload = {
                deviceID: parseInt(company.fdms_device_id),
                receipt: {
                    receiptType: 'FiscalInvoice',
                    receiptCurrency: 'USD',
                    receiptCounter: nextCounter,
                    receiptGlobalNo: nextGlobal,
                    invoiceNo: `ADJ-GAP-${nextGlobal}`,
                    receiptDate: rDate,
                    receiptLines: [{
                        receiptLineType: 'Sale',
                        receiptLineNo: 1,
                        receiptLineHSCode: '00000000',
                        receiptLineName: 'Sequence Reconciliation Adjustment',
                        receiptLinePrice: 0.01,
                        receiptLineQuantity: 1,
                        receiptLineTotal: 0.01,
                        taxID: 1 // Exempt
                    }],
                    receiptTaxes: [{
                        taxID: 1,
                        taxAmount: 0,
                        salesAmountWithTax: 0.01
                    }],
                    receiptPayments: [{
                        moneyTypeCode: 'Cash',
                        paymentAmount: 0.01
                    }],
                    receiptTotal: 0.01,
                    receiptLinesTaxInclusive: true,
                    receiptDeviceSignature: { hash, signature }
                }
            };

            console.log(`Submitting Filler #${i} (Global: ${nextGlobal}, Counter: ${nextCounter})...`);

            // TEST MODE: Only send one
            const isTest = process.argv.includes('--test');
            if (isTest) console.log("Running in TEST MODE: Only one invoice will be submitted.");

            const response = await axios.post(`${baseUrl}${devicePath}/SubmitReceipt`, payload, {
                httpsAgent: agent,
                headers: {
                    'Content-Type': 'application/json',
                    'DeviceModelName': 'Server',
                    'DeviceModelVersion': '1.0'
                }
            });

            if (response.data.status === 'Invalid') {
                console.error(`\n[ERROR] ZIMRA rejected filler #${i}:`, response.data.errors);
                break;
            }

            // Update for next iteration
            currentHash = hash;
            console.log(`  Accepted by ZIMRA. Hash updated.`);

            if (process.argv.includes('--test')) {
                console.log("\n[TEST SUCCESS] ZIMRA accepted the first filler invoice. Stopping as requested.");
                break;
            }
        }

        console.log("\n[FINALIZING] Updating company record with new state...");
        const finalGlobal = lastCloudGlobalNo + gapSize;
        const finalCounter = lastCloudCounter + gapSize;

        await pool.query(
            'UPDATE companies SET last_receipt_global_no = $1, daily_receipt_count = $2, last_fiscal_hash = $3 WHERE id = $4',
            [finalGlobal, finalCounter, currentHash, companyId]
        );

        console.log(`\n[SUCCESS] Gap bridged! Your system is now at Global No ${finalGlobal}.`);
        console.log("You can now proceed to close the day or submit new invoices.");

    } catch (err) {
        if (err.response) {
            console.error("\nZIMRA Error Response Status:", err.response.status);
            console.error("ZIMRA Error Response Data:", JSON.stringify(err.response.data, null, 2));
        } else if (err.request) {
            console.error("\nNo response received from ZIMRA. Possible network/cert issue.");
            console.error("Error Detail:", err.message);
        } else {
            console.error("\nSystem Error:", err.message);
        }
    } finally {
        await pool.end();
    }
}

fillSequenceGap();
