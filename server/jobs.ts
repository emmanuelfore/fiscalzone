import { storage } from "./storage.js";
import { type RecurringInvoice } from "../shared/schema.js";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { ZimraDevice } from "./zimra.js";
import { getZimraLogger } from "./lib/fiscalization.js";

export async function processRecurringInvoices() {
    console.log("[Job] Checking for due recurring invoices...");
    try {
        const dueInvoices = await storage.getDueRecurringInvoices();
        console.log(`[Job] Found ${dueInvoices.length} due invoices.`);

        for (const template of dueInvoices) {
            await generateInvoiceFromTemplate(template);
        }
    } catch (error) {
        console.error("[Job] Error processing recurring invoices:", error);
    }
}

async function generateInvoiceFromTemplate(template: RecurringInvoice) {
    console.log(`[Job] Generating invoice for template ID: ${template.id}`);

    try {
        const nextRunDate = calculateNextRunDate(template.nextRunDate, template.frequency);

        // Create the invoice
        const invoiceData = {
            companyId: template.companyId,
            customerId: template.customerId,
            issueDate: new Date(),
            dueDate: addDays(new Date(), 14), // Default 14 day due date
            currency: template.currency,
            exchangeRate: "1.00", // Default
            taxInclusive: template.taxInclusive,
            subtotal: "0", // Will be recalculated by storage/backend logic if it had items
            taxAmount: "0",
            total: "0",
            status: "draft",
            notes: `Automatically generated from recurring schedule. ${template.description || ""}`,
            transactionType: "FiscalInvoice",
            items: (template.items as any[]).map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                taxRate: item.taxRate.toString(),
                lineTotal: (Number(item.quantity) * Number(item.unitPrice)).toString()
            }))
        };

        // Calculate totals for the new invoice
        let subtotalValue = 0;
        let taxValue = 0;
        invoiceData.items.forEach(item => {
            const lineTotal = Number(item.lineTotal);
            if (template.taxInclusive) {
                const tax = lineTotal - (lineTotal / (1 + (Number(item.taxRate) / 100)));
                subtotalValue += (lineTotal - tax);
                taxValue += tax;
            } else {
                subtotalValue += lineTotal;
                taxValue += (lineTotal * (Number(item.taxRate) / 100));
            }
        });

        invoiceData.subtotal = subtotalValue.toFixed(2);
        invoiceData.taxAmount = taxValue.toFixed(2);
        invoiceData.total = (subtotalValue + taxValue).toFixed(2);

        // Create the invoice
        await storage.createInvoice(invoiceData as any);

        // Update template run dates
        await storage.updateRecurringInvoice(template.id, {
            lastRunDate: new Date(),
            nextRunDate: nextRunDate
        });

        console.log(`[Job] Successfully generated invoice for template ${template.id}. Next run: ${nextRunDate}`);
    } catch (error) {
        console.error(`[Job] Failed to generate invoice for template ${template.id}:`, error);
    }
}

function calculateNextRunDate(currentDate: Date, frequency: string): Date {
    switch (frequency.toLowerCase()) {
        case "weekly":
            return addWeeks(currentDate, 1);
        case "monthly":
            return addMonths(currentDate, 1);
        case "quarterly":
            return addMonths(currentDate, 3);
        case "yearly":
            return addYears(currentDate, 1);
        default:
            return addMonths(currentDate, 1);
    }
}

// Start the worker on an interval (e.g., every hour)
export function startRecurringInvoiceWorker() {
    console.log("[Job] Starting Recurring Invoice Worker...");
    // Initial run
    processRecurringInvoices();

    // Run every hour
    setInterval(processRecurringInvoices, 1000 * 60 * 60);
}

/**
 * Midnigh Job: Close Fiscal Days for all active companies
 */
export async function closeAllFiscalDays() {
    console.log("[Job] Starting midnight fiscal day closure sweep...");
    
    try {
        const allCompanies = await storage.getAllCompanies();
        const zimraCompanies = allCompanies.filter(c => c.fdmsDeviceId && c.zimraPrivateKey && c.zimraCertificate);
        
        console.log(`[Job] Found ${zimraCompanies.length} companies with ZIMRA integration.`);
        
        for (const company of zimraCompanies) {
            try {
                // Initialize Device
                const device = new ZimraDevice({
                    deviceId: company.fdmsDeviceId!,
                    deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
                    activationKey: company.fdmsApiKey || "",
                    privateKey: company.zimraPrivateKey!,
                    certificate: company.zimraCertificate!,
                    baseUrl: company.zimraEnvironment === 'production' ? 'https://fdmsapi.zimra.co.zw' : 'https://fdmsapitest.zimra.co.zw'
                }, getZimraLogger(company.id));

                // 1. Check Status
                console.log(`[Job] Checking ZIMRA status for ${company.name}...`);
                const status = await device.getStatus();
                
                if (status.fiscalDayStatus === 'FiscalDayOpened') {
                    const fiscalDayNo = status.lastFiscalDayNo!;
                    
                    // 2. Calculate Counters
                    const counters = await storage.calculateFiscalCounters(company.id, fiscalDayNo);
                    
                    // 3. Format Date for ZIMRA (ISO local, but just YYYY-MM-DD for closeDay usually? 
                    // Actually spec says fiscalDayDate is YYYY-MM-DDTHH:mm:ss in signature base, but let's check ZimraDevice.closeDay)
                    // ZimraDevice.closeDay uses fiscalDayDate as a string.
                    const harareMsOffset = 2 * 60 * 60 * 1000;
                    const nowAtHarare = new Date(Date.now() + harareMsOffset);
                    const fiscalDayDate = nowAtHarare.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss

                    console.log(`[Job] Closing Fiscal Day ${fiscalDayNo} for ${company.name} at ${fiscalDayDate}`);
                    
                    await device.closeDay(
                        fiscalDayNo,
                        fiscalDayDate,
                        company.dailyReceiptCount || status.lastReceiptCounter || 0,
                        counters
                    );

                    // 4. Update local state
                    await storage.updateCompany(company.id, {
                        fiscalDayOpen: false,
                        lastFiscalDayStatus: 'FiscalDayClosed'
                    });
                    
                    console.log(`[Job] Successfully closed day for ${company.name}`);
                } else {
                    console.log(`[Job] Day for ${company.name} is already ${status.fiscalDayStatus}.`);
                    if (company.fiscalDayOpen) {
                        await storage.updateCompany(company.id, { fiscalDayOpen: false, lastFiscalDayStatus: status.fiscalDayStatus });
                    }
                }
            } catch (err) {
                console.error(`[Job] Failed to process ${company.name}:`, err);
            }
        }
    } catch (error) {
        console.error("[Job] Fatal error in closeAllFiscalDays:", error);
    }
    
    console.log("[Job] Fiscal day closure sweep completed.");
}

export function startFiscalDayClosingWorker() {
    console.log("[Job] Starting Fiscal Day Closing Worker (Targeting Zimbabwe Midnight CAT/UTC+2)");
    
    const scheduleNext = () => {
        const now = new Date();
        
        // Calculate milliseconds to next CAT midnight (UTC 22:00)
        // Note: Zimbabwe is CAT which is UTC+2, no DST.
        const target = new Date(now);
        target.setUTCHours(22, 5, 0, 0); // 22:05 UTC is 00:05 CAT (5 min past midnight for safety)
        
        // If we already passed 22:05 UTC today, target 22:05 UTC tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setUTCDate(target.getUTCDate() + 1);
        }
        
        const delay = target.getTime() - now.getTime();
        
        // Log scheduling info
        const hours = Math.floor(delay / (1000 * 60 * 60));
        const mins = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`[Job] Next Zimbabwe midnight closure scheduled in ${hours}h ${mins}m (Target: ${target.toISOString()})`);

        setTimeout(async () => {
            try {
                await closeAllFiscalDays();
            } catch (err) {
                console.error("[Job] Error in scheduled fiscal closure:", err);
            } finally {
                scheduleNext();
            }
        }, delay);
    };

    scheduleNext();
}
