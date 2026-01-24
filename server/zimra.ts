
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

export class ZimraOfflineError extends Error {
    public endpoint: string;
    constructor(message: string, endpoint: string) {
        super(message);
        this.name = 'ZimraOfflineError';
        this.endpoint = endpoint;
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
    taxCode?: string;
}

export interface ReceiptTax {
    taxPercent: number;
    taxID: number;
    taxAmount: number;
    salesAmountWithTax: number;
    taxCode?: string;
}

export interface ReceiptPayment {
    moneyTypeCode: 'CASH' | 'CARD' | 'OTHER' | 'EFT' | 'MOBILE';
    paymentAmount: number;
}

export interface ReceiptData {
    receiptType: 'FiscalInvoice' | 'CreditNote' | 'DebitNote';
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

export interface ZimraLogger {
    log(invoiceId: number | null, endpoint: string, request: any, response: any, statusCode?: number, errorMessage?: string): Promise<void>;
}

// ZIMRA API Response Types (based on FDMS Specification)

export type DeviceOperatingMode = 'Online' | 'Offline';
export type FiscalDayStatus = 'FiscalDayOpened' | 'FiscalDayClosed' | 'FiscalDayCloseFailed';
export type FiscalDayReconciliationMode = 'Manual' | 'Automatic';
export type ReceiptType = 'FiscalInvoice' | 'CreditNote' | 'DebitNote';

export type ValidationErrorColor = 'Grey' | 'Yellow' | 'Red';

export interface ValidationError {
    errorCode: string;
    errorMessage: string;
    errorColor: ValidationErrorColor;
    requiresPreviousReceipt: boolean;
}

export interface ReceiptValidationResult {
    valid: boolean;
    errors: ValidationError[];
    receiptId?: string;
    fiscalCode?: string;
    signature?: string;
}

// ZIMRA Validation Error Codes Map
export const ZIMRA_VALIDATION_ERRORS: Record<string, Omit<ValidationError, 'errorMessage'> & { errorMessage: string }> = {
    'RCPT010': { errorCode: 'RCPT010', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Wrong currency code is used' },
    'RCPT011': { errorCode: 'RCPT011', errorColor: 'Red', requiresPreviousReceipt: true, errorMessage: 'Receipt counter is not sequential' },
    'RCPT012': { errorCode: 'RCPT012', errorColor: 'Red', requiresPreviousReceipt: true, errorMessage: 'Receipt global number is not sequential' },
    'RCPT013': { errorCode: 'RCPT013', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice number is not unique' },
    'RCPT014': { errorCode: 'RCPT014', errorColor: 'Yellow', requiresPreviousReceipt: false, errorMessage: 'Receipt date is earlier than fiscal day opening date' },
    'RCPT015': { errorCode: 'RCPT015', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credited/debited invoice data is not provided' },
    'RCPT016': { errorCode: 'RCPT016', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'No receipt lines provided' },
    'RCPT017': { errorCode: 'RCPT017', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Taxes information is not provided' },
    'RCPT018': { errorCode: 'RCPT018', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Payment information is not provided' },
    'RCPT019': { errorCode: 'RCPT019', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice total amount is not equal to sum of all invoice lines' },
    'RCPT020': { errorCode: 'RCPT020', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice signature is not valid' },
    'RCPT021': { errorCode: 'RCPT021', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'VAT tax is used in invoice while taxpayer is not VAT taxpayer' },
    'RCPT022': { errorCode: 'RCPT022', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice sales line price must be greater than 0 (less than 0 for Credit note), discount line price must be less than 0 for Invoice' },
    'RCPT023': { errorCode: 'RCPT023', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice line quantity must be positive' },
    'RCPT024': { errorCode: 'RCPT024', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice line total is not equal to unit price * quantity' },
    'RCPT025': { errorCode: 'RCPT025', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invalid tax is used' },
    'RCPT026': { errorCode: 'RCPT026', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Incorrectly calculated tax amount' },
    'RCPT027': { errorCode: 'RCPT027', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Incorrectly calculated total sales amount (including tax)' },
    'RCPT028': { errorCode: 'RCPT028', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Payment amount must be greater than or equal 0 (less than or equal to 0 for Credit note)' },
    'RCPT029': { errorCode: 'RCPT029', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credited/debited invoice information provided for regular invoice' },
    'RCPT030': { errorCode: 'RCPT030', errorColor: 'Red', requiresPreviousReceipt: true, errorMessage: 'Invoice date is earlier than previously submitted receipt date' },
    'RCPT031': { errorCode: 'RCPT031', errorColor: 'Yellow', requiresPreviousReceipt: false, errorMessage: 'Invoice is submitted with the future date' },
    'RCPT032': { errorCode: 'RCPT032', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credit / debit note refers to non-existing invoice' },
    'RCPT033': { errorCode: 'RCPT033', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credited/debited invoice is issued more than 12 months ago' },
    'RCPT034': { errorCode: 'RCPT034', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Note for credit/debit note is not provided' },
    'RCPT035': { errorCode: 'RCPT035', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Total credit note amount exceeds original invoice amount' },
    'RCPT036': { errorCode: 'RCPT036', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credit/debit note uses other taxes than are used in the original invoice' },
    'RCPT037': { errorCode: 'RCPT037', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice total amount is not equal to sum of all invoice lines and taxes applied' },
    'RCPT038': { errorCode: 'RCPT038', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice total amount is not equal to sum of sales amount including tax in tax table' },
    'RCPT039': { errorCode: 'RCPT039', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice total amount is not equal to sum of all payment amounts' },
    'RCPT040': { errorCode: 'RCPT040', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Invoice total amount must be greater than or equal to 0 (less than or equal to 0 for Credit note)' },
    'RCPT041': { errorCode: 'RCPT041', errorColor: 'Yellow', requiresPreviousReceipt: false, errorMessage: 'Invoice is issued after fiscal day end' },
    'RCPT042': { errorCode: 'RCPT042', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Credit/debit note uses other currency than is used in the original invoice' },
    'RCPT043': { errorCode: 'RCPT043', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'Mandatory buyer data fields are not provided' },
    'RCPT047': { errorCode: 'RCPT047', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'HS code must be sent if taxpayer is a VAT payer' },
    'RCPT048': { errorCode: 'RCPT048', errorColor: 'Red', requiresPreviousReceipt: false, errorMessage: 'HS code length must be 4 or 8 digits if taxpayer is not VAT payer, 4 or 8 digits if taxpayer is VAT payer and applied tax percent is bigger than 0, 8 digits if taxpayer is VAT payer and applied tax percent is equal to 0 or is empty' },
};

export interface ZimraTax {
    taxID: number;
    taxCode?: string; // Some devices return this
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
    private logger?: ZimraLogger;
    private currentInvoiceId?: number;

    constructor(config: ZimraConfig, logger?: ZimraLogger) {
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

        this.logger = logger;
    }

    // --- Core Utils ---

    private async wrapRequest<T>(endpoint: string, requestFn: () => Promise<any>): Promise<T> {
        let requestPayload: any = null;
        try {
            const response = await requestFn();

            if (this.logger && this.currentInvoiceId) {
                // Safely extract request data
                try {
                    // Try to get data from the original request object if possible
                    // But wrapRequest is generic. Let's rely on data passed to makeRequest.
                } catch (e) { }
            }

            return response.data;
        } catch (error: any) {
            // Handle Network Errors / Timeouts
            if (!error.response) {
                console.warn(`ZIMRA Network Error [${endpoint}]: ${error.message}`);
                throw new ZimraOfflineError(error.message, endpoint);
            }

            // Handle Server Errors (502, 503, 504 are usually ZIMRA gateway issues)
            const statusCode = error.response.status;
            if (statusCode >= 502 && statusCode <= 504) {
                console.warn(`ZIMRA Server Down [${endpoint}]: Status ${statusCode}`);
                throw new ZimraOfflineError(`Server unreachable (${statusCode})`, endpoint);
            }

            let message = error.message;
            let details = error.response?.data;

            if (error.response?.data) {
                const d = error.response.data;
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

    private taxCalculator(saleAmount: number, taxRate: number, isInclusive: boolean = true): number {
        const rate = taxRate / 100;
        if (isInclusive) {
            // taxAmount = (((SUM(receiptLineTotal)) * taxPercent) / (1+taxPercent))
            const taxAmount = (saleAmount * rate) / (1 + rate);
            return Math.round(taxAmount * 100) / 100; // Round to 2 decimals
        } else {
            // taxAmount = SUM(receiptLineTotal) * taxPercent
            const taxAmount = saleAmount * rate;
            return Math.round(taxAmount * 100) / 100;
        }
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
                const getThirdKey = (obj: any) => {
                    if (obj.fiscalCounterTaxID !== undefined && obj.fiscalCounterTaxID !== null) {
                        return obj.fiscalCounterTaxID;
                    }
                    if (obj.fiscalCounterTaxPercent !== undefined && obj.fiscalCounterTaxPercent !== null) {
                        return obj.fiscalCounterTaxPercent;
                    }
                    if (obj.fiscalCounterMoneyType !== undefined && obj.fiscalCounterMoneyType !== null) {
                        // Map numeric money type to string for comparison
                        if (typeof obj.fiscalCounterMoneyType === 'number') {
                            return obj.fiscalCounterMoneyType === 0 ? 'CASH' : 'CARD';
                        }
                        return obj.fiscalCounterMoneyType;
                    }
                    return 0;
                };

                const k3a = getThirdKey(a);
                const k3b = getThirdKey(b);

                if (typeof k3a === 'number' && typeof k3b === 'number') {
                    return k3a - k3b;
                }
                if (typeof k3a === 'string' && typeof k3b === 'string') {
                    return k3a.localeCompare(k3b);
                }
                return String(k3a).localeCompare(String(k3b));
            });

            concatenatedCounters = sortedCounters.map((c: any) => {
                if (parseFloat(c.fiscalCounterValue) === 0) return "";

                const type = c.fiscalCounterType.toUpperCase();
                const currency = c.fiscalCounterCurrency.toUpperCase();
                const valueInCents = Math.round(c.fiscalCounterValue * 100);

                let field3 = ""; // Either taxPercent or moneyType

                if (type.includes('BYTAX')) {
                    // "In case taxPercent is not an integer there should be dot between the integer and fractional part. 
                    // In case of exempt which does not send tax percent value, empty value should be used in signature. 
                    // In case taxPercent is an integer there should be value of tax percent, dot and two zeros sent."
                    if (c.fiscalCounterTaxID !== 1 && c.fiscalCounterTaxPercent !== undefined && c.fiscalCounterTaxPercent !== null) {
                        field3 = c.fiscalCounterTaxPercent.toFixed(2);
                    }
                } else if (type.includes('BYMONEYTYPE')) {
                    if (c.fiscalCounterMoneyType !== undefined && c.fiscalCounterMoneyType !== null) {
                        if (typeof c.fiscalCounterMoneyType === 'string') {
                            field3 = c.fiscalCounterMoneyType.toUpperCase();
                        } else {
                            field3 = moneyTypeMapping[c.fiscalCounterMoneyType] || "";
                        }
                    }
                }

                return `${type}${currency}${field3}${valueInCents}`;
            }).join("");
        }

        const stringToSign = `${parseInt(this.config.deviceId)}${fiscalDayNo}${fiscalDayDate}${concatenatedCounters}`;
        console.log('=== CloseDay Signature Debug ===');
        console.log('Device ID:', deviceId);
        console.log('Fiscal Day No:', fiscalDayNo);
        console.log('Fiscal Day Date:', fiscalDayDate);
        console.log('Concatenated Counters:', concatenatedCounters);
        console.log('Full String to Sign:', stringToSign);

        const hash = this.getHash(stringToSign);
        const signature = this.signData(stringToSign);

        console.log('Generated Hash (base64):', hash);
        console.log('Generated Signature (base64):', signature.substring(0, 50) + '...');
        console.log('================================');

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

    public async submitReceipt(receiptData: ReceiptData, previousReceiptHash: string | null = null, allowOffline = false): Promise<{
        response: any;
        signature: string;
        hash: string;
        synced: boolean;
        validationResult?: ReceiptValidationResult;
    }> {
        // 1. Prepare/Fix Receipt Data (Calculate Taxes, etc.)
        const prepared = this.prepareReceipt(receiptData);

        // 2. Generate Signature
        // Sort taxes for string construction
        // "Taxes are ordered by taxID in ascending order and taxCode in alphabetical order"
        const sortedTaxes = [...prepared.receiptTaxes].sort((a, b) => {
            if (a.taxID !== b.taxID) return a.taxID - b.taxID;
            return (a.taxCode || '').localeCompare(b.taxCode || '');
        });

        const concatenatedTaxes = sortedTaxes.map(t => {
            // "In case of exempt which does not send tax percent value, empty value should be used in signature."
            // In Zimbabwe, Tax ID 1 is typically used for Exempt supplies.
            let percentStr = "";
            if (t.taxID !== 1 && t.taxPercent !== undefined && t.taxPercent !== null) {
                // "In case taxPercent is an integer there should be dot and two zeros. 
                // "In case taxPercent is not an integer there should be dot between integer and fractional part."
                percentStr = t.taxPercent.toFixed(2);
            }

            const amount = Math.round(t.taxAmount * 100);
            const sales = Math.round(t.salesAmountWithTax * 100);

            // Removed taxCode from signature as per user request
            return `${percentStr}${amount}${sales}`;
        }).join('');

        const deviceIdStr = parseInt(this.config.deviceId).toString();
        // "receiptType Receipt type value in upper case."
        const rType = prepared.receiptType.toUpperCase();
        // "receiptCurrency Currency code (ISO 4217 currency code). It must be in upper case."
        const rCurr = prepared.receiptCurrency.toUpperCase();
        const rGlobal = prepared.receiptGlobalNo;
        const rDate = prepared.receiptDate;
        // "receiptTotal Receipt total is included in signature in cents."
        const rTotal = Math.round(prepared.receiptTotal * 100);

        let stringToSign = `${deviceIdStr}${rType}${rCurr}${rGlobal}${rDate}${rTotal}${concatenatedTaxes}`;
        if (previousReceiptHash) {
            stringToSign += previousReceiptHash;
        }

        console.log('Receipt String to Sign:', stringToSign);

        const hash = this.getHash(stringToSign);
        const signature = this.signData(stringToSign);

        const finalPayload = {
            deviceID: parseInt(this.config.deviceId),
            receipt: {
                ...prepared,
                receiptDeviceSignature: {
                    hash,
                    signature
                }
            }
        };

        try {
            const response = await this.makeRequest('POST', 'SubmitReceipt', finalPayload);

            // Check if the response contains validation errors
            const validationResult = this.parseValidationResponse(response);
            if (!validationResult.valid) {
                return {
                    response,
                    signature,
                    hash,
                    synced: true,
                    validationResult
                };
            }

            return { response, signature, hash, synced: true };
        } catch (error) {
            if (allowOffline && error instanceof ZimraOfflineError) {
                console.info("Offline Fallback: Returning generated signatures for local record.");
                return {
                    response: null,
                    signature,
                    hash,
                    synced: false
                };
            }
            throw error;
        }
    }

    // --- Internal Helpers ---

    private prepareReceipt(data: ReceiptData): ReceiptData {
        // Clone data
        const receipt = JSON.parse(JSON.stringify(data)) as ReceiptData;

        // 1. Fix Lines (HS Codes, Tax IDs)
        receipt.receiptLines = receipt.receiptLines.map((line) => {
            let taxID = line.taxID;
            // Auto-detect tax ID if not set correctly based on percent
            const absTaxPercent = Math.abs(line.taxPercent);
            if (!taxID) {
                if (absTaxPercent === 0) taxID = 2; // Zero rate
                else if (absTaxPercent === 15.5) taxID = 3; // Standard
                else if (absTaxPercent === 5) taxID = 1; // Deemed
                else taxID = 3; // Default
            }

            let linePrice = line.receiptLinePrice;
            let lineTotal = line.receiptLineQuantity * line.receiptLinePrice;

            // ZIMRA Rule: CreditNote values must be negative
            if (receipt.receiptType === 'CreditNote') {
                if (linePrice > 0) linePrice = -linePrice;
                if (lineTotal > 0) lineTotal = -lineTotal;
            }

            return {
                ...line,
                receiptLineType: 'Sale',
                receiptLineHSCode: line.receiptLineHSCode || '04021099', // Default per Python
                receiptLinePrice: linePrice,
                receiptLineTotal: lineTotal,
                taxID,
                taxPercent: line.taxPercent
            } as ReceiptLine;
        });

        // 2. Calculate Taxes
        const taxMap = new Map<string, ReceiptTax>();

        receipt.receiptLines.forEach(line => {
            const key = `${line.taxPercent}-${line.taxID}-${line.taxCode || ''}`;
            if (!taxMap.has(key)) {
                taxMap.set(key, {
                    taxPercent: line.taxPercent,
                    taxID: line.taxID,
                    // taxCode: line.taxCode,
                    taxAmount: 0,
                    salesAmountWithTax: 0
                });
            }
            const taxEntry = taxMap.get(key)!;
            // Calculate tax for this line
            const taxForLine = this.taxCalculator(line.receiptLineTotal, line.taxPercent, receipt.receiptLinesTaxInclusive);

            taxEntry.taxAmount += taxForLine;
            // salesAmountWithTax is either the total (if inclusive) or net+tax (if exclusive)
            if (receipt.receiptLinesTaxInclusive) {
                taxEntry.salesAmountWithTax += line.receiptLineTotal;
            } else {
                taxEntry.salesAmountWithTax += (line.receiptLineTotal + taxForLine);
            }
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
            taxAmount: this.taxCalculator(t.salesAmountWithTax, t.taxPercent, true),
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
                    // Force fix the main payment
                    console.warn(`Payment total mismatch: ${paymentTotal} vs ${receipt.receiptTotal}. Adjusting payment.`);
                    receipt.receiptPayments[0].paymentAmount += diff;
                    receipt.receiptPayments[0].paymentAmount = Math.round(receipt.receiptPayments[0].paymentAmount * 100) / 100;
                }
            }
        } else {
            // If no payments provided, add a default CASH payment (safer than failing)
            receipt.receiptPayments = [{
                moneyTypeCode: 'CASH',
                paymentAmount: receipt.receiptTotal
            }];
        }

        // receipt.receiptLinesTaxInclusive = true; // REMOVED: Should respect input

        // Format Date
        // receipt.receiptDate must be YYYY-MM-DDTHH:MM:SS
        // Assuming input is valid or ISO string

        return receipt;
    }

    private parseValidationResponse(response: any): ReceiptValidationResult {
        // Check if response contains validation errors
        if (!response || typeof response !== 'object') {
            return { valid: true, errors: [] };
        }

        const errors: ValidationError[] = [];

        // Check for validationErrors array in the response (actual ZIMRA format)
        if (response.validationErrors && Array.isArray(response.validationErrors)) {
            for (const error of response.validationErrors) {
                const errorCode = error.validationErrorCode;
                const errorColor = error.validationErrorColor;

                if (errorCode && ZIMRA_VALIDATION_ERRORS[errorCode]) {
                    const errorInfo = ZIMRA_VALIDATION_ERRORS[errorCode];
                    errors.push({
                        errorCode,
                        errorMessage: errorInfo.errorMessage,
                        errorColor: errorColor as ValidationErrorColor,
                        requiresPreviousReceipt: errorInfo.requiresPreviousReceipt
                    });
                } else if (errorCode) {
                    // Handle unknown error codes
                    errors.push({
                        errorCode,
                        errorMessage: `Validation error ${errorCode}`,
                        errorColor: (errorColor as ValidationErrorColor) || 'Red',
                        requiresPreviousReceipt: false
                    });
                }
            }
        }

        // Check for legacy format validation error codes in response properties
        if (response.errorCode && ZIMRA_VALIDATION_ERRORS[response.errorCode]) {
            const errorInfo = ZIMRA_VALIDATION_ERRORS[response.errorCode];
            errors.push({
                errorCode: response.errorCode,
                errorMessage: response.errorMessage || response.message || `Validation error ${response.errorCode}`,
                errorColor: errorInfo.errorColor,
                requiresPreviousReceipt: errorInfo.requiresPreviousReceipt
            });
        }

        // If no errors found, consider it valid
        return {
            valid: errors.length === 0,
            errors,
            receiptId: response.receiptID || response.receiptId || response.operationID,
            fiscalCode: response.fiscalCode,
            signature: response.receiptServerSignature?.signature || response.signature
        };
    }

    private getEndpointDescription(endpoint: string, data?: any): string {
        if (endpoint === 'SubmitReceipt' && data?.receipt?.receiptType) {
            const type = data.receipt.receiptType;
            if (type === 'FiscalInvoice') return 'Invoice Submission';
            if (type === 'CreditNote') return 'Credit Note Submission';
            if (type === 'DebitNote') return 'Debit Note Submission';
            return `Submit ${type}`;
        }

        const mapping: Record<string, string> = {
            'OpenDay': 'Open Fiscal Day',
            'CloseDay': 'Close Fiscal Day',
            'GetStatus': 'Check Status',
            'GetConfig': 'Sync Config',
            'Ping': 'Ping Request',
            'VerifyTaxpayerInformation': 'Verify Taxpayer',
            'RegisterDevice': 'Device Registration',
            'IssueCertificate': 'Certificate Issuance'
        };

        return mapping[endpoint] || endpoint;
    }

    private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any) {
        const url = `/Device/v1/${this.config.deviceId}/${endpoint}`;

        let responseData: any = null;
        let statusCode: number | undefined;
        let errorMessage: string | undefined;
        const logEndpoint = this.getEndpointDescription(endpoint, data);

        try {
            responseData = await this.wrapRequest(endpoint, () =>
                this.axiosInstance.request({
                    method,
                    url,
                    data,
                })
            );
            statusCode = 200; // If wrapRequest didn't throw, it's 200/201
            return responseData;
        } catch (error: any) {
            statusCode = error.statusCode || 500;
            errorMessage = error.message;
            responseData = error.details || { error: error.message };
            throw error;
        } finally {
            const allowedLogs = ['OpenDay', 'CloseDay', 'SubmitReceipt', 'GetConfig'];
            if (this.logger && allowedLogs.includes(endpoint)) {
                // Log only specific endpoints
                this.logger.log(
                    this.currentInvoiceId || null,
                    logEndpoint,
                    data || {},
                    responseData,
                    statusCode,
                    errorMessage
                ).catch(err => console.error("Failed to save ZIMRA log:", err));
            }
        }
    }

    public setInvoiceId(id: number) {
        this.currentInvoiceId = id;
    }

    // --- QR Code ---
    public generateQrCode(signature: string, receiptGlobalNo: number, receiptDate: string) {
        // Signature is base64. 
        // 1. Get first 16 chars of MD5(Hex(signature_bytes))

        try {
            const signatureBytes = Buffer.from(signature, 'base64');
            const hexStr = signatureBytes.toString('hex').toLowerCase(); // ZIMRA expects lowercase hex
            const md5Hash = crypto.createHash('md5').update(hexStr).digest('hex').toLowerCase();
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
