import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage.js";
import { processInvoiceFiscalization } from "../../lib/fiscalization.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
//  Schema
//
//  Design principles:
//    1. Only `items` is REQUIRED. All other fields default intelligently.
//    2. Totals are always computed server-side — client NEVER sends subtotal/tax/total.
//    3. taxRate defaults from the company's default tax rate (usually 15%).
//    4. hsCode defaults from the company's default HS code.
//    5. Supports tax-INCLUSIVE pricing (price already contains VAT).
//    6. Supports split payments (e.g. part cash + part card).
//    7. Response mirrors the ZIMRA receipt structure so clients can render
//       a compliant receipt without any additional lookups.
// ─────────────────────────────────────────────────────────────────────────────

// ── Item-level tax type enum
//    Maps to ZIMRA taxID automatically — client never needs to know tax IDs.
//    STANDARD → 15% (or whatever the configured VAT rate is)
//    ZERO_RATED → 0% (taxable but at 0%)
//    EXEMPT → 0% (not subject to VAT at all)
const TAX_TYPE = z.enum(["STANDARD", "ZERO_RATED", "EXEMPT"]).default("STANDARD");

const itemSchema = z.object({
  // ── REQUIRED ─────────────────────────────────────────────────────────────
  name:      z.string().min(1),        // Shown as receiptLineName on receipt
  quantity:  z.number().positive(),
  unitPrice: z.number().min(0),        // Price per unit

  // ── DEFAULTS (preselected list or company config) ─────────────────────────
  taxType:      TAX_TYPE,             // "STANDARD" | "ZERO_RATED" | "EXEMPT"
  taxInclusive: z.boolean().default(false), // true = unitPrice already includes VAT
  hsCode:       z.string().optional(), // Defaults to company default HS code

  // ── OPTIONAL (client reference only) ─────────────────────────────────────
  sku:      z.string().optional(),     // Not sent to ZIMRA — for your own records
  discount: z.number().min(0).optional(), // Discount in currency units
});

export const passThroughFiscalizeSchema = z.object({
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  REQUIRED — only this field must be present
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  items: z.array(itemSchema).min(1),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PRESELECTED LISTS — enum with default, client picks or omits
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // How the customer paid
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "TRANSFER"]).default("CASH"),

  // Type of fiscal document
  transactionType: z.enum(["FiscalInvoice", "CreditNote", "DebitNote"]).default("FiscalInvoice"),

  // Receipt currency — most common ZW currencies listed; any 3-char ISO code accepted
  currency: z.enum(["USD", "ZWG", "ZAR", "GBP", "EUR"]).default("USD"),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  OPTIONAL — server computes or defaults from company profile
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Buyer info — all optional, defaults to "Walk-in Customer"
  buyer: z.object({
    name:       z.string().optional(),           // Company/person name
    vatNumber:  z.string().optional(),           // Buyer's VAT registration number
    tin:        z.string().optional(),           // Buyer's Tax Identification Number
    email:      z.string().email().optional(),   // For electronic receipts
    phone:      z.string().optional(),
    address:    z.string().optional(),
  }).optional(),

  invoiceNumber:     z.string().optional(),  // Auto-generated (INV-XXXX) if absent
  date:              z.string().optional(),  // ISO date "YYYY-MM-DD"; defaults to today
  relatedFiscalCode: z.string().optional(), // REQUIRED if transactionType is CreditNote or DebitNote
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/fiscalize
//
//  MINIMUM VIABLE REQUEST — just one line item:
//
//    { "items": [{ "name": "Widget", "quantity": 1, "unitPrice": 100 }] }
//
//  RESPONSE mirrors the ZIMRA receipt structure so clients can
//  immediately render a compliant receipt or store the data.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  // 1. Validate
  const parsed = passThroughFiscalizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid request body",
      statusCode: 400,
      details: parsed.error.errors.map((e) => ({
        field: e.path.join(".") || "(root)",
        message: e.message,
      })),
    });
  }

  const body = parsed.data;
  const company = req.company as any;
  const companyTaxRate = company.defaultTaxRate ?? 15;
  const companyHsCode  = company.defaultHsCode  ?? "04021099";
  const companyCurrency = body.currency; // enum with default "USD"

  // Resolve taxType enum → numeric taxRate
  const resolveTaxRate = (taxType: "STANDARD" | "ZERO_RATED" | "EXEMPT") => {
    if (taxType === "STANDARD")   return companyTaxRate;
    if (taxType === "ZERO_RATED") return 0;
    if (taxType === "EXEMPT")     return 0;
    return companyTaxRate;
  };

  // Resolve taxType → default HS code
  const resolveHsCode = (taxType: "STANDARD" | "ZERO_RATED" | "EXEMPT", override?: string) => {
    if (override) return override;
    if (taxType === "ZERO_RATED") return "99002000";
    if (taxType === "EXEMPT")     return "99003000";
    return "99001000"; // STANDARD
  };

  // 2. Process items — apply defaults and compute per-line totals
  const processedItems = body.items.map((item) => {
    const taxRate = resolveTaxRate(item.taxType);
    const hsCode  = resolveHsCode(item.taxType, item.hsCode);

    let unitPriceExcl = item.unitPrice;

    if (item.taxInclusive) {
      // Strip tax from inclusive price: priceExcl = priceIncl / (1 + taxRate/100)
      unitPriceExcl = taxRate > 0 ? item.unitPrice / (1 + taxRate / 100) : item.unitPrice;
    }

    let lineTotal = item.quantity * unitPriceExcl;

    // Apply item-level discount
    if (item.discount && item.discount > 0) {
      lineTotal -= item.discount;
    }

    const lineTax = lineTotal * (taxRate / 100);

    return {
      name:         item.name,
      quantity:     item.quantity,
      unitPrice:    parseFloat(unitPriceExcl.toFixed(4)),
      taxRate,
      taxType:      item.taxType,
      hsCode,
      sku:          item.sku,
      lineTotal:    parseFloat(lineTotal.toFixed(2)),
      lineTax:      parseFloat(lineTax.toFixed(2)),
      // Track original inclusive price for client receipt display
      displayPrice: item.unitPrice,
    };
  });

  // 3. Compute totals — server authoritative
  const subtotal  = processedItems.reduce((s, i) => s + i.lineTotal, 0);
  const taxAmount = processedItems.reduce((s, i) => s + i.lineTax, 0);
  const total     = parseFloat((subtotal + taxAmount).toFixed(2));

  // 4. Single payment
  const effectivePayments = [{ method: body.paymentMethod, amount: total }];

  // 5. Resolve or reuse the shared walk-in customer per company
  let customerId: number;
  try {
    const WALKIN_NAME = "__walkin__";
    const existing = (await storage.getCustomers(company.id))
      .find((c: any) => c.name === WALKIN_NAME);

    if (existing) {
      customerId = existing.id;
    } else {
      const created = await storage.createCustomer({
        companyId: company.id,
        name: WALKIN_NAME,
        vatNumber: null,
        tin: null,
        phone: null,
        email: null,
        address: null,
      } as any);
      customerId = created.id;
    }
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Could not resolve walk-in customer",
      statusCode: 500,
    });
  }

  // 6. Invoice number
  let invoiceNumber: string;
  try {
    const prefix = body.transactionType === "CreditNote" ? "CN"
                 : body.transactionType === "DebitNote"  ? "DN"
                 : "INV";
    invoiceNumber = body.invoiceNumber ?? await storage.getNextInvoiceNumber(company.id, prefix);
  } catch {
    invoiceNumber = `INV-${Date.now()}`;
  }

  // 7. Date
  const issueDate    = body.date ? new Date(body.date) : new Date();
  const issueDateStr = issueDate.toISOString().split("T")[0];

  // 8. Persist invoice
  let invoice: any;
  try {
    invoice = await storage.createInvoice({
      companyId:       company.id,
      customerId,
      invoiceNumber,
      issueDate,
      dueDate:         issueDate,
      currency:        companyCurrency,
      taxInclusive:    false,  // We always store tax-exclusive after normalisation
      paymentMethod:   effectivePayments[0].method,
      transactionType: body.transactionType,
      subtotal:        subtotal.toFixed(2),
      taxAmount:       taxAmount.toFixed(2),
      total:           total.toFixed(2),
      status:          "pending",
      // Buyer fields stored on the invoice itself (never creates a permanent customer)
      buyerName:       body.buyer?.name    ?? null,
      buyerVat:        body.buyer?.vatNumber ?? null,
      buyerTin:        body.buyer?.tin     ?? null,
      items: processedItems.map((item, idx) => ({
        description: item.name,
        quantity:    item.quantity.toString(),
        unitPrice:   item.unitPrice.toString(),
        taxRate:     item.taxRate.toString(),
        lineTotal:   item.lineTotal.toFixed(2),
        hsCode:      item.hsCode,
      })),
    } as any);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to save invoice: " + err.message,
      statusCode: 500,
    });
  }

  // 9. Fiscalize
  try {
    const fiscal = await processInvoiceFiscalization(invoice.id, company.id);

    // Build ZIMRA-aligned receipt lines for the response
    // (mirrors what was actually submitted to ZIMRA)
    const receiptLines = processedItems.map((item, idx) => ({
      receiptLineNo:       idx + 1,
      receiptLineName:     item.name,
      receiptLineType:     "Sale",
      receiptLineQuantity: item.quantity,
      receiptLinePrice:    item.displayPrice,  // Show original price (client-friendly)
      receiptLineTotal:    item.lineTotal,
      receiptLineHSCode:   item.hsCode,
      taxPercent:          item.taxRate,
    }));

    // Aggregate taxes by rate
    const taxMap = new Map<number, number>();
    for (const item of processedItems) {
      const existing = taxMap.get(item.taxRate) ?? 0;
      taxMap.set(item.taxRate, existing + item.lineTax);
    }
    const receiptTaxes = Array.from(taxMap.entries()).map(([pct, amt]) => ({
      taxPercent:         pct,
      taxAmount:          parseFloat(amt.toFixed(2)),
      salesAmountWithTax: parseFloat((amt / pct * (pct + 100)).toFixed(2)),
    }));

    return res.status(200).json({
      success:       true,
      // ── Fiscal proof (store these in your system) ──────────────────────
      fiscalCode:    fiscal.fiscalCode,       // SHA-256 hash (for verification)
      qrCode:        fiscal.qrCodeData,       // Display this on the printed receipt
      receiptNumber: fiscal.receiptGlobalNo,
      // ── ZIMRA-aligned receipt (ready to render) ────────────────────────
      receipt: {
        invoiceNo:     fiscal.invoiceNumber,
        receiptDate:   issueDateStr,
        receiptType:   body.transactionType,
        receiptCurrency: companyCurrency,
        receiptTotal:  total,
        receiptCounter: fiscal.receiptCounter,
        receiptGlobalNo: fiscal.receiptGlobalNo,
        fiscalDayNo:   fiscal.fiscalDayNo,
        receiptLinesTaxInclusive: false,
        buyerData: body.buyer?.name ? {
          buyerRegisterName: body.buyer.name,
          buyerTradeName:    body.buyer.name,
          ...(body.buyer.vatNumber ? { vatNumber: body.buyer.vatNumber } : {}),
          ...(body.buyer.tin       ? { buyerTIN:  body.buyer.tin       } : {}),
          ...((body.buyer.phone || body.buyer.email) ? {
            buyerContacts: {
              ...(body.buyer.phone ? { phoneNo: body.buyer.phone } : {}),
              ...(body.buyer.email ? { email:   body.buyer.email } : {}),
            }
          } : {}),
          ...(body.buyer.address ? { buyerAddress: { street: body.buyer.address } } : {}),
        } : undefined,
        receiptLines,
        receiptTaxes,
        receiptPayments: effectivePayments.map(p => ({
          moneyTypeCode:   p.method === "CASH"     ? "Cash"
                         : p.method === "CARD"     ? "Card"
                         : p.method === "MOBILE"   ? "MobileWallet"
                         : p.method === "TRANSFER" ? "BankTransfer"
                         : "Other",
          paymentAmount:   p.amount,
        })),
      },
    });

  } catch (err: any) {
    // Clean up the orphaned invoice so the client can retry safely
    try { await storage.deleteInvoice(invoice.id); } catch { /* ignore */ }

    const isZimraError = err.message?.includes("ZIMRA") || err.message?.includes("FDMS")
                      || err.message?.includes("device") || err.message?.includes("fiscal day");

    return res.status(422).json({
      error:      "FISCALIZATION_FAILED",
      message:    err.message,
      statusCode: 422,
      hint: isZimraError
        ? "Ensure your ZIMRA device is registered and the fiscal day is open."
        : "Check your item data and retry.",
    });
  }
});

export default router;
