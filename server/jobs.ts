import { storage } from "./storage.js";
import { type RecurringInvoice } from "../shared/schema.js";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

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
