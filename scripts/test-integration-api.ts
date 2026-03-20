import { db } from "../server/db";
import { companies } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";

async function main() {
  console.log("=====================================");
  console.log("  FiscalStack API v1 Integration Test");
  console.log("=====================================\n");

  let targetCompanies = await db.select().from(companies).limit(1);
  if (targetCompanies.length === 0) {
    console.error("ERROR: No companies found in the database. Please create a company first.");
    process.exit(1);
  }

  const company = targetCompanies[0];
  let apiKey = company.apiKey;

  if (!apiKey) {
    console.log(`No API key found for ${company.name}. Generating a new one for testing...`);
    const crypto = await import("crypto");
    apiKey = `fisc_${crypto.randomBytes(24).toString("hex")}`;
    
    // We update via db directly to avoid needing to bring in the entire storage layer implementation details
    await db.update(companies).set({ apiKey }).where(eq(companies.id, company.id));
  }
  const BASE_URL = "http://127.0.0.1:5001/api/v1";

  console.log(`Using Company: ${company.name} (ID: ${company.id})`);
  console.log(`Using API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Base URL:      ${BASE_URL}\n`);

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey
  };

  try {
    // 1. Test GET /customers
    console.log("1. GET /customers");
    let response = await fetch(`${BASE_URL}/customers`, { headers });
    let data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Result: Found ${data.length || 0} customers\n`);

    // 2. Test POST /customers
    console.log("2. POST /customers (Create dummy customer)");
    const newCustomer = {
      name: `API Test Customer ${Date.now()}`,
      email: "api-test@example.com",
      phone: "+263 77 000 0000"
    };
    response = await fetch(`${BASE_URL}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify(newCustomer)
    });
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Result: Created Customer ID ${data.id}\n`);

    const customerId = data.id;

    // 3. Test GET /products
    console.log("3. GET /products");
    response = await fetch(`${BASE_URL}/products`, { headers });
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Result: Found ${data.length || 0} products\n`);

    // 4. Test POST /products
    console.log("4. POST /products (Create dummy product)");
    const newProduct = {
      name: `API Test Product ${Date.now()}`,
      price: 15.50,
      taxRate: 15,
      sku: "API-TEST-01"
    };
    response = await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(newProduct)
    });
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Result: Created Product ID ${data.id}\n`);

    const productId = data.id;

    // 5. Test GET /fiscal/device
    console.log("5. GET /fiscal/device");
    response = await fetch(`${BASE_URL}/fiscal/device`, { headers });
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Result: Status is '${data.status}'\n`);

    console.log("-------------------------------------");
    console.log("✅ All Integration API tests complete!");
    console.log("-------------------------------------");

  } catch (error: any) {
    console.error("Test execution failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
