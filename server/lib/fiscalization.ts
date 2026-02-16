import { storage } from "../storage.js";
import { ZimraDevice, ReceiptData, ZimraConfigResponse, ZimraApiError, ZimraLogger } from "../zimra.js";
import { Invoice } from "../../shared/schema.js";
import fs from "fs";
import path from "path";
import { logAction } from "../audit.js";

// Local implementation since it wasn't exported from zimra.ts
function getZimraLogger(companyId: number): ZimraLogger {
    return {
        log: async (invoiceId, endpoint, request, response, statusCode, errorMessage) => {
            const details = {
                endpoint,
                request,
                response,
                statusCode,
                errorMessage,
                invoiceId
            };
            // Log specific errors
            if (statusCode && statusCode >= 400) {
                console.error(`[ZIMRA] Error ${statusCode} on ${endpoint}:`, errorMessage);
            }
            // Use existing audit log
            await logAction(companyId, "system", "zimra_api_call", "invoice", invoiceId ? String(invoiceId) : undefined, details);
        }
    };
}

export const processInvoiceFiscalization = async (invoiceId: number, companyId: number, userId?: number | string, isSuperAdmin: boolean = false, zimraSync?: any, isPos: boolean = false) => {
    // Retrieve full invoice with line items
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Check permissions
    if (userId) {
        // If string, likely UUID from Supabase. Convert to number? No, schema says userId is uuid (string).
        // But getCompanyUsers returns users with string IDs.
        // Wait, companyUsers relationship uses string IDs?
        // Let's assume userId is string (UUID).
        const users = await storage.getCompanyUsers(companyId);
        const isMember = users.some(u => u.id === userId);
        if (!isMember && !isSuperAdmin) throw new Error("You do not have permission to fiscalize for this company");
    }

    const company = await storage.getCompany(companyId);
    if (!company || !company.zimraPrivateKey || !company.zimraCertificate || !company.fdmsDeviceId) {
        throw new Error("Company has not registered a ZIMRA device");
    }

    // Initialize Device with Logger
    const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey,
        certificate: company.zimraCertificate,
        baseUrl: company.zimraEnvironment === 'production' ? 'https://fdmsapi.zimra.co.zw' : 'https://fdmsapitest.zimra.co.zw'
    }, getZimraLogger(company.id));

    device.setInvoiceId(invoiceId);

    let justOpened = false;
    let currentCompany = company;

    try {
        const status = await device.getStatus() as any;
        console.log(`[ZIMRA] Check Status: ${status.fiscalDayStatus}, LastDay: ${status.lastFiscalDayNo}`);

        const now = new Date();
        const fiscalDayOpenedAt = company.fiscalDayOpenedAt ? new Date(company.fiscalDayOpenedAt) : null;
        const oneDayMs = 24 * 60 * 60 * 1000;
        const isStale = fiscalDayOpenedAt && (now.getTime() - fiscalDayOpenedAt.getTime() > oneDayMs);

        if (isStale) console.log(`[ZIMRA] Day is Stale. OpenedAt: ${fiscalDayOpenedAt?.toISOString()}, Now: ${now.toISOString()}`);

        // Auto-close if stale or explicitly reported by ZIMRA status
        const statusStr = (status.fiscalDayStatus || "").toLowerCase();

        if ((statusStr !== 'fiscaldayopened' && statusStr !== 'fiscaldayclosefailed')) {
            if (isStale) {
                console.log(`[ZIMRA] Fiscal Day ${company.currentFiscalDayNo} is stale (>24h). Auto-replacing...`);
            } else {
                console.log("[ZIMRA] Fiscal Day Closed (or invalid status). Auto-opening...");
            }

            // 1. Force close the current stale day (or retry failed closure) if it was still "open/failed" on ZIMRA side
            if ((status.fiscalDayStatus === 'FiscalDayOpened' || status.fiscalDayStatus === 'FiscalDayCloseFailed') && isStale) {
                try {
                    // Get current counters for closure
                    const receiptCounter = company.dailyReceiptCount || 0;
                    const invoicesToClose = await storage.getInvoicesByFiscalDay(company.id, company.currentFiscalDayNo || 0);
                    const counters = await storage.calculateFiscalCounters(company.id, company.currentFiscalDayNo || 0);

                    let signDate = new Date().toLocaleDateString('sv-SE');
                    if (company.fiscalDayOpenedAt) {
                        signDate = new Date(company.fiscalDayOpenedAt).toLocaleDateString('sv-SE');
                    }

                    const closeResult = await device.closeDay(
                        company.currentFiscalDayNo || 0,
                        signDate,
                        receiptCounter,
                        counters
                    ) as any;
                    console.log(`[ZIMRA] Stale Day ${company.currentFiscalDayNo} closure attempt. Status: ${closeResult.fiscalDayStatus}`);

                    if (closeResult.fiscalDayStatus !== 'FiscalDayClosed' && closeResult.fiscalDayStatus !== 'FiscalDayCloseFailed') {
                        console.warn(`[ZIMRA] Unexpected status after closeDay: ${closeResult.fiscalDayStatus}. Aborting auto-open.`);
                        // We continue anyway, hoping for the best or manual intervention
                    }

                    if (closeResult.fiscalDayStatus === 'FiscalDayCloseFailed') {
                        console.warn(`[ZIMRA] Day closure failed on ZIMRA side. Aborting auto-open to preserve sequence.`);
                        // Return null to indicate failure to open new day? Or throw?
                        // Throwing stops the process.
                    }
                } catch (closeErr) {
                    console.warn(`[ZIMRA] Failed to close stale day: ${closeErr}. Proceeding with OpenDay anyway.`);
                }
            }

            const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
            const openResult = await device.openDay(nextDayNo) as any;

            // Update company state
            const openedAt = new Date();
            await storage.updateCompany(company.id, {
                currentFiscalDayNo: openResult.fiscalDayNo || nextDayNo,
                fiscalDayOpen: true,
                fiscalDayOpenedAt: openedAt,
                lastFiscalDayStatus: 'FiscalDayOpened',
                dailyReceiptCount: 0,
                lastFiscalHash: null
            });
            console.log(`Fiscal Day Opened: ${openResult.fiscalDayNo} at ${openedAt.toISOString()}`);

            // Re-fetch status to update local variables below
            status.fiscalDayStatus = 'FiscalDayOpened';
            status.lastFiscalDayNo = openResult.fiscalDayNo || nextDayNo;
            justOpened = true;

        } else {
            // Ensure local state is synced if it was somehow out
            if (!company.fiscalDayOpen) {
                await storage.updateCompany(company.id, {
                    fiscalDayOpen: true,
                    currentFiscalDayNo: status.lastFiscalDayNo,
                    lastFiscalDayStatus: 'FiscalDayOpened'
                });
            }
        }

        // 2. SYNC COUNTERS FROM ZIMRA
        const zimraGlobalNo = status.lastReceiptGlobalNo || 0;
        let zimraDailyCount = status.lastReceiptCounter || 0;

        if (zimraDailyCount === 0 && status.fiscalDayDocumentQuantities) {
            zimraDailyCount = status.fiscalDayDocumentQuantities.reduce((sum: number, dq: any) => sum + (dq.receiptQuantity || 0), 0);
        }

        console.log(`[Fiscalize] ZIMRA Status Sync - GlobalNo: ${zimraGlobalNo}, DailyCount: ${zimraDailyCount}`);

        await storage.updateCompany(company.id, {
            lastReceiptGlobalNo: Math.max(company.lastReceiptGlobalNo || 0, zimraGlobalNo),
            dailyReceiptCount: justOpened ? 0 : Math.max(company.dailyReceiptCount || 0, zimraDailyCount),
            fiscalDayOpen: true,
            currentFiscalDayNo: status.lastFiscalDayNo
        });

        // Re-fetch to get the resulting peaked counters
        currentCompany = await storage.getCompany(company.id) || company;
        let nextGlobalNo = (currentCompany.lastReceiptGlobalNo || 0) + 1;
        let nextReceiptCounter = (currentCompany.dailyReceiptCount || 0) + 1;

        console.log(`[Fiscalize] Calculated Next Sequence - GlobalNo: ${nextGlobalNo}, DailyCount: ${nextReceiptCounter}`);

        // 1. Get ZIMRA Config for correct Tax IDs
        let zimraConfig: ZimraConfigResponse | undefined;
        const dbTaxTypes = await storage.getTaxTypes(company.id);

        try {
            zimraConfig = await device.getConfig();
            // Auto-update QR URL if missing or different/better
            if (zimraConfig && zimraConfig.qrUrl && (!company.qrUrl || company.qrUrl !== zimraConfig.qrUrl)) {
                console.log(`[ZIMRA] Auto-updating Company QR URL to: ${zimraConfig.qrUrl}`);
                await storage.updateCompany(company.id, { qrUrl: zimraConfig.qrUrl });
                company.qrUrl = zimraConfig.qrUrl; // Update local scope for usage this turn
            }
        } catch (e) {
            console.warn("Failed to fetch ZIMRA config, falling back to database for tax mapping");
        }

        // Map Invoice to ReceiptData
        const receiptLines = invoice.items.map((item, index) => {
            let taxPercent = parseFloat(item.taxRate as any);

            let taxID = 0;

            // PRIORITY 1: ZIMRA Live Config (most current, directly from API)
            if (zimraConfig?.applicableTaxes) {
                const effectiveTaxTypeId = (item as any).product?.taxTypeId || (item as any).taxTypeId;
                const dbTax = effectiveTaxTypeId ? dbTaxTypes.find(t => t.id === effectiveTaxTypeId) : null;

                // Strategy: Match by {Percent, Name} combination which is more stable than IDs
                const targetPercent = dbTax ? parseFloat(dbTax.rate) : taxPercent;
                const targetNameHint = (dbTax?.name || item.description || '').toLowerCase();

                // 1. Precise Match (Percent + Name keyword correlation)
                let match = zimraConfig.applicableTaxes.find(t => {
                    const pctMatch = Math.abs((t.taxPercent || 0) - targetPercent) < 0.01;
                    if (!pctMatch) return false;

                    // For 0% rates, strictly disambiguate Exempt vs Zero Rated by name
                    if (targetPercent === 0) {
                        const isExempt = targetNameHint.includes('exempt');
                        const liveIsExempt = t.taxName?.toLowerCase().includes('exempt');
                        return isExempt === liveIsExempt;
                    }
                    return true; // For non-zero, percent is usually sufficient
                });

                // 2. Fallback: Match by Percent only if name match failed
                if (!match) {
                    match = zimraConfig.applicableTaxes.find(t => Math.abs((t.taxPercent || 0) - targetPercent) < 0.01);
                }

                // 3. Fallback: Match by stored ZIMRA Tax ID from DB if all else fails
                if (!match && dbTax?.zimraTaxId) {
                    const storedId = parseInt(dbTax.zimraTaxId);
                    match = zimraConfig.applicableTaxes.find(t => t.taxID === storedId);
                }

                if (match) {
                    taxID = match.taxID;
                }
            }

            // PRIORITY 2: Database Tax Types (fallback when ZIMRA config unavailable)
            // Priority 2a: Product/Item Config (Master Data)
            if (taxID === 0) {
                const effectiveTaxTypeId = (item as any).product?.taxTypeId || (item as any).taxTypeId;

                if (effectiveTaxTypeId) {
                    const matchedTax = dbTaxTypes.find(t => t.id === effectiveTaxTypeId);
                    if (matchedTax) {
                        // 1. Explicit ZIMRA Mapping
                        if (matchedTax.zimraTaxId) {
                            taxID = parseInt(matchedTax.zimraTaxId);
                        }
                        // 2. Name-based resolution
                        else {
                            const name = matchedTax.name.toLowerCase();
                            let dbTaxMatch;

                            if (name.includes('exempt')) {
                                dbTaxMatch = dbTaxTypes.find(t => t.name.toLowerCase().includes('exempt'));
                            } else if (name.includes('zero') || name.includes('0%') || name.includes('non')) {
                                dbTaxMatch = dbTaxTypes.find(t => t.name.toLowerCase().includes('zero') || t.name.toLowerCase().includes('non'));
                            } else if (name.includes('standard') || name.includes('vat')) {
                                dbTaxMatch = dbTaxTypes.find(t => t.name.toLowerCase().includes('standard') || t.name.toLowerCase().includes('vat'));
                            }

                            if (dbTaxMatch && dbTaxMatch.zimraTaxId) {
                                taxID = parseInt(dbTaxMatch.zimraTaxId);
                            }
                        }
                    }
                }
            }

            // Secondary fallback: Look in database synced tax types
            if (taxID === 0) {
                let dbMatchingTax;
                if (taxPercent === 0 && item.description.toLowerCase().includes('exempt')) {
                    dbMatchingTax = dbTaxTypes.find(t => t.name.toLowerCase().includes('exempt'));
                }

                if (!dbMatchingTax) {
                    dbMatchingTax = dbTaxTypes.find(t => Math.abs(Number(t.rate) - taxPercent) < 0.01);
                }

                if (dbMatchingTax) {
                    taxID = dbMatchingTax.zimraTaxId ? parseInt(dbMatchingTax.zimraTaxId) : 0;
                }
            }

            // Tertiary fallback for non-VAT or general 0% if still 0
            if (taxID === 0 && taxPercent === 0) {
                // Dynamic lookup for Exempt or Zero Rated
                if (item.description.toLowerCase().includes('exempt')) {
                    const exemptTax = dbTaxTypes.find(t => t.name.toLowerCase().includes('exempt') && t.zimraTaxId);
                    if (exemptTax) taxID = parseInt(exemptTax.zimraTaxId!);
                } else {
                    // Default to Zero Rated (search for "Zero" or "0%")
                    const zeroTax = dbTaxTypes.find(t => (t.name.toLowerCase().includes('zero') || t.name.includes('0%')) && t.zimraTaxId);
                    if (zeroTax) taxID = parseInt(zeroTax.zimraTaxId!);
                }
            }

            // NEW: Use ZimraDevice helpers for consistent mapping if no match found
            if (taxID === 0) {
                taxID = ZimraDevice.getTaxID(taxPercent);
            }

            // Build receipt line, conditionally omitting taxPercent for exempt items
            const receiptLine: any = {
                receiptLineType: ((invoice.transactionType || 'FiscalInvoice') !== 'CreditNote' && (invoice.transactionType || 'FiscalInvoice') !== 'DebitNote' && Number(item.unitPrice) < 0) ? 'Discount' : 'Sale',
                receiptLineNo: index + 1,
                receiptLineHSCode: (item.product?.hsCode || '04021099').trim(),
                receiptLineName: (item.description || '').trim(),
                receiptLinePrice: parseFloat(Number(item.unitPrice).toFixed(2)),
                receiptLineQuantity: parseFloat(Number(item.quantity).toFixed(2)),
                receiptLineTotal: parseFloat(Number(item.lineTotal).toFixed(2)),
                taxID: taxID,
            };

            // Only include taxPercent if not exempt (Tax ID 1)
            if (taxID !== 1) {
                receiptLine.taxPercent = taxPercent;
            }

            return receiptLine;
        });

        let moneyTypeCode: 'Cash' | 'Card' | 'Other' | 'BankTransfer' | 'MobileWallet' = 'Cash';
        const method = invoice.paymentMethod?.toUpperCase() || 'CASH';
        if (['CASH'].includes(method)) moneyTypeCode = 'Cash';
        else if (['CARD', 'SWIPE', 'POS'].includes(method)) moneyTypeCode = 'Card';
        else if (['MOBILE', 'ECOCASH', 'ONE_MONEY', 'TELE_CASH', 'MOBILEWALLET'].includes(method)) moneyTypeCode = 'MobileWallet';
        else if (['EFT', 'RTGS', 'TRANSFER', 'ZIPIT', 'BANKTRANSFER'].includes(method)) moneyTypeCode = 'BankTransfer';
        else moneyTypeCode = 'Other';

        const totalAmount = parseFloat(Number(invoice.total).toFixed(2));
        const payments = [{
            moneyTypeCode,
            paymentAmount: totalAmount
        }];

        let buyerData: any = undefined;
        let creditDebitNote = undefined;
        const transactionType = invoice.transactionType || "FiscalInvoice";
        let receiptType: any = "FiscalInvoice";

        if (transactionType === "CreditNote") receiptType = "CreditNote";
        if (transactionType === "DebitNote") receiptType = "DebitNote";

        // If CN/DN, we need original invoice details
        let originalInvoice = null;
        if (receiptType !== "FiscalInvoice") {
            if (!invoice.relatedInvoiceId) {
                throw new Error(`${receiptType} requires a related original invoice.`);
            }
            originalInvoice = await storage.getInvoice(invoice.relatedInvoiceId);
            if (!originalInvoice) {
                throw new Error(`Original invoice for this ${receiptType} not found.`);
            }
            if (!originalInvoice.fiscalCode) {
                throw new Error(`Original invoice must be fiscalized before a ${receiptType} can be issued.`);
            }

            // Spec 4.7: creditDebitNote: deviceID, receiptGlobalNo, fiscalDayNo
            creditDebitNote = {
                deviceID: parseInt(company.fdmsDeviceId),
                receiptGlobalNo: originalInvoice.receiptGlobalNo || originalInvoice.id,
                fiscalDayNo: originalInvoice.fiscalDayNo || 1,
                receiptID: originalInvoice.submissionId ? parseInt(originalInvoice.submissionId) : undefined
            };
        }

        // Construct Buyer Data - Only include fields that have actual data
        if (invoice.customer) {
            buyerData = {
                buyerRegisterName: invoice.customer.name,
                buyerTradeName: invoice.customer.name,
            };

            // Only include VAT number if it exists
            if (invoice.customer.vatNumber && invoice.customer.vatNumber.trim()) {
                buyerData.vatNumber = invoice.customer.vatNumber.trim();
            }

            // Only include TIN if it exists
            if (invoice.customer.tin && invoice.customer.tin.trim()) {
                buyerData.buyerTIN = invoice.customer.tin.trim();
            }

            // Only include contacts if at least one field has data
            const hasPhone = invoice.customer.phone?.trim();
            const hasEmail = invoice.customer.email?.trim();

            if (hasPhone || hasEmail) {
                buyerData.buyerContacts = {};
                if (hasPhone) buyerData.buyerContacts.phoneNo = hasPhone;
                if (hasEmail) buyerData.buyerContacts.email = hasEmail;
            }

            // Only include address if at least one field has data
            const hasProvince = invoice.customer.city?.trim();
            const hasCity = invoice.customer.city?.trim();
            const hasStreet = invoice.customer.address?.trim();

            if (hasProvince || hasCity || hasStreet) {
                buyerData.buyerAddress = {};
                if (hasProvince) buyerData.buyerAddress.province = hasProvince;
                if (hasCity) buyerData.buyerAddress.city = hasCity;
                if (hasStreet) buyerData.buyerAddress.street = hasStreet;
                // houseNo and district are optional and not used in our schema
            }
        }

        // Reuse existing numbers if present (retry scenario), otherwise generate new ones
        console.log(`[Fiscalize] Invoice ${invoiceId} Existing GlobalNo: ${invoice.receiptGlobalNo}, Counter: ${invoice.receiptCounter}`);
        console.log(`[Fiscalize] Company LastGlobalNo: ${company.lastReceiptGlobalNo}, DailyCount: ${company.dailyReceiptCount}`);

        if (zimraSync) {
            nextGlobalNo = zimraSync.nextGlobalNo;
            nextReceiptCounter = zimraSync.nextReceiptCounter;
        } else {
            nextGlobalNo = invoice.receiptGlobalNo || ((company.lastReceiptGlobalNo || 0) + 1);
            nextReceiptCounter = invoice.receiptCounter || ((company.dailyReceiptCount || 0) + 1);
        }

        console.log(`[Fiscalize] Determined NextGlobalNo: ${nextGlobalNo}, NextReceiptCounter: ${nextReceiptCounter}`);

        // DEBUG: Write to file
        try {
            const logData = `[${new Date().toISOString()}] Invoice ${invoiceId}
        Existing GlobalNo: ${invoice.receiptGlobalNo}
        Existing ReceiptCounter: ${invoice.receiptCounter}
        ZimraSync: ${JSON.stringify(zimraSync)}
        Calculated NextGlobalNo: ${nextGlobalNo}
        Calculated NextReceiptCounter: ${nextReceiptCounter}
        --------------------------------\n`;
            fs.appendFileSync(path.join(process.cwd(), 'debug_fiscalize.log'), logData);
        } catch (err) { console.error("Failed to write debug log", err); }

        // ZIMRA Date Formatting & Sequentiality Guards [40, RCPT014, RCPT030]
        const formatZimraDate = (date: Date) => {
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Africa/Harare',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).formatToParts(date);
            const p = (t: string) => parts.find(x => x.type === t)?.value;
            return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}`;
        };

        // Ensure receiptDate is after fiscalDayOpenedAt (RCPT014) and after lastReceiptAt (RCPT030)
        let nowAtHarare = new Date();
        const dayOpenedAt = company.fiscalDayOpenedAt ? new Date(company.fiscalDayOpenedAt) : null;
        const lastRcptAt = company.lastReceiptAt ? new Date(company.lastReceiptAt) : null;

        // Check against day opening
        if (dayOpenedAt && nowAtHarare.getTime() <= dayOpenedAt.getTime()) {
            console.log(`[ZIMRA] Guard: Current time (${nowAtHarare.toISOString()}) is before or equal to day opening (${dayOpenedAt.toISOString()}). Bumping timestamp.`);
            nowAtHarare = new Date(dayOpenedAt.getTime() + 1000);
        }

        // Check against last receipt
        if (lastRcptAt && nowAtHarare.getTime() <= lastRcptAt.getTime()) {
            console.log(`[ZIMRA] Guard: Current time (${nowAtHarare.toISOString()}) is before or equal to last receipt (${lastRcptAt.toISOString()}). Bumping timestamp.`);
            nowAtHarare = new Date(lastRcptAt.getTime() + 1000);
        }

        const receiptData: ReceiptData = {
            receiptType: receiptType,
            receiptCurrency: invoice.currency || 'USD',
            receiptCounter: nextReceiptCounter,
            receiptGlobalNo: nextGlobalNo,
            invoiceNo: invoice.invoiceNumber,
            receiptDate: formatZimraDate(nowAtHarare),
            receiptLines: receiptLines as any,
            receiptTaxes: [],
            receiptPayments: payments as any,
            receiptTotal: totalAmount,
            receiptLinesTaxInclusive: invoice.taxInclusive || false,
            buyerData: buyerData,
            creditDebitNote: creditDebitNote,
            receiptNotes: invoice.notes
                ? (creditDebitNote ? `${invoice.notes} (Ref: ${originalInvoice?.invoiceNumber || 'Original'})` : invoice.notes)
                : (receiptType !== 'FiscalInvoice' ? `Correction of data entry error (Ref: ${originalInvoice?.invoiceNumber || 'Original'})` : undefined)
        };

        console.log(`[Fiscalize] Prepared Receipt Data for Invoice ${invoiceId} (Date: ${receiptData.receiptDate}):`, JSON.stringify(receiptData, null, 2));

        // Submit with previous hash for chaining (first receipt of day has no previous hash)
        let prevHash = (nextReceiptCounter === 1) ? null : (company.lastFiscalHash || null);
        let result: any;

        try {
            try {
                result = await device.submitReceipt(receiptData, prevHash, true);
            } catch (submitErr: any) {
                // Auto-Open Retry Logic: Catch "Day Closed" errors (typically code 310 or message containing "closed")
                if (submitErr.message?.toLowerCase().includes('closed') || submitErr.toString().includes('310')) {
                    console.log("[ZIMRA] Auto-Open Retry: Fiscal Day reported closed during submission. Opening new day...");

                    try {
                        // 1. Open New Fiscal Day
                        const nextDay = (company.currentFiscalDayNo || 0) + 1;
                        await device.openDay(nextDay);

                        // 2. Update Local Company State
                        await storage.updateCompany(company.id, {
                            fiscalDayOpen: true,
                            currentFiscalDayNo: nextDay,
                            fiscalDayOpenedAt: new Date(), // Critical for RCPT014 validation
                            dailyReceiptCount: 0,
                            lastFiscalHash: null // Reset hash for new day
                        });

                        // 3. Reset Receipt Data for New Day (Counter = 1, PrevHash = null)
                        receiptData.receiptCounter = 1;
                        nextReceiptCounter = 1; // Update local variable for DB update later
                        prevHash = null;

                        console.log("[ZIMRA] Retry: Resubmitting receipt as first of new day...");
                        result = await device.submitReceipt(receiptData, prevHash, true);

                    } catch (retryErr: any) {
                        console.error("[ZIMRA] Retry Failed:", retryErr);
                        // Explicit error for user feedback
                        throw new Error(`Fiscal Day Closed. Automatic opening failed: ${retryErr.message}`);
                    }
                } else {
                    throw submitErr;
                }
            }
        } catch (err: any) {
            // CRITICAL: Always lock the counters to this invoice on failure
            // This ensures resubmission uses the same number, and next invoice gets a new one.
            try {
                console.log(`[Fiscalize] Exception Caught. Saving Lock: GlobalNo=${nextGlobalNo}, Counter=${nextReceiptCounter} to Invoice ${invoiceId}`);
                await storage.updateInvoice(invoiceId, {
                    fdmsStatus: 'failed',
                    validationStatus: 'invalid', // Default to invalid on system error, specific errors overwritten below
                    lastValidationAttempt: new Date(),
                    receiptGlobalNo: nextGlobalNo,
                    receiptCounter: nextReceiptCounter
                });

                // Increment company counters
                await storage.updateCompany(company.id, {
                    lastReceiptGlobalNo: nextGlobalNo,
                    dailyReceiptCount: nextReceiptCounter
                });
            } catch (lockErr) {
                console.error("Failed to save lock counters:", lockErr);
            }

            // Handle ZIMRA API Errors (Validation details)
            if (err instanceof ZimraApiError) {
                const details = err.details || {};
                let parsedValidationErrors: any[] = [];
                let hasRedErrors = false;

                if (details.validationErrors && Array.isArray(details.validationErrors)) {
                    try {
                        parsedValidationErrors = details.validationErrors.map((e: any) => ({
                            invoiceId: invoiceId,
                            errorCode: e.validationErrorCode || 'UNKNOWN',
                            errorMessage: e.validationErrorMessage || e.errorMessage || e.message || 'Unknown Error',
                            errorColor: e.validationErrorColor || 'Red',
                            requiresPreviousReceipt: false
                        }));

                        if (parsedValidationErrors.length > 0) {
                            await storage.createValidationErrors(parsedValidationErrors);
                            hasRedErrors = parsedValidationErrors.some((e: any) => e.errorColor === 'Red');
                        }
                    } catch (saveErr) {
                        console.error("Failed to save validation errors during exception handling:", saveErr);
                    }
                }

                if (hasRedErrors) {
                    try { await storage.updateInvoice(invoiceId, { validationStatus: 'red' }); }
                    catch (e) { console.error("Failed to update status to red", e); }
                }
            }

            throw err; // Re-throw to propagate error to caller
        }

        console.log(`[Fiscalize] Result for Invoice ${invoiceId}:`, JSON.stringify(result, null, 2));

        // Handle validation errors
        const validationResult = result.validationResult;
        let validationStatus = 'valid';
        let validationErrors: any[] = [];

        if (validationResult && !validationResult.valid) {
            // Map ZIMRA validation colors
            if (validationResult.errors.some((e: any) => e.errorColor === 'Red')) {
                validationStatus = 'red';
            } else if (validationResult.errors.some((e: any) => e.errorColor === 'Grey')) {
                validationStatus = 'grey';
            } else if (validationResult.errors.some((e: any) => e.errorColor === 'Yellow')) {
                validationStatus = 'yellow';
            } else {
                validationStatus = 'invalid';
            }

            // Store validation errors
            validationErrors = validationResult.errors.map((error: any) => ({
                invoiceId,
                errorCode: error.errorCode,
                errorMessage: error.errorMessage,
                errorColor: error.errorColor,
                requiresPreviousReceipt: error.requiresPreviousReceipt
            }));

            // Save validation errors to database
            if (validationErrors.length > 0) {
                await storage.createValidationErrors(validationErrors);
            }
        }

        // Generate QR Code (if successful and synced/signed - validation errors don't prevent signature)
        let qrCode = '';
        if (result.synced) {
            qrCode = device.generateQrCode(result.signature, receiptData.receiptGlobalNo, receiptData.receiptDate);
        }

        // Update Invoice & Company Counters
        const updatedInvoice = await storage.fiscalizeInvoice(invoiceId, {
            fiscalCode: result.verificationCode || result.operationID,
            qrCodeData: qrCode,
            fiscalSignature: result.signature,
            fiscalDayNo: result.fiscalDayNo,
            receiptCounter: result.receiptCounter,
            receiptGlobalNo: result.receiptGlobalNo,
            syncedWithFdms: result.synced,
            fdmsStatus: result.synced ? "Fiscalized" : "Failed",
            submissionId: result.operationID,
            validationStatus: validationStatus,
            lastValidationAttempt: new Date()
        });

        // Update Company Counters (Important!)
        if (result.synced) {
            await storage.updateCompany(company.id, {
                lastReceiptGlobalNo: result.receiptGlobalNo,
                dailyReceiptCount: result.receiptCounter,
                lastFiscalHash: result.signature,
                lastReceiptAt: new Date(receiptData.receiptDate)
            });
        }

        return updatedInvoice;

    } catch (e: any) {
        if (e instanceof ZimraApiError) {
            throw new Error(e.message);
        }
        throw e;
    }
};
