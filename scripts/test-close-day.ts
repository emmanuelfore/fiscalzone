
import { ZimraDevice, ZimraConfig } from '../server/zimra';
import crypto from 'crypto';

// Setup Mock Environment
const mockConfig: ZimraConfig = {
    deviceId: "321",
    deviceSerialNo: "DSN12345",
    activationKey: "ACTIVATION_KEY",
    baseUrl: "https://test.zimra",
    deviceModelName: "TestModel",
    deviceModelVersion: "1.0",
    privateKey: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
    certificate: "-----BEGIN CERTIFICATE-----\nMII...\n-----END CERTIFICATE-----"
};

// Subclass to hijack request and inspect - But now we rely on SERVER LOGS
class TestZimraDevice extends ZimraDevice {
    // Override makeRequest to prevent actual HTTP call
    // @ts-ignore - Accessing protected method for testing
    protected async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
        // Just swallow the request, the logs happened inside closeDay()
        return { success: true };
    }
}

async function runTest() {
    console.log("Starting Test...");
    const device = new TestZimraDevice(mockConfig);

    // User Data
    const fiscalDayNo = 84;
    const fiscalDayDate = "2019-09-23";

    // Counters from user example
    const counters = [
        { fiscalCounterType: 'SaleByTax', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 23000.00, fiscalCounterTaxPercent: undefined },
        { fiscalCounterType: 'SaleByTax', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 12000.00, fiscalCounterTaxPercent: 0 },
        { fiscalCounterType: 'SaleByTax', fiscalCounterCurrency: 'USD', fiscalCounterValue: 25.00, fiscalCounterTaxPercent: 15 },
        { fiscalCounterType: 'SaleByTax', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 12.00, fiscalCounterTaxPercent: 15 },

        { fiscalCounterType: 'SaleTaxByTax', fiscalCounterCurrency: 'USD', fiscalCounterValue: 2.50, fiscalCounterTaxPercent: 15 },
        { fiscalCounterType: 'SaleTaxByTax', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 2300.00, fiscalCounterTaxPercent: 15 },

        { fiscalCounterType: 'BalanceByMoneyType', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 15000.00, fiscalCounterMoneyType: 'Card' },
        { fiscalCounterType: 'BalanceByMoneyType', fiscalCounterCurrency: 'USD', fiscalCounterValue: 37.00, fiscalCounterMoneyType: 'Cash' },
        { fiscalCounterType: 'BalanceByMoneyType', fiscalCounterCurrency: 'ZWL', fiscalCounterValue: 20000.00, fiscalCounterMoneyType: 'Cash' }
    ];

    const lastReceiptCounter = 999;

    try {
        await device.closeDay(fiscalDayNo, fiscalDayDate, lastReceiptCounter, counters);
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

runTest();
