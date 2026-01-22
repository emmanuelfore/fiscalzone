
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function testConfig(name: string, config: any) {
    console.log(`\n--- Testing ${name} ---`);
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        connectionTimeoutMillis: 5000,
        ...config
    });

    try {
        await client.connect();
        console.log(`✅ Success with ${name}`);
        await client.end();
        return true;
    } catch (err: any) {
        console.log(`❌ Failed with ${name}: ${err.message}`);
        try { await client.end(); } catch { }
        return false;
    }
}

async function run() {
    // Test 1: Default (SSL likely enabled by string)
    await testConfig('Default (from string)', {});

    // Test 2: Explicit SSL False
    await testConfig('SSL: false', { ssl: false });

    // Test 3: SSL Unauthorized False
    await testConfig('SSL: { rejectUnauthorized: false }', { ssl: { rejectUnauthorized: false } });

    // Test 4: SSL Unauthorized True
    await testConfig('SSL: { rejectUnauthorized: true }', { ssl: { rejectUnauthorized: true } });

    process.exit(0);
}

run();
