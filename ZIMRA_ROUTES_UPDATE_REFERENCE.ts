/**
 * ZIMRA Environment Switching - Quick Update Reference
 * 
 * This file shows the exact changes needed in routes.ts to support environment switching.
 * 
 * Step 1: Add import at the top of routes.ts (after line 11)
 */

import { ZimraDevice, type ReceiptData, ZimraApiError, getZimraBaseUrl } from "./zimra";

/**
 * Step 2: Add these two endpoints after line 74 (after app.patch("/api/companies/:id"))
 * Copy from server/zimra-environment-endpoints.ts
 */

/**
 * Step 3: Update all ZimraDevice initializations
 * 
 * Find and replace pattern:
 * 
 * OLD:
 *   const device = new ZimraDevice({
 *     deviceId: company.fdmsDeviceId,
 *     deviceSerialNo: "UNKNOWN",
 *     activationKey: company.fdmsApiKey || "",
 *     privateKey: company.zimraPrivateKey || "",
 *     certificate: company.zimraCertificate || "",
 *   });
 * 
 * NEW:
 *   const device = new ZimraDevice({
 *     deviceId: company.fdmsDeviceId,
 *     deviceSerialNo: "UNKNOWN",
 *     activationKey: company.fdmsApiKey || "",
 *     privateKey: company.zimraPrivateKey || "",
 *     certificate: company.zimraCertificate || "",
 *     baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
 *   });
 * 
 * Locations to update (approximate line numbers):
 */

// 1. Line ~90 - Device Registration
const device1 = new ZimraDevice({
    deviceId,
    deviceSerialNo,
    activationKey,
    baseUrl: 'https://fdmsapitest.zimra.co.zw' // Change to: getZimraBaseUrl('test') for registration
});

// 2. Line ~128 - Verify Taxpayer
const device2 = new ZimraDevice({
    deviceId,
    deviceSerialNo,
    activationKey,
    baseUrl: 'https://fdmsapitest.zimra.co.zw' // Change to: getZimraBaseUrl('test') for verification
});

// 3. Line ~154 - Issue Certificate
const device3 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 4. Line ~195 - Get Server Certificate
const device4 = new ZimraDevice({
    deviceId: company.fdmsDeviceId || "0",
    deviceSerialNo: "UNKNOWN",
    activationKey: "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 5. Line ~357 - Get Status
const device5 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey,
    certificate: company.zimraCertificate || "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 6. Line ~393 - Config Sync
const device6 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || undefined,
    certificate: company.zimraCertificate || undefined,
    baseUrl: 'https://fdmsapitest.zimra.co.zw' // Change to: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 7. Line ~438 - Ping
const device7 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 8. Line ~474 - Open Day
const device8 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 9. Line ~536 - Close Day
const device9 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey || "",
    certificate: company.zimraCertificate || "",
    // ADD: baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

// 10. Line ~721 - Fiscalize Invoice
const device10 = new ZimraDevice({
    deviceId: company.fdmsDeviceId,
    deviceSerialNo: "UNKNOWN",
    activationKey: company.fdmsApiKey || "",
    privateKey: company.zimraPrivateKey,
    certificate: company.zimraCertificate,
    baseUrl: 'https://fdmsapitest.zimra.co.zw' // Change to: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});

/**
 * Step 4: Run database migration
 */
// npx drizzle-kit push

/**
 * Step 5: Test
 */
// 1. Check environment: GET /api/companies/1/zimra/environment
// 2. Switch to production: POST /api/companies/1/zimra/environment { "environment": "production" }
// 3. Verify all API calls use correct URL
