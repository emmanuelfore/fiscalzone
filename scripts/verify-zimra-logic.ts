
import crypto from 'crypto';

// --- MOCK UTILS ---

function getHash(data: string): string {
    const hash = crypto.createHash('sha256').update(data, 'utf8').digest('base64');
    return hash;
}

// Mock Keys for testing
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' });

function signData(data: string, privKey: string | Buffer): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privKey, 'base64');
}

// --- VERIFICATION CODE LOGIC (Unknown Spec, assumming MD5 of Hex Signature) ---

function generateVerificationCode(signatureBase64: string): string {
    // 1. Decode Base64 to Buffer
    const buf = Buffer.from(signatureBase64, 'base64');
    // 2. Convert to Hex
    const hex = buf.toString('hex').toUpperCase(); // ZIMRA usually uses Uppercase Hex?
    // 3. MD5 Hash
    const md5 = crypto.createHash('md5').update(hex).digest('hex').toUpperCase();

    // Format as XXXX-XXXX-XXXX-XXXX
    return `${md5.slice(0, 4)}-${md5.slice(4, 8)}-${md5.slice(8, 12)}-${md5.slice(12, 16)}`;
}

async function run() {
    console.log("--- Testing ZIMRA Logic ---");

    // 1. Test Close Day String to Sign Construction
    const deviceId = "1234567890";
    const fiscalDayNo = 125;
    const fiscalDayDate = "2023-10-27"; // YYYY-MM-DD

    // Mock Counters
    const counters = [
        { fiscalCounterType: "SaleByTax", fiscalCounterCurrency: "USD", fiscalCounterTaxID: 3, fiscalCounterTaxPercent: 15, fiscalCounterValue: 100.00 },
        { fiscalCounterType: "SaleTaxByTax", fiscalCounterCurrency: "USD", fiscalCounterTaxID: 3, fiscalCounterTaxPercent: 15, fiscalCounterValue: 15.00 },
        { fiscalCounterType: "SaleByTax", fiscalCounterCurrency: "USD", fiscalCounterTaxID: 1, fiscalCounterTaxPercent: 0, fiscalCounterValue: 50.00 } // Exempt
    ];

    // Simulate Sorting
    // ... (Simplified for test)

    // Simulate Concatenation
    // SaleByTax (Type) USD (Curr) 15.00 (Tax%) 10000 (Val)
    const c1 = `SALEBYTAXUSD15.0010000`;
    // SaleTaxByTax (Type) USD (Curr) 15.00 (Tax%) 1500 (Val)
    const c2 = `SALETAXBYTAXUSD15.001500`;
    // SaleByTax (Type) USD (Curr)  (Tax% Empty for ID 1) 5000 (Val)
    const c3 = `SALEBYTAXUSD5000`; // ID 1 Exempt has empty field3?

    const concatenated = c1 + c3 + c2; // Assuming sort order puts TaxID 1 before 3?
    // Wait, let's check sort logic in zimra.ts:
    // Sort by Type (SaleByTax=1 < SaleTaxByTax=2)
    // Then by Feature Key (TaxID). ID 1 < ID 3.
    // So SaleByTax(ID1) comes BEFORE SaleByTax(ID3)?

    // Let's verify sort in zimra.ts logic from memory/reading:
    // "ka - kb" (numbers). Yes 1 < 3.

    const stringToSign = `${deviceId}${fiscalDayNo}${fiscalDayDate}SALEBYTAXUSD5000SALEBYTAXUSD15.0010000SALETAXBYTAXUSD15.001500`;
    console.log("String to Sign (Mock):", stringToSign);

    const signature = signData(stringToSign, privateKeyPem);
    console.log("Signature (Base64):", signature);

    const vCode = generateVerificationCode(signature);
    console.log("Verification Code (MD5 of Hex):", vCode);

    console.log("\nIf this matches user expectations, we should implement/verify this logic in zimra.ts/routes.ts");
}

run();
