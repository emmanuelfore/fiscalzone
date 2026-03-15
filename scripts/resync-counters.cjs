
const { Pool } = require('pg');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

async function resyncCounters() {
    const companyId = process.argv[2];
    if (!companyId) {
        console.error("Usage: node scripts/resync-counters.cjs <companyId>");
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

    console.log(`--- ZIMRA COUNTER RESYNC (Company ID: ${companyId}) ---\n`);

    try {
        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (companyRes.rows.length === 0) {
            console.error("Company not found.");
            return;
        }

        const company = companyRes.rows[0];
        if (!company.fdms_device_id || !company.zimra_private_key || !company.zimra_certificate) {
            console.error("Company is not fully configured for ZIMRA (missing Device ID or Keys).");
            return;
        }

        const baseUrl = company.zimra_environment === 'production'
            ? 'https://fdmsapi.zimra.co.zw'
            : 'https://fdmsapitest.zimra.co.zw';

        console.log(`Target Environment: ${company.zimra_environment.toUpperCase()} (${baseUrl})`);

        // Initialize HTTPS agent with mTLS
        const agent = new https.Agent({
            cert: company.zimra_certificate,
            key: company.zimra_private_key,
            rejectUnauthorized: false
        });

        // 1. Call ZIMRA Status
        console.log("Fetching status from ZIMRA...");
        const response = await axios.get(`${baseUrl}/Device/v1/${company.fdms_device_id}/GetStatus`, {
            httpsAgent: agent,
            headers: {
                'Content-Type': 'application/json',
                'DeviceModelName': 'Server',
                'DeviceModelVersion': '1.0'
            }
        });

        const status = response.data;
        const zimraGlobalNo = status.lastReceiptGlobalNo || 0;
        const zimraDailyCount = status.lastReceiptCounter || 0;
        const zimraHash = status.fiscalDayServerSignature?.hash || null;

        console.log("\nZIMRA Current State:");
        console.log(`  Last Global Receipt No: ${zimraGlobalNo}`);
        console.log(`  Last Daily Receipt Count: ${zimraDailyCount}`);
        console.log(`  Last Fiscal Hash: ${zimraHash}`);

        console.log("\nLocal State:");
        console.log(`  Last Global Receipt No: ${company.last_receipt_global_no}`);
        console.log(`  Daily Receipt Count: ${company.daily_receipt_count}`);
        console.log(`  Last Fiscal Hash: ${company.last_fiscal_hash}`);

        if (zimraGlobalNo === company.last_receipt_global_no && zimraDailyCount === company.daily_receipt_count) {
            console.log("\n[INFO] Local counters are already in sync with ZIMRA.");
        } else {
            console.log("\n[UPDATING] Synchronizing local counters with ZIMRA...");

            await pool.query(
                'UPDATE companies SET last_receipt_global_no = $1, daily_receipt_count = $2, last_fiscal_hash = $3 WHERE id = $4',
                [zimraGlobalNo, zimraDailyCount, zimraHash, companyId]
            );

            console.log("[SUCCESS] Counter resync complete. Next invoice will use:");
            console.log(`  Global No: ${zimraGlobalNo + 1}`);
            console.log(`  Daily Counter: ${zimraDailyCount + 1}`);
        }

    } catch (err) {
        if (err.response) {
            console.error("\nZIMRA API Error:", err.response.data.message || err.response.data.detail || JSON.stringify(err.response.data));
        } else {
            console.error("\nSystem Error:", err.message);
        }
    } finally {
        await pool.end();
    }
}

resyncCounters();
