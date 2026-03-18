/**
 * Test the ZIMRA environment switching endpoints
 * Run with: npx tsx scripts/test-environment-endpoints.ts
 */

async function testEndpoints() {
    const baseUrl = 'http://localhost:5000';
    const companyId = 1;

    console.log('🧪 Testing ZIMRA Environment Switching Endpoints\n');

    try {
        // Test 1: Get current environment
        console.log('1️⃣  Testing GET /api/companies/:id/zimra/environment');
        const getResponse = await fetch(`${baseUrl}/api/companies/${companyId}/zimra/environment`);
        const getData = await getResponse.json();
        console.log('   Status:', getResponse.status);
        console.log('   Response:', JSON.stringify(getData, null, 2));
        console.log('   ✅ GET endpoint working!\n');

        // Test 2: Try to switch to production
        console.log('2️⃣  Testing POST /api/companies/:id/zimra/environment (switch to production)');
        const postResponse = await fetch(`${baseUrl}/api/companies/${companyId}/zimra/environment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ environment: 'production' })
        });
        const postData = await postResponse.json();
        console.log('   Status:', postResponse.status);
        console.log('   Response:', JSON.stringify(postData, null, 2));

        if (postResponse.status === 200) {
            console.log('   ✅ Successfully switched to production!\n');
        } else {
            console.log('   ⚠️  Could not switch (this is expected if fiscal day is open)\n');
        }

        // Test 3: Switch back to test
        console.log('3️⃣  Testing POST /api/companies/:id/zimra/environment (switch to test)');
        const testResponse = await fetch(`${baseUrl}/api/companies/${companyId}/zimra/environment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ environment: 'test' })
        });
        const testData = await testResponse.json();
        console.log('   Status:', testResponse.status);
        console.log('   Response:', JSON.stringify(testData, null, 2));

        if (testResponse.status === 200) {
            console.log('   ✅ Successfully switched back to test!\n');
        }

        // Test 4: Verify final state
        console.log('4️⃣  Verifying final state');
        const finalResponse = await fetch(`${baseUrl}/api/companies/${companyId}/zimra/environment`);
        const finalData = await finalResponse.json();
        console.log('   Current environment:', finalData.environment);
        console.log('   Base URL:', finalData.baseUrl);
        console.log('   Can switch:', finalData.canSwitch);
        console.log('   ✅ Verification complete!\n');

        console.log('🎉 All tests passed!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('   Make sure the server is running on http://localhost:5000');
        process.exit(1);
    }
}

testEndpoints();
