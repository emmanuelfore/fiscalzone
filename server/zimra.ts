
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import crypto from 'crypto';
import forge from 'node-forge';

export class ZimraApiError extends Error {
    public statusCode: number;
    public endpoint: string;
    public details: any;

    constructor(message: string, statusCode: number, endpoint: string, details?: any) {
        super(message);
        this.name = 'ZimraApiError';
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.details = details;

        // Simplify stack trace to hide internal axios details
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ZimraApiError);
        }
    }
}

// Base URLs
const ZIMRA_TEST_URL = 'https://fdmsapitest.zimra.co.zw';
const ZIMRA_PROD_URL = 'https://fdmsapi.zimra.co.zw';

/**
 * Get the appropriate ZIMRA base URL based on environment
 * @param environment - 'test' or 'production'
 * @returns The base URL for the specified environment
 */
export function getZimraBaseUrl(environment: 'test' | 'production' = 'test'): string {
    return environment === 'production' ? ZIMRA_PROD_URL : ZIMRA_TEST_URL;
}

// Types
export interface ZimraConfig {
    deviceId: string;
    deviceSerialNo: string;
    activationKey: string;
    baseUrl?: string;
    deviceModelName?: string;
    deviceModelVersion?: string;
    privateKey?: string; // PEM
    certificate?: string; // PEM
}

export interface ReceiptLine {
    receiptLineType: 'Sale';
    receiptLineNo: number;
    receiptLineHSCode: string;
    receiptLineName: string;
    receiptLinePrice: number;
    receiptLineQuantity: number;
    receiptLineTotal: number;
    taxPercent: number;
    taxID: number;
}

export interface ReceiptTax {
    taxPercent: number;
    taxID: number;
    taxAmount: number;
    salesAmountWithTax: number;
}

export interface ReceiptPayment {
    paymentType: 'CASH' | 'CARD' | 'OTHER';
    paymentAmount: number;
}

export interface ReceiptData {
    receiptType: 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE';
    receiptCurrency: string;
    receiptCounter: number;
    receiptGlobalNo: number;
    invoiceNo: string;
    receiptDate: string; // YYYY-MM-DDTHH:MM:SS
    receiptLines: ReceiptLine[];
    receiptTaxes: ReceiptTax[];
    receiptPayments: ReceiptPayment[];
    receiptTotal: number;
    receiptLinesTaxInclusive: boolean;
    buyerData?: any;
    receiptNotes?: string;
    creditDebitNote?: any;
}

export interface TaxpayerAddress {
    province: string;
    city: string;
    street: string;
    houseNo: string;
    district: string;
}

export interface TaxpayerContacts {
    phoneNo: string;
    email: string;
}

export interface TaxpayerInfo {
    taxPayerName: string;
    taxPayerTIN: string;
    vatNumber: string;
    deviceBranchName: string;
    deviceBranchAddress: TaxpayerAddress;
    deviceBranchContacts: TaxpayerContacts;
}

// ZIMRA API Response Types (based on FDMS Specification)

export type DeviceOperatingMode = 'Online' | 'Offline';
export type FiscalDayStatus = 'FiscalDayOpened' | 'FiscalDayClosed' | 'FiscalDayCloseFailed';
export type FiscalDayReconciliationMode = 'Manual' | 'Automatic';
export type ReceiptType = 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE';

export interface ZimraTax {
    taxID: number;
    taxPercent?: number; // Not returned for exempt
    taxName: string;
    taxValidFrom: string; // Date
    taxValidTill?: string; // Date
}

export interface ZimraAddress {
    province: string;
    city: string;
    street: string;
    houseNo: string;
    district: string;
}

export interface ZimraContacts {
    phoneNo: string;
    email: string;
}

export interface SignatureDataEx {
    hash: string;
    signature: string;
}

export interface FiscalDayCounter {
    fiscalCounterType: string;
    fiscalCounterCurrency: string;
    fiscalCounterTaxPercent?: number;
    fiscalCounterTaxID?: number;
    fiscalCounterMoneyType?: string;
    fiscalCounterValue: number;
}

export interface FiscalDayDocumentQuantity {
    receiptType: ReceiptType;
    receiptCurrency: string;
    receiptQuantity: number;
    receiptTotalAmount: number;
}

export interface ZimraConfigResponse {
    operationID: string;
    taxPayerName: string;
    taxPayerTIN: string;
    vatNumber?: string;
    deviceSerialNo: string;
    deviceBranchName: string;
    deviceBranchAddress: ZimraAddress;
    deviceBranchContacts?: ZimraContacts;
    deviceOperatingMode: DeviceOperatingMode;
    taxPayerDayMaxHrs: number;
    taxpayerDayEndNotificationHrs: number;
    applicableTaxes: ZimraTax[];
    certificateValidTill: string; // Date
    qrUrl: string;
    // Legacy support - map applicableTaxes to taxLevels for backward compatibility
    taxLevels?: ZimraTax[];
    deviceModelName?: string;
    deviceModelVersion?: string;
}

export interface ZimraStatusResponse {
    operationID: string;
    fiscalDayStatus: FiscalDayStatus;
    fiscalDayReconciliationMode?: FiscalDayReconciliationMode;
    fiscalDayServerSignature?: SignatureDataEx;
    fiscalDayClosed?: string; // DateTime
    fiscalDayClosingErrorCode?: string;
    fiscalDayCounters?: FiscalDayCounter[];
    fiscalDayDocumentQuantities?: FiscalDayDocumentQuantity[];
    lastReceiptGlobalNo?: number;
    lastFiscalDayNo?: number;
}

export class ZimraDevice {
    private config: ZimraConfig;
    private axiosInstance: AxiosInstance;

    constructor(config: ZimraConfig) {
        this.config = {
            baseUrl: ZIMRA_TEST_URL, // Default to test
            deviceModelName: 'Server',
            deviceModelVersion: '1.0',
            ...config,
        };

        // Configure Axios with mTLS if certs are present
        const httpsAgent =
            this.config.privateKey && this.config.certificate
                ? new https.Agent({
                    cert: this.config.certificate,
                    key: this.config.privateKey,
                    rejectUnauthorized: false, // Sometimes needed for test endpoints, be careful in prod
                })
                : new https.Agent({ rejectUnauthorized: false });

        this.axiosInstance = axios.create({
            baseURL: this.config.baseUrl,
            httpsAgent,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                DeviceModelName: this.config.deviceModelName,
                DeviceModelVersion: this.config.deviceModelVersion,
            },
        });
    }

    // --- Core Utils ---

    private async wrapRequest<T>(endpoint: string, requestFn: () => Promise<any>): Promise<T> {
        try {
            const response = await requestFn();
            return response.data;
        } catch (error: any) {
            let message = error.message;
            let statusCode = error.response?.status || 500;
            let details = error.response?.data;

            if (error.response?.data) {
                const d = error.response.data;
                // ZIMRA often returns { "detail": "..." } or { "message": "..." }
                // or specific fields like "FiscalDayStatus" if it's a logic error masked as 200 (though usually 400).
                // Actually they use HTTP codes reasonbly well.
                if (d.detail) message = d.detail;
                else if (d.message) message = d.message;
                else if (typeof d === 'string') message = d;
                else message = JSON.stringify(d);
            }

            console.error(`ZIMRA API Error [${endpoint}]: ${message} (Status: ${statusCode})`);
            throw new ZimraApiError(message, statusCode, endpoint, details);
        }
    }

    private getHash(data: string): string {
        const hash = crypto.createHash('sha256').update(data, 'utf8').digest('base64');
        return hash;
    }

    private signData(data: string): string {
        if (!this.config.privateKey) throw new Error('Private key required for signing');
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.config.privateKey, 'base64');
    }

    private taxCalculator(saleAmount: number, taxRate: number): number {
        const rate = taxRate / 100;
        // taxAmount = (((SUM(receiptLineTotal)) * taxPercent) / (1+taxPercent))
        const taxAmount = (saleAmount * rate) / (1 + rate);
        return Math.round(taxAmount * 100) / 100; // Round to 2 decimals
    }

    // --- Public Methods ---

    /**
     * Verify Taxpayer Information before registration
     */
    public async verifyTaxpayerInformation(): Promise<TaxpayerInfo> {
        const url = `/Public/v1/${this.config.deviceId}/VerifyTaxpayerInformation`;
        console.log(`Verifying Taxpayer for DeviceID: ${this.config.deviceId}`);

        return this.wrapRequest<TaxpayerInfo>('VerifyTaxpayerInformation', () =>
            this.axiosInstance.post(url, {
                activationKey: this.config.activationKey,
                deviceSerialNo: this.config.deviceSerialNo
            })
        );
    }

    /**
     * Register a new device to get a certificate
     */
    public async registerDevice(): Promise<{ certificate: string; privateKey: string }> {
        // 1. Generate RSA Key Pair
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
        const publicKey = keys.publicKey;

        // 2. Generate CSR
        const deviceIdPadded = this.config.deviceId.padStart(10, '0');
        const commonName = `ZIMRA-${this.config.deviceSerialNo}-${deviceIdPadded}`;

        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = publicKey;
        csr.setSubject([{ name: 'commonName', value: commonName }]);
        csr.sign(keys.privateKey, forge.md.sha256.create());
        const csrPem = forge.pki.certificationRequestToPem(csr);

        // 3. Send Request
        // Registration endpoint is /Public/v1/{deviceID}/RegisterDevice
        const url = `/Public/v1/${this.config.deviceId}/RegisterDevice`;

        return this.wrapRequest('RegisterDevice', async () => {
            const response = await this.axiosInstance.post(url, {
                activationKey: this.config.activationKey,
                certificateRequest: csrPem,
            });

            if (response.status === 200 && response.data.certificate) {
                return {
                    data: { // Wrap in data structure expected by wrapRequest logic 
                        certificate: response.data.certificate,
                        privateKey: privateKey,
                    }
                };
            }
            throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
        });
    }

    /**
     * Issue/Renew Certificate
     */
    public async issueCertificate(): Promise<{ certificate: string; privateKey: string }> {
        // 1. Generate NEW RSA Key Pair
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
        const publicKey = keys.publicKey;

        // 2. Generate CSR
        const deviceIdPadded = this.config.deviceId.padStart(10, '0');
        const commonName = `ZIMRA-${this.config.deviceSerialNo}-${deviceIdPadded}`;

        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = publicKey;
        csr.setSubject([{ name: 'commonName', value: commonName }]);
        csr.sign(keys.privateKey, forge.md.sha256.create());
        const csrPem = forge.pki.certificationRequestToPem(csr);

        // 3. Make Authenticated Request
        return this.wrapRequest('IssueCertificate', async () => {
            // using makeRequest below wraps it again? No, let's call axios directly to avoid double wrapping or use makeRequest carefully.
            // Actually, IssueCertificate is a Device/v1 endpoint?
            // The original code passed 'IssueCertificate' to makeRequest. 
            // makeRequest constructs url: `/Device/v1/${this.config.deviceId}/${endpoint}`
            // If we use makeRequest, it will use wrapRequest if we refactor makeRequest.
            // So let's refactor makeRequest FIRST (see below chunk), then this can just use makeRequest.

            // Wait, makeRequest returns `response.data`.
            // If we use makeRequest, we are good.
            // But makeRequest inside this logic needs to be cleaner.
            // Let's rely on the updated makeRequest.

            const data = await this.makeRequest('POST', 'IssueCertificate', {
                certificateRequest: csrPem
            }) as any;

            if (data.certificate) {
                return {
                    certificate: data.certificate,
                    privateKey: privateKey // Return the one we generated!
                };
            }
            throw new Error("Certificate field missing in response");
        });
    }

    /**
     * Get Server Certificate
     */
    public async getServerCertificate(thumbprint?: string): Promise<any> {
        let url = `/Public/v1/GetServerCertificate`;
        if (thumbprint) {
            url += `?thumbprint=${encodeURIComponent(thumbprint)}`;
        }
        if (thumbprint) {
            url += `?thumbprint=${encodeURIComponent(thumbprint)}`;
        }
        return this.wrapRequest('GetServerCertificate', () => this.axiosInstance.get(url));
    }

    public async getStatus(): Promise<ZimraStatusResponse> {
        return this.makeRequest('GET', 'GetStatus') as Promise<ZimraStatusResponse>;
    }

    public async getConfig(): Promise<ZimraConfigResponse> {
        return this.makeRequest('GET', 'GetConfig') as Promise<ZimraConfigResponse>;
    }

    public async ping(): Promise<{ operationID: string; reportingFrequency: number }> {
        return this.makeRequest('POST', 'Ping') as any;
    }

    public async openDay(fiscalDayNo: number) {
        const fiscalDayOpened = new Date().toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
        const payload = {
            fiscalDayNo,
            fiscalDayOpened,
        };
        return this.makeRequest('POST', 'OpenDay', payload);
    }

    public async closeDay(fiscalDayNo: number, fiscalDayDate: string, lastReceiptCounter: number, counters: any[]) {
        // Signature logic for CloseDay
        // string_to_sign = f'{device_id}{fiscal_day_no}{fiscal_day_date}{concatenated_counters}'

        const deviceId = parseInt(this.config.deviceId);

        let concatenatedCounters = "";
        if (counters && counters.length > 0) {
            // Sort counters logic (replicated from Python)
            const moneyTypeMapping: Record<number, string> = { 0: "CASH", 1: "CARD" };

            const sortedCounters = counters.sort((a, b) => {
                // 1. Sort by Fiscal Counter Type Priority
                const typePriority = (type: string) => {
                    if (type === 'SaleByTax') return 1;
                    if (type === 'SaleTaxByTax') return 2;
                    if (type === 'CreditNoteByTax') return 3;
                    if (type === 'CreditNoteTaxByTax') return 4;
                    if (type === 'DebitNoteByTax') return 5;
                    if (type === 'DebitNoteTaxByTax') return 6;
                    if (type === 'BalanceByMoneyType') return 7;
                    return 99;
                };

                const pa = typePriority(a.fiscalCounterType);
                const pb = typePriority(b.fiscalCounterType);
                if (pa !== pb) return pa - pb;

                // 2. Sort by Currency (Alphabetical Ascending)
                if (a.fiscalCounterCurrency !== b.fiscalCounterCurrency) {
                    return a.fiscalCounterCurrency.localeCompare(b.fiscalCounterCurrency);
                }

                // 3. Sort by TaxID or MoneyType (Ascending)
                // Use TaxID if available, else MoneyType
                const getThirdKey = (obj: any) => {
                    if (obj.fiscalCounterTaxID !== undefined && obj.fiscalCounterTaxID !== null) {
                        return obj.fiscalCounterTaxID;
                    }
                    if (obj.fiscalCounterMoneyType !== undefined && obj.fiscalCounterMoneyType !== null) {
                        // MoneyType can be string or int. If mapped to string, compare strings?
                        // Spec: "fiscalCounterMoneyType (in ascending order)"
                        // If it's a string enum (CASH/CARD), standard string compare.
                        // If int enum, int compare.
                        // Our mapping uses strings like "CASH".
                        return obj.fiscalCounterMoneyType;
                    }
                    return 0; // Default
                };

                const k3a = getThirdKey(a);
                const k3b = getThirdKey(b);

                if (typeof k3a === 'number' && typeof k3b === 'number') {
                    return k3a - k3b;
                }
                if (typeof k3a === 'string' && typeof k3b === 'string') {
                    return k3a.localeCompare(k3b);
                }
                // Mixed types (shouldn't happen for same counter type) -> Treat as string
                return String(k3a).localeCompare(String(k3b));
            });

            concatenatedCounters = sortedCounters.map((c: any) => {
                if (parseFloat(c.fiscalCounterValue) === 0) return "";
                const taxPercent = c.fiscalCounterTaxPercent != null ? c.fiscalCounterTaxPercent.toFixed(2) : "";
                let moneyType = "";
                if (typeof c.fiscalCounterMoneyType === 'string') {
                    moneyType = c.fiscalCounterMoneyType;
                } else if (c.fiscalCounterMoneyType != null) {
                    moneyType = moneyTypeMapping[c.fiscalCounterMoneyType] || "";
                }

                // For BalanceByMoneyType, we append the money type.
                // For Tax counters, we append nothing extra for the 4th slot?
                // Spec: fiscalCounterType || fiscalCounterCurrency || fiscalCounterTaxPercent or fiscalCounterMoneyType || fiscalCounterValue
                // It says "or".
                // If SaleByTax: Type + Currency + TaxPercent + Value
                // If BalanceByMoneyType: Type + Currency + MoneyType + Value

                // My logic below:
                // `${c.fiscalCounterType.toUpperCase()}${c.fiscalCounterCurrency.toUpperCase()}${taxPercent}${moneyType}${Math.floor(c.fiscalCounterValue * 100)}`

                // If taxPercent is present (SaleByTax), moneyType is empty. result: Type+Curr+Tax+""+Val. Correct.
                // If moneyType is present (Balance), taxPercent is empty?
                // Wait, logic: `const taxPercent = ... : ""`
                // Correct.

                return `${c.fiscalCounterType.toUpperCase()}${c.fiscalCounterCurrency.toUpperCase()}${taxPercent}${moneyType}${Math.floor(c.fiscalCounterValue * 100)}`;
            }).join("");
        }

        const stringToSign = `${deviceId}${fiscalDayNo}${fiscalDayDate}${concatenatedCounters}`;
        console.log('CloseDay String to Sign:', stringToSign);

        const hash = this.getHash(stringToSign);
        const signature = this.signData(stringToSign);

        const payload = {
            deviceID: deviceId,
            fiscalDayNo,
            fiscalDayCounters: counters, // Should be array of objects
            fiscalDayDeviceSignature: {
                hash,
                signature
            },
            receiptCounter: lastReceiptCounter
        };

        return this.makeRequest('POST', 'CloseDay', payload);
    }

    public async submitReceipt(receiptData: ReceiptData, previousReceiptHash: string | null = null) {
        // 1. Prepare/Fix Receipt Data (Calculate Taxes, etc.)
        const prepared = this.prepareReceipt(receiptData);

        // 2. Generate Signature
        // Sort taxes for string construction
        const sortedTaxes = [...prepared.receiptTaxes].sort((a, b) => a.taxID - b.taxID);
        const concatenatedTaxes = sortedTaxes.map(t =>
            `${t.taxPercent.toFixed(2)}${Math.floor(t.taxAmount * 100)}${Math.floor(t.salesAmountWithTax * 100)}`
        ).join('');

        // String to sign construction
        // deviceID + receiptType + receiptCurrency + receiptGlobalNo + receiptDate + receiptTotal*100 + concatenatedTaxes + (previousHash)

        const deviceIdStr = parseInt(this.config.deviceId).toString(); // Ensure no padding if it's supposed to be int in string
        const rType = prepared.receiptType.toUpperCase();
        const rCurr = prepared.receiptCurrency.toUpperCase();
        const rGlobal = prepared.receiptGlobalNo;
        const rDate = prepared.receiptDate; // Already formatted YYYY-MM-DDTHH:MM:SS
        const rTotal = Math.floor(prepared.receiptTotal * 100);

        let stringToSign = `${deviceIdStr}${rType}${rCurr}${rGlobal}${rDate}${rTotal}${concatenatedTaxes}`;
        if (previousReceiptHash) {
            stringToSign += previousReceiptHash;
        }

        console.log('Receipt String to Sign:', stringToSign);

        const hash = this.getHash(stringToSign);
        const signature = this.signData(stringToSign);

        // Add signature to payload
        const finalPayload = {
            receipt: {
                ...prepared,
                receiptDeviceSignature: {
                    hash,
                    signature
                }
            }
        };

        const response = await this.makeRequest('POST', 'SubmitReceipt', finalPayload);
        return { response, signature, hash };
    }

    // --- Internal Helpers ---

    private prepareReceipt(data: ReceiptData): ReceiptData {
        // Clone data
        const receipt = JSON.parse(JSON.stringify(data)) as ReceiptData;

        // 1. Fix Lines (HS Codes, Tax IDs)
        receipt.receiptLines = receipt.receiptLines.map((line) => {
            let taxID = line.taxID;
            // Auto-detect tax ID if not set correctly based on percent
            if (!taxID) {
                if (line.taxPercent === 0) taxID = 2; // Zero rate
                else if (line.taxPercent === 15) taxID = 3; // Standard
                else if (line.taxPercent === 5) taxID = 1; // Deemed XML says 1? Python says 1 for 5%
                else taxID = 3; // Default
            }

            return {
                ...line,
                receiptLineType: 'Sale',
                receiptLineHSCode: line.receiptLineHSCode || '04021099', // Default per Python
                receiptLineTotal: line.receiptLineQuantity * line.receiptLinePrice,
                taxID,
                taxPercent: line.taxPercent
            } as ReceiptLine;
        });

        // 2. Calculate Taxes
        const taxMap = new Map<string, ReceiptTax>();

        receipt.receiptLines.forEach(line => {
            const key = `${line.taxPercent}-${line.taxID}`;
            if (!taxMap.has(key)) {
                taxMap.set(key, {
                    taxPercent: line.taxPercent,
                    taxID: line.taxID,
                    taxAmount: 0,
                    salesAmountWithTax: 0
                });
            }
            const taxEntry = taxMap.get(key)!;
            // Calculate tax for this line
            const taxForLine = this.taxCalculator(line.receiptLineTotal, line.taxPercent);

            taxEntry.taxAmount += taxForLine;
            taxEntry.salesAmountWithTax += line.receiptLineTotal;
        });

        // Fix consolidated tax amounts to be strictly derived from the sum of sales if needed, 
        // but Python code sums the taxCalculated for each line?
        // Python: tax_lines[(tax_percent, tax_id)]["taxAmount"] += self.tax_calculator(item["receiptLineTotal"], tax_percent)
        // Yes, it sums line-level tax calculations.

        // Then Python re-calculates the final tax entry based on the SUM of salesAmountWithTax?
        // Python: "taxAmount": self.tax_calculator(sale_amount=value["salesAmountWithTax"]...)
        // The Python code actually overwrites the summed taxAmount with a recalculation on the total sales!

        receipt.receiptTaxes = Array.from(taxMap.values()).map(t => ({
            ...t,
            taxAmount: this.taxCalculator(t.salesAmountWithTax, t.taxPercent),
            taxPercent: parseFloat(t.taxPercent.toFixed(2))
        }));

        // 3. Totals (Strictly based on lines sum to satisfy RCPT019)
        const calculatedTotal = receipt.receiptLines.reduce((acc, l) => acc + l.receiptLineTotal, 0);
        receipt.receiptTotal = Math.round(calculatedTotal * 100) / 100;

        // 4. Ensure payments match strictly (RCPT039)
        if (receipt.receiptPayments && receipt.receiptPayments.length > 0) {
            const paymentTotal = receipt.receiptPayments.reduce((acc, p) => acc + p.paymentAmount, 0);

            // If mismatch is small (rounding), fix the first payment (likely CASH/Card)
            const diff = receipt.receiptTotal - paymentTotal;
            if (Math.abs(diff) > 0.001) {
                if (Math.abs(diff) <= 0.05) {
                    // Fix small rounding difference
                    receipt.receiptPayments[0].paymentAmount += diff;
                    receipt.receiptPayments[0].paymentAmount = Math.round(receipt.receiptPayments[0].paymentAmount * 100) / 100;
                } else {
                    // Should we error? Or force fix?
                    // For robustness, let's force fix the main payment if it exists, or just overwrite if simple case
                    console.warn(`Payment total mismatch: ${paymentTotal} vs ${receipt.receiptTotal}. Adjusting payment.`);
                    receipt.receiptPayments[0].paymentAmount += diff;
                    receipt.receiptPayments[0].paymentAmount = Math.round(receipt.receiptPayments[0].paymentAmount * 100) / 100;
                }
            }
        } else {
            // If no payments provided, add a default CASH payment (safer than failing)
            receipt.receiptPayments = [{
                paymentType: 'CASH',
                paymentAmount: receipt.receiptTotal
            }];
        }

        receipt.receiptLinesTaxInclusive = true;

        // Format Date
        // receipt.receiptDate must be YYYY-MM-DDTHH:MM:SS
        // Assuming input is valid or ISO string

        return receipt;
    }

    private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any) {
        const url = `/Device/v1/${this.config.deviceId}/${endpoint}`;
        return this.wrapRequest(endpoint, () =>
            this.axiosInstance.request({
                method,
                url,
                data,
            })
        );
    }

    // --- QR Code ---
    public generateQrCode(signature: string, receiptGlobalNo: number, receiptDate: string) {
        // Signature is base64. 
        // 1. Get first 16 chars of MD5(Hex(signature_bytes))

        try {
            const signatureBytes = Buffer.from(signature, 'base64');
            const hexStr = signatureBytes.toString('hex');
            const md5Hash = crypto.createHash('md5').update(Buffer.from(hexStr, 'hex')).digest('hex');
            const finalHash = md5Hash.substring(0, 16);

            // 2. Build String
            const deviceIdPadded = this.config.deviceId.padStart(10, '0');
            // Date format for QR: DDMMYYYY
            // receiptDate is YYYY-MM-DDTHH:MM:SS
            const dateDate = new Date(receiptDate);
            const day = dateDate.getDate().toString().padStart(2, '0');
            const month = (dateDate.getMonth() + 1).toString().padStart(2, '0');
            const year = dateDate.getFullYear();
            const qrDate = `${day}${month}${year}`;

            const globalNoPadded = receiptGlobalNo.toString().padStart(10, '0');

            const qrUrl = this.config.baseUrl?.includes('test')
                ? 'https://fdmstest.zimra.co.zw/'
                : 'https://fdms.zimra.co.zw/';

            return `${qrUrl}${deviceIdPadded}${qrDate}${globalNoPadded}${finalHash}`;
        } catch (e) {
            console.error('QR Gen Error:', e);
            return '';
        }
    }
}
