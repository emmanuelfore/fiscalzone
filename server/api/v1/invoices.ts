import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage.js";
import { db } from "../../db.js";
import { products } from "../../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { processInvoiceFiscalization } from "../../lib/fiscalization.js";

// --- Zod Schemas ---

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  productId: z.number().int().positive().optional(),
  taxRate: z.number().min(0).optional(),
});

export const createInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1),
  customerId: z.number().int().positive().optional(),
  issueDate: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "TRANSFER"]).optional(),
  notes: z.string().optional(),
  relatedInvoiceId: z.number().int().positive().optional(),
  transactionType: z.enum(["FiscalInvoice", "CreditNote", "DebitNote"]).optional(),
});

export const updateInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1).optional(),
  customerId: z.number().int().positive().optional(),
  issueDate: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "TRANSFER"]).optional(),
  notes: z.string().optional(),
  relatedInvoiceId: z.number().int().positive().optional(),
  transactionType: z.enum(["FiscalInvoice", "CreditNote", "DebitNote"]).optional(),
});

// --- Router ---

const router = Router();

// POST / — create invoice (Mode B)
router.post("/", async (req, res) => {
  // 1. Validate request body
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request body validation failed",
      statusCode: 400,
      details: parsed.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const body = parsed.data;
  const company = req.company as any;

  // 2. Resolve per-item tax rate and hsCode; compute lineTotals
  const mappedItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    hsCode: string | null;
    lineTotal: number;
    productId?: number;
  }> = [];

  for (const item of body.items) {
    let taxRate: number;
    let hsCode: string | null = null;

    if (item.productId) {
      // Fetch product and use its taxRate / hsCode (Req 3.3)
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, item.productId),
            eq(products.companyId, company.id)
          )
        );

      if (!product) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: `Product with id ${item.productId} not found`,
          statusCode: 400,
        });
      }

      taxRate = parseFloat(product.taxRate ?? "15");
      hsCode = product.hsCode ?? null;
    } else {
      // Use item taxRate, fall back to company default, then 15 (Req 3.4)
      taxRate = item.taxRate ?? company.defaultTaxRate ?? 15;
    }

    const lineTotal = item.quantity * item.unitPrice;
    mappedItems.push({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate,
      hsCode,
      lineTotal,
      productId: item.productId,
    });
  }

  // 3. Compute invoice-level totals (Req 3.5)
  const subtotal = mappedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const taxAmount = mappedItems.reduce(
    (sum, i) => sum + i.lineTotal * (i.taxRate / 100),
    0
  );
  const total = subtotal + taxAmount;

  // 4. Generate invoice number
  let invoiceNumber: string;
  try {
    const prefix =
      body.transactionType === "CreditNote"
        ? "CN"
        : body.transactionType === "DebitNote"
        ? "DN"
        : "INV";
    invoiceNumber = await storage.getNextInvoiceNumber(company.id, prefix);
  } catch {
    invoiceNumber = "INV-" + Date.now();
  }

  // 5. Resolve issue date
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();

  // 6. Create invoice — companyId always from req.company.id (Req 3.6)
  let invoice: any;
  try {
    invoice = await storage.createInvoice({
      companyId: company.id,
      customerId: body.customerId ?? null,
      invoiceNumber,
      issueDate,
      dueDate: issueDate,
      currency: company.currency ?? "USD",
      taxInclusive: company.taxInclusive ?? false,
      paymentMethod: body.paymentMethod ?? "CASH",
      transactionType: body.transactionType ?? "FiscalInvoice",
      relatedInvoiceId: body.relatedInvoiceId ?? null,
      notes: body.notes ?? null,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      status: "pending",
      items: mappedItems.map((item) => ({
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        taxRate: item.taxRate.toString(),
        lineTotal: item.lineTotal.toFixed(2),
      })),
    } as any);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to create invoice: " + err.message,
      statusCode: 500,
    });
  }

  // 7. Respond 201 with InvoiceResponse (Req 3.1)
  return res.status(201).json({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    transactionType: invoice.transactionType,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    fiscalCode: invoice.fiscalCode ?? null,
    qrCodeData: invoice.qrCodeData ?? null,
    receiptGlobalNo: invoice.receiptGlobalNo ?? null,
    receiptCounter: invoice.receiptCounter ?? null,
    fiscalDayNo: invoice.fiscalDayNo ?? null,
    companyId: invoice.companyId,
    customerId: invoice.customerId ?? null,
    notes: invoice.notes ?? null,
  });
});

// GET / — list invoices (paginated) (Task 5.3, Req 3.7)
router.get("/", async (req, res) => {
  const company = req.company as any;

  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
  const rawLimit = parseInt((req.query.limit as string) ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));

  try {
    const result = await storage.getInvoicesPaginated(company.id, page, limit);
    return res.status(200).json({
      data: result.data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        transactionType: inv.transactionType,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        total: inv.total,
        fiscalCode: inv.fiscalCode ?? null,
        qrCodeData: inv.qrCodeData ?? null,
        receiptGlobalNo: inv.receiptGlobalNo ?? null,
        receiptCounter: inv.receiptCounter ?? null,
        fiscalDayNo: inv.fiscalDayNo ?? null,
        companyId: inv.companyId,
        customerId: inv.customerId ?? null,
        notes: inv.notes ?? null,
      })),
      total: result.total,
      pages: result.pages,
      page,
      limit,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to list invoices: " + err.message,
      statusCode: 500,
    });
  }
});

// GET /:id — get single invoice (Task 5.4, Req 3.8, 3.9)
router.get("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  const invoice = await storage.getInvoice(id);

  if (!invoice || invoice.companyId !== company.id) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  return res.status(200).json({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    transactionType: invoice.transactionType,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    fiscalCode: invoice.fiscalCode ?? null,
    qrCodeData: invoice.qrCodeData ?? null,
    receiptGlobalNo: invoice.receiptGlobalNo ?? null,
    receiptCounter: invoice.receiptCounter ?? null,
    fiscalDayNo: invoice.fiscalDayNo ?? null,
    companyId: invoice.companyId,
    customerId: invoice.customerId ?? null,
    notes: invoice.notes ?? null,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      lineTotal: item.lineTotal,
      productId: item.productId ?? null,
    })),
    customer: invoice.customer
      ? {
          id: invoice.customer.id,
          name: invoice.customer.name,
          email: invoice.customer.email ?? null,
          phone: invoice.customer.phone ?? null,
          vatNumber: invoice.customer.vatNumber ?? null,
          tin: invoice.customer.tin ?? null,
        }
      : undefined,
  });
});

// PUT /:id — update draft invoice (Task 5.5, Req 3.10, 3.11)
router.put("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  const invoice = await storage.getInvoice(id);

  if (!invoice || invoice.companyId !== company.id) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  // Reject if already fiscalized (Req 3.11)
  if (invoice.fiscalCode !== null) {
    return res.status(422).json({
      error: "INVOICE_ALREADY_FISCALIZED",
      message: "Cannot update a fiscalized invoice",
      statusCode: 422,
    });
  }

  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request body validation failed",
      statusCode: 400,
      details: parsed.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const body = parsed.data;

  try {
    const updated = await storage.updateInvoice(id, {
      customerId: body.customerId,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      dueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      paymentMethod: body.paymentMethod,
      transactionType: body.transactionType,
      relatedInvoiceId: body.relatedInvoiceId,
      notes: body.notes,
    } as any);

    return res.status(200).json({
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
      transactionType: updated.transactionType,
      issueDate: updated.issueDate,
      dueDate: updated.dueDate,
      currency: updated.currency,
      subtotal: updated.subtotal,
      taxAmount: updated.taxAmount,
      total: updated.total,
      fiscalCode: updated.fiscalCode ?? null,
      qrCodeData: updated.qrCodeData ?? null,
      receiptGlobalNo: updated.receiptGlobalNo ?? null,
      receiptCounter: updated.receiptCounter ?? null,
      fiscalDayNo: updated.fiscalDayNo ?? null,
      companyId: updated.companyId,
      customerId: updated.customerId ?? null,
      notes: updated.notes ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to update invoice: " + err.message,
      statusCode: 500,
    });
  }
});

// DELETE /:id — delete draft invoice (Task 5.6, Req 3.12, 3.13)
router.delete("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  const invoice = await storage.getInvoice(id);

  if (!invoice || invoice.companyId !== company.id) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  // Reject if already fiscalized (Req 3.13)
  if (invoice.fiscalCode !== null) {
    return res.status(422).json({
      error: "INVOICE_ALREADY_FISCALIZED",
      message: "Cannot delete a fiscalized invoice",
      statusCode: 422,
    });
  }

  try {
    await storage.deleteInvoice(id);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to delete invoice: " + err.message,
      statusCode: 500,
    });
  }
});

// POST /:id/fiscalize — fiscalize invoice (Task 5.7, Req 4.1–4.5)
router.post("/:id/fiscalize", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  const invoice = await storage.getInvoice(id);

  if (!invoice || invoice.companyId !== company.id) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Invoice not found",
      statusCode: 404,
    });
  }

  // Already fiscalized — 409 (Req 4.3)
  if (invoice.fiscalCode !== null) {
    return res.status(409).json({
      error: "ALREADY_FISCALIZED",
      message: "Invoice has already been fiscalized",
      statusCode: 409,
      fiscalCode: invoice.fiscalCode,
    });
  }

  // Delegate to processInvoiceFiscalization (Req 4.1, 4.5)
  try {
    const result = await processInvoiceFiscalization(id, company.id);

    // Re-fetch to get updated fiscal fields
    const fiscalized = await storage.getInvoice(id);

    return res.status(200).json({
      invoiceId: id,
      invoiceNumber: fiscalized?.invoiceNumber ?? invoice.invoiceNumber,
      fiscalCode: fiscalized?.fiscalCode ?? result?.fiscalCode ?? "",
      qrCodeData: fiscalized?.qrCodeData ?? result?.qrCodeData ?? "",
      receiptGlobalNo: fiscalized?.receiptGlobalNo ?? result?.receiptGlobalNo ?? null,
      receiptCounter: fiscalized?.receiptCounter ?? result?.receiptCounter ?? null,
      fiscalDayNo: fiscalized?.fiscalDayNo ?? result?.fiscalDayNo ?? null,
    });
  } catch (err: any) {
    return res.status(422).json({
      error: "FISCALIZATION_FAILED",
      message: err.message ?? "Fiscalization failed",
      statusCode: 422,
    });
  }
});

export default router;
