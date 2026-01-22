
import { ZimraDevice, ZimraConfig, ReceiptData } from '../zimra';
import assert from 'assert';
import { AxiosInstance, AxiosResponse } from 'axios';

// Utils to mock axios
function mockAxios(device: ZimraDevice, mockHandler: (config: any) => Promise<any>) {
    // Access private property by casting to any
    const instance = (device as any).axiosInstance as AxiosInstance;

    // Mock the request method (which axios calls internally for get/post)
    instance.request = async (config) => {
        return {
            data: await mockHandler(config),
            status: 200,
            statusText: 'OK',
            headers: {},
            config
        } as any;
    };

    // Also mock specific methods if needed, but request is usually the core
    instance.post = async (url, data, config) => instance.request({ ...config, method: 'post', url, data });
    instance.get = async (url, config) => instance.request({ ...config, method: 'get', url });
}


async function runTests() {
    console.log("Starting ZIMRA FDMS Functions Tests...\n");

    const config: ZimraConfig = {
        deviceId: "1234567890",
        deviceSerialNo: "SNTEST001",
        activationKey: "ACT123",
        privateKey: "FAKE_KEY", // In real test, generate a dummy key pair
        certificate: "FAKE_CERT" // We won't validate signature logic that relies on real keys here
    };

    const device = new ZimraDevice(config);

    // 1. Test Verify Taxpayer
    console.log("Test 1: Verify Taxpayer Information...");
    mockAxios(device, async (req) => {
        // /Public/v1/{deviceID}/VerifyTaxpayerInformation
        if (req.url.includes('/VerifyTaxpayerInformation') && req.method.toLowerCase() === 'post') {
            try {
                // Check URL has deviceID
                assert.ok(req.url.includes(config.deviceId), "URL should contain deviceID");
                const body = req.data;
                // ZIMRA API implementation passes { activationKey, deviceSerialNo }
                assert.equal(body.deviceSerialNo, config.deviceSerialNo);
                return {
                    taxPayerName: "Test Company",
                    taxPayerTIN: "2000000000",
                    vatNumber: "100000000"
                };
            } catch (e) { console.error(e); throw e; }
        }
        throw new Error(`Unexpected call: ${req.method} ${req.url}`);
    });

    const taxpayer = await device.verifyTaxpayerInformation();
    assert.equal(taxpayer.taxPayerName, "Test Company");
    console.log("✅ Verify Taxpayer Passed\n");


    // 2. Test Get Status
    console.log("Test 2: Get Device Status...");
    mockAxios(device, async (req) => {
        // /Device/v1/{deviceID}/GetStatus
        if (req.url.includes('/GetStatus') && req.method.toLowerCase() === 'get') {
            assert.ok(req.url.includes(config.deviceId));
            return {
                fiscalDayStatus: "FiscalDayClosed",
                lastFiscalDayNo: 10
            };
        }
        throw new Error(`Unexpected call: ${req.method} ${req.url}`);
    });

    const status = await device.getStatus();
    assert.equal(status.fiscalDayStatus, "FiscalDayClosed");
    assert.equal(status.lastFiscalDayNo, 10);
    console.log("✅ Get Status Passed\n");


    // 3. Test Open Day
    console.log("Test 3: Open Fiscal Day...");
    mockAxios(device, async (req) => {
        if (req.url.includes('/OpenDay') && req.method.toLowerCase() === 'post') {
            assert.ok(req.url.includes(config.deviceId));
            const body = req.data;
            assert.equal(body.fiscalDayNo, 11);
            return {
                operationID: "OP_OPEN_11",
                fiscalDayNo: 11,
                fiscalDayStatus: "FiscalDayOpened"
            };
        }
        throw new Error(`Unexpected call: ${req.method} ${req.url}`);
    });

    const openRes = await device.openDay(11);
    assert.equal(openRes.fiscalDayNo, 11);
    console.log("✅ Open Day Passed\n");


    // 4. Test Submit Receipt (Fiscalization)
    console.log("Test 4: Submit Receipt...");

    // Monkey-patch signData to avoid needing real keys
    (device as any).signData = (data: string) => "MOCK_SIGNATURE";

    mockAxios(device, async (req) => {
        if (req.url.includes('/SubmitReceipt') && req.method.toLowerCase() === 'post') {
            assert.ok(req.url.includes(config.deviceId));
            const body = req.data;
            // The body structure is { receipt: { ... } }
            assert.ok(body.receipt, "Body should have receipt object");
            assert.equal(body.receipt.receiptType, "FiscalInvoice");
            assert.equal(body.receipt.receiptGlobalNo, 500);
            assert.ok(body.receipt.receiptDeviceSignature, "Signature should be present");

            return {
                receiptID: 12345,
                receiptGlobalNo: 500,
                receiptDeviceSignature: body.receipt.receiptDeviceSignature, // Echo back
                fiscalDayNo: 11
            };
        }
        throw new Error(`Unexpected call: ${req.method} ${req.url}`);
    });

    const receiptData: ReceiptData = {
        receiptType: 'FiscalInvoice',
        receiptCurrency: 'USD',
        receiptCounter: 1,
        receiptGlobalNo: 500,
        invoiceNo: "INV001",
        receiptDate: "2023-01-01T12:00:00",
        receiptLines: [
            {
                receiptLineType: 'Sale',
                receiptLineNo: 1,
                receiptLineHSCode: '1234',
                receiptLineName: 'Item A',
                receiptLinePrice: 10,
                receiptLineQuantity: 1,
                receiptLineTotal: 10,
                taxPercent: 15,
                taxID: 3
            }
        ],
        receiptTaxes: [],
        receiptPayments: [{ moneyTypeCode: 'CASH', paymentAmount: 10 }],
        receiptTotal: 10,
        receiptLinesTaxInclusive: true
    };

    const receiptRes = await device.submitReceipt(receiptData);
    assert.equal(receiptRes.response.receiptGlobalNo, 500);
    assert.equal(receiptRes.signature, "MOCK_SIGNATURE");
    console.log("✅ Submit Receipt Passed\n");

    console.log("🎉 All Tests Passed!");
}

runTests().catch(err => {
    console.error("❌ Tests Failed:", err);
    process.exit(1);
});
