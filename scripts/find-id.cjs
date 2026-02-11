
const { Pool } = require('pg');
require('dotenv').config();

async function findCompany() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query("SELECT id, name, fdms_device_id FROM companies WHERE fdms_device_id = '36669' OR name ILIKE '%Dynabal%'");
        console.log("MATCHING_COMPANIES:" + JSON.stringify(res.rows));
    } catch (err) {
        console.error("DB_ERROR:" + err.message);
    } finally {
        await pool.end();
    }
}

findCompany();
