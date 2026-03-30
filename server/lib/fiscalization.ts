import { storage } from "../storage.js";
import { ZimraDevice, ReceiptData, ZimraConfigResponse, ZimraApiError, ZimraLogger } from "../zimra.js";
import { Invoice } from "../../shared/schema.js";
import fs from "fs";
import path from "path";
import { logAction } from "../audit.js";

// In-memory cache for ZIMRA configuration to reduce redundant network calls
const zimraConfigCache = new Map<number, { config: ZimraConfigResponse, expiresAt: number }>();
const CONFIG_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Exported to be shared across the server
export const getZimraLogger = (companyId: number) => ({
    log: async (invoiceId: number | null, endpoint: string, request: any, response: any, statusCode?: number, errorMessage?: string) => {
        try {
            await storage.createZimraLog({
                companyId,
                invoiceId: invoiceId || undefined,
                endpoint,
                requestPayload: request,
                responsePayload: response,
                statusCode,
                errorMessage
            });

            // Also log to general audit for major events
            if (['OpenDay', 'CloseDay', 'SubmitReceipt'].includes(endpoint)) {
                await logAction(
                    companyId,
                    "system",
                    `ZIMRA_${endpoint.toUpperCase()}`,
                    "ZimraAPI",
                    invoiceId?.toString(),
                    { statusCode, errorMessage, endpoint }
                );
            }
        } catch (error) {
            console.error("Failed to create ZIMRA log:", error);
        }
    }
});

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

    let company: any = await storage.getCompany(companyId);
    if (!company) throw new Error("Company not found");

    // Branch Support: Load branch config if specified on invoice
    let fiscalConfig = { ...company };
    let activeBranch: any = null;

    if (invoice.branchId) {
        activeBranch = await storage.getBranch(invoice.branchId);
        if (activeBranch) {
            // Override company settings with branch-specific fiscal settings
            fiscalConfig = {
                ...fiscalConfig,
                fdmsDeviceId: activeBranch.fdmsDeviceId || fiscalConfig.fdmsDeviceId,
                fdmsDeviceSerialNo: activeBranch.fdmsDeviceSerialNo || fiscalConfig.fdmsDeviceSerialNo,
                fdmsApiKey: activeBranch.fdmsApiKey || fiscalConfig.fdmsApiKey,
                zimraPrivateKey: activeBranch.zimraPrivateKey || fiscalConfig.zimraPrivateKey,
                zimraCertificate: activeBranch.zimraCertificate || fiscalConfig.zimraCertificate,
                zimraEnvironment: activeBranch.zimraEnvironment || fiscalConfig.zimraEnvironment,
                fiscalDayOpen: activeBranch.fiscalDayOpen ?? fiscalConfig.fiscalDayOpen,
                currentFiscalDayNo: activeBranch.currentFiscalDayNo ?? fiscalConfig.currentFiscalDayNo,
                fiscalDayOpenedAt: activeBranch.fiscalDayOpenedAt || fiscalConfig.fiscalDayOpenedAt,
                lastFiscalDayStatus: activeBranch.lastFiscalDayStatus || fiscalConfig.lastFiscalDayStatus,
                lastReceiptGlobalNo: activeBranch.lastReceiptGlobalNo ?? fiscalConfig.lastReceiptGlobalNo,
                dailyReceiptCount: activeBranch.dailyReceiptCount ?? fiscalConfig.dailyReceiptCount,
                lastFiscalHash: activeBranch.lastFiscalHash || fiscalConfig.lastFiscalHash,
                lastReceiptAt: activeBranch.lastReceiptAt || fiscalConfig.lastReceiptAt,
                qrUrl: activeBranch.qrUrl || fiscalConfig.qrUrl,
            };
        }
    }

    if (!fiscalConfig.zimraPrivateKey || !fiscalConfig.zimraCertificate || !fiscalConfig.fdmsDeviceId) {
        throw new Error(activeBranch ? `Branch ${activeBranch.name} has not registered a ZIMRA device` : "Company has not registered a ZIMRA device");
    }

    // Initialize Device with Logger
    const device = new ZimraDevice({
        deviceId: fiscalConfig.fdmsDeviceId,
        deviceSerialNo: fiscalConfig.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: fiscalConfig.fdmsApiKey || "",
        privateKey: fiscalConfig.zimraPrivateKey,
        certificate: fiscalConfig.zimraCertificate,
        baseUrl: fiscalConfig.zimraEnvironment === 'production' ? 'https://fdmsapi.zimra.co.zw' : 'https://fdmsapitest.zimra.co.zw'
    }, getZimraLogger(company.id));

    device.setInvoiceId(invoiceId);

    let justOpened = false;

    try {
        let status: any = null;
        
        // 🚀 OPTIMIZATION: Skip getStatus if the day is already open locally
        const needsStatusSync = !fiscalConfig.fiscalDayOpen || !fiscalConfig.currentFiscalDayNo;

        if (needsStatusSync) {
            console.time(`[ZIMRA] getStatus-${companyId}`);
            status = await device.getStatus() as any;
            console.timeEnd(`[ZIMRA] getStatus-${companyId}`);
            console.log(`[ZIMRA] Check Status: ${status.fiscalDayStatus}, LastDay: ${status.lastFiscalDayNo}`);

            const now = new Date();
            const fiscalDayOpenedAt = fiscalConfig.fiscalDayOpenedAt ? new Date(fiscalConfig.fiscalDayOpenedAt) : null;
            const oneDayMs = 24 * 60 * 60 * 1000;
            const isStale = fiscalDayOpenedAt && (now.getTime() - fiscalDayOpenedAt.getTime() > oneDayMs);

            if (isStale) console.log(`[ZIMRA] Day is Stale (>24h). OpenedAt: ${fiscalDayOpenedAt?.toISOString()}, but continuing to fiscalize on it.`);

            // ZIMRA Day Management:
            const statusStr = (status.fiscalDayStatus || "").toLowerCase();

            if (statusStr === 'fiscaldayclosed') {
                // Day is closed on ZIMRA's side — we must open a new day to fiscalize
                try {
                    const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
                    console.log(`[ZIMRA] Day is Closed. Opening new fiscal day ${nextDayNo}...`);
                    const openResult = await device.openDay(nextDayNo) as any;

                    const openedAt = new Date();
                    const updateData = {
                        currentFiscalDayNo: openResult.fiscalDayNo || nextDayNo,
                        fiscalDayOpen: true,
                        fiscalDayOpenedAt: openedAt,
                        lastFiscalDayStatus: 'FiscalDayOpened',
                        dailyReceiptCount: 0,
                        lastFiscalHash: null
                    };

                    if (activeBranch) {
                        await storage.updateBranch(activeBranch.id, updateData);
                    } else {
                        await storage.updateCompany(company.id, updateData);
                    }
                    console.log(`[ZIMRA] Fiscal Day Opened: ${openResult.fiscalDayNo} at ${openedAt.toISOString()}`);

                    status.fiscalDayStatus = 'FiscalDayOpened';
                    status.lastFiscalDayNo = openResult.fiscalDayNo || nextDayNo;
                    justOpened = true;
                } catch (openErr: any) {
                    console.error(`[ZIMRA] Failed to open new fiscal day: ${openErr.message}`);
                }
            } else if (statusStr === 'fiscaldayopened' || statusStr === 'fiscaldayclosefailed') {
                // Day is open (or close failed) — continue fiscalizing on it. Do NOT close it proactively.
                console.log(`[ZIMRA] Day status: ${status.fiscalDayStatus}. Continuing to fiscalize on current day.`);
                if (!fiscalConfig.fiscalDayOpen) {
                    const updateData = {
                        fiscalDayOpen: true,
                        currentFiscalDayNo: status.lastFiscalDayNo,
                        lastFiscalDayStatus: status.fiscalDayStatus
                    };
                    if (activeBranch) {
                        await storage.updateBranch(activeBranch.id, updateData);
                    } else {
                        await storage.updateCompany(company.id, updateData);
                    }
                }
            } else {
                console.warn(`[ZIMRA] Unknown day status: ${status.fiscalDayStatus}. Proceeding with caution.`);
            }

            // 2. SYNC COUNTERS FROM ZIMRA
            const zimraGlobalNo = status.lastReceiptGlobalNo || 0;
            let zimraDailyCount = status.lastReceiptCounter || 0;

            if (zimraDailyCount === 0 && status.fiscalDayDocumentQuantities) {
                zimraDailyCount = status.fiscalDayDocumentQuantities.reduce((sum: number, dq: any) => sum + (dq.receiptQuantity || 0), 0);
            }

            console.log(`[Fiscalize] ZIMRA Status Sync - GlobalNo: ${zimraGlobalNo}, DailyCount: ${zimraDailyCount}`);

            if (status.lastReceiptGlobalNo !== undefined || status.lastReceiptCounter !== undefined) {
                const updateData: any = {};
                const localGlobal = company.lastReceiptGlobalNo ?? 0;
                const localDaily = company.dailyReceiptCount ?? 0;

                if (status.lastReceiptGlobalNo !== undefined && status.lastReceiptGlobalNo > localGlobal) {
                    updateData.lastReceiptGlobalNo = status.lastReceiptGlobalNo;
                    console.log(`[ZIMRA] Advancing globalNo from ${localGlobal} → ${status.lastReceiptGlobalNo} (ZIMRA is ahead)`);
                } else if (status.lastReceiptGlobalNo !== undefined) {
                    console.log(`[ZIMRA] Skipping globalNo sync: local ${localGlobal} >= ZIMRA ${status.lastReceiptGlobalNo} (keeping local)`);
                }

                if (status.lastReceiptCounter !== undefined && status.lastReceiptCounter > localDaily) {
                    updateData.dailyReceiptCount = status.lastReceiptCounter;
                    console.log(`[ZIMRA] Advancing dailyCount from ${localDaily} → ${status.lastReceiptCounter} (ZIMRA is ahead)`);
                } else if (status.lastReceiptCounter !== undefined) {
                    console.log(`[ZIMRA] Skipping dailyCount sync: local ${localDaily} >= ZIMRA ${status.lastReceiptCounter} (keeping local)`);
                }

                if (Object.keys(updateData).length > 0) {
                    if (activeBranch) {
                        await storage.updateBranch(activeBranch.id, updateData);
                    } else {
                        await storage.updateCompany(company.id, updateData);
                    }
                }
            }
        } else {
            // Re-fetch the latest fiscal config
            if (activeBranch) {
                activeBranch = (await storage.getBranch(activeBranch.id)) || activeBranch;
                fiscalConfig = { ...fiscalConfig, ...activeBranch };
            } else {
                const refreshed = await storage.getCompany(company.id);
                if (refreshed) {
                    fiscalConfig = { ...fiscalConfig, ...refreshed };
                }
            }
        }

        // Reuse existing numbers if present (retry scenario), otherwise atomically claim new ones.
        // The atomic claim does a single UPDATE...RETURNING so no two concurrent fiscalizations
        // can ever receive the same pair of numbers.
        let nextGlobalNo: number;
        let nextReceiptCounter: number;

        if (zimraSync) {
            nextGlobalNo = zimraSync.nextGlobalNo;
            nextReceiptCounter = zimraSync.nextReceiptCounter;
        } else if (invoice.receiptGlobalNo && invoice.receiptCounter) {
            // Retry: reuse the numbers already locked to this invoice
            nextGlobalNo = invoice.receiptGlobalNo;
            nextReceiptCounter = invoice.receiptCounter;
            console.log(`[Fiscalize] Retry — reusing locked numbers: GlobalNo=${nextGlobalNo}, Counter=${nextReceiptCounter}`);
        } else {
            // First attempt: atomically claim the next pair
            const claimed = await storage.claimNextReceiptNumbers(company.id, invoice.branchId || undefined);
            nextGlobalNo = claimed.receiptGlobalNo;
            nextReceiptCounter = claimed.receiptCounter;
            console.log(`[Fiscalize] Atomically claimed: GlobalNo=${nextGlobalNo}, Counter=${nextReceiptCounter}`);
        }

        // 1. Get ZIMRA Config for correct Tax IDs
        let zimraConfig: ZimraConfigResponse | undefined;
        const dbTaxTypes = await storage.getTaxTypes(company.id);

        try {
            // Check cache first
            const cached = zimraConfigCache.get(company.id);
            const now = Date.now();
            
            if (cached && cached.expiresAt > now) {
                zimraConfig = cached.config;
                console.log(`[ZIMRA] Using cached config for company ${company.id}`);
            } else {
                console.time(`[ZIMRA] getConfig-${companyId}`);
                zimraConfig = await device.getConfig();
                console.timeEnd(`[ZIMRA] getConfig-${companyId}`);
                
                if (zimraConfig) {
                    zimraConfigCache.set(company.id, {
                        config: zimraConfig,
                        expiresAt: now + CONFIG_CACHE_TTL
                    });
                }
            }
            
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

        const getZimraPaymentMethodCode = (methodName: string): 'Cash' | 'Card' | 'Other' | 'BankTransfer' | 'MobileWallet' => {
            const m = methodName.toUpperCase();
            if (['CASH'].includes(m)) return 'Cash';
            if (['CARD', 'SWIPE', 'POS'].includes(m)) return 'Card';
            if (['MOBILE', 'ECOCASH', 'ONE_MONEY', 'TELE_CASH', 'MOBILEWALLET'].includes(m)) return 'MobileWallet';
            if (['EFT', 'RTGS', 'TRANSFER', 'ZIPIT', 'BANKTRANSFER'].includes(m)) return 'BankTransfer';
            return 'Other';
        };

        const totalAmount = parseFloat(Number(invoice.total).toFixed(2));
        let payments: Array<{ moneyTypeCode: string, paymentAmount: number }> = [];

        if (invoice.splitPayments && Array.isArray(invoice.splitPayments) && invoice.splitPayments.length > 0) {
            payments = invoice.splitPayments.map((p: any) => ({
                moneyTypeCode: getZimraPaymentMethodCode(p.method),
                paymentAmount: parseFloat(Number(p.amount).toFixed(2))
            }));
            
            const sum = payments.reduce((acc, p) => acc + p.paymentAmount, 0);
            if (Math.abs(sum - totalAmount) > 0.05) {
                console.warn(`[Fiscalize] Split payments sum (${sum}) doesn't roughly match total (${totalAmount}).`);
            }
        } else {
            payments = [{
                moneyTypeCode: getZimraPaymentMethodCode(invoice.paymentMethod || 'CASH'),
                paymentAmount: totalAmount
            }];
        }

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
                deviceID: parseInt(company.fdmsDeviceId || "0"),
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

        // ZIMRA Date Formatting — ISO 8601 local Harare time, no timezone suffix.
        // Format: YYYY-MM-DDTHH:mm:ss (24h, local time per ZIMRA spec example: 2019-09-23T14:43:23)
        // Harare is UTC+2, no DST. We manually offset to avoid Intl/locale quirks on the server.
        const formatZimraDate = (date: Date): string => {
            const harareMsOffset = 2 * 60 * 60 * 1000; // UTC+2, no DST
            const local = new Date(date.getTime() + harareMsOffset);
            return local.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
        };

        // Ensure receiptDate is after fiscalDayOpenedAt (RCPT014) and after lastReceiptAt (RCPT030)
        let nowAtHarare = new Date();
        const dayOpenedAt = company.fiscalDayOpenedAt ? new Date(company.fiscalDayOpenedAt) : null;
        const lastRcptAt = company.lastReceiptAt ? new Date(company.lastReceiptAt) : null;

        // Check against day opening — receipt must be after day was opened (RCPT014)
        if (dayOpenedAt && nowAtHarare.getTime() <= dayOpenedAt.getTime()) {
            console.log(`[ZIMRA] Guard: now (${nowAtHarare.toISOString()}) <= dayOpened (${dayOpenedAt.toISOString()}). Bumping by 1s.`);
            nowAtHarare = new Date(dayOpenedAt.getTime() + 1000);
        }

        // Check against last receipt — receipt must be after previous receipt (RCPT030).
        // Only bump if lastRcptAt is in the past or very recent (within 5 minutes).
        // If lastRcptAt is far in the future (stale bug), ignore it — don't send a future date.
        const fiveMinutes = 5 * 60 * 1000;
        const realNow = new Date();
        if (lastRcptAt && lastRcptAt.getTime() > realNow.getTime() + fiveMinutes) {
            console.log(`[ZIMRA] Guard: lastRcptAt (${lastRcptAt.toISOString()}) is far in the future — ignoring stale value, using real now.`);
            // Don't bump — lastRcptAt is stale/wrong, just use current time
        } else if (lastRcptAt && nowAtHarare.getTime() <= lastRcptAt.getTime()) {
            console.log(`[ZIMRA] Guard: now (${nowAtHarare.toISOString()}) <= lastRcpt (${lastRcptAt.toISOString()}). Bumping by 1s.`);
            nowAtHarare = new Date(lastRcptAt.getTime() + 1000);
        }

        const receiptData: ReceiptData = {
            receiptType: receiptType,
            receiptCurrency: invoice.currency || 'USD',
            receiptCounter: nextReceiptCounter,
            receiptGlobalNo: nextGlobalNo,
            fiscalDayNo: company.currentFiscalDayNo || status.lastFiscalDayNo, // Added Missing Property
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
                console.time(`[ZIMRA] submitReceipt-${companyId}-${nextGlobalNo}`);
                result = await device.submitReceipt(receiptData, prevHash, true);
                console.timeEnd(`[ZIMRA] submitReceipt-${companyId}-${nextGlobalNo}`);
            } catch (submitErr: any) {
                // Auto-Open Retry Logic: Only trigger on ZIMRA error code 310 (FiscalDayClosed).
                const is310 = submitErr.statusCode === 310 || submitErr.toString().includes('310');
                const isDayClosed = is310 || (submitErr instanceof ZimraApiError && (submitErr as any).details?.statusCode === 310);
                
                if (isDayClosed) {
                    console.log("[ZIMRA] Auto-Open Retry: ZIMRA returned 310 (FiscalDayClosed). Opening new day...");

                    try {
                        // 1. Open New Fiscal Day
                        const nextDay = (company.currentFiscalDayNo || 0) + 1;
                        await device.openDay(nextDay);

                        // 2. Update Local Company State — reset daily counter to 0 for the new day
                        await storage.updateCompany(company.id, {
                            fiscalDayOpen: true,
                            currentFiscalDayNo: nextDay,
                            fiscalDayOpenedAt: new Date(),
                            dailyReceiptCount: 0,
                            lastFiscalHash: null
                        });

                        // 3. Atomically claim fresh numbers for the new day
                        const newDayClaimed = await storage.claimNextReceiptNumbers(company.id);
                        receiptData.receiptCounter = newDayClaimed.receiptCounter;
                        nextReceiptCounter = newDayClaimed.receiptCounter;
                        receiptData.receiptGlobalNo = newDayClaimed.receiptGlobalNo;
                        prevHash = null; // First receipt of new day has no previous hash

                        console.log(`[ZIMRA] Retry: New day ${nextDay}, claimed Counter=${nextReceiptCounter}, GlobalNo=${newDayClaimed.receiptGlobalNo}`);
                        
                        console.time(`[ZIMRA] submitReceipt-retry-${companyId}-${nextGlobalNo}`);
                        result = await device.submitReceipt(receiptData, prevHash, true);
                        console.timeEnd(`[ZIMRA] submitReceipt-retry-${companyId}-${nextGlobalNo}`);

                    } catch (retryErr: any) {
                        console.error("[ZIMRA] Retry Failed:", retryErr);
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

                try {
                    await storage.lockInvoice(invoiceId, userId?.toString() || "system");
                } catch (lockError) {
                    console.error("Failiure cleanup error:", lockError);
                }
            } catch (err2) {
                console.error("Failure reporting error:", err2);
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
            fiscalCode: result.hash, // Corrected to SHA256 Hash for verification independently
            qrCodeData: qrCode,
            fiscalSignature: result.signature,
            fiscalDayNo: receiptData.fiscalDayNo,
            receiptCounter: receiptData.receiptCounter,
            receiptGlobalNo: receiptData.receiptGlobalNo,
            syncedWithFdms: result.synced,
            fdmsStatus: result.synced ? "Fiscalized" : "Failed",
            submissionId: result.operationID,
            validationStatus: validationStatus,
            lastValidationAttempt: new Date()
        });

        // Update Company Counters (Important!)
        // Always update if it was synced (ZIMRA received it and assigned a receipt ID), regardless of validation results.
        // This ensures the local sequence follows ZIMRA's actual counter state.
        // We also update if it was an offline submission (not synced) to maintain the local sequence.
        await storage.updateCompany(company.id, {
            lastReceiptGlobalNo: receiptData.receiptGlobalNo,
            dailyReceiptCount: receiptData.receiptCounter,
            lastFiscalHash: result.hash, // Chaining
            lastReceiptAt: nowAtHarare  // Use the actual UTC Date object, not re-parsed from the Harare-formatted string
        });

        return updatedInvoice;

    } catch (e: any) {
        if (e instanceof ZimraApiError) {
            throw new Error(e.message);
        }
        throw e;
    }
};
