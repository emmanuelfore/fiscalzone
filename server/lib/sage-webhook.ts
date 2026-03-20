import { Router, type Request, type Response, type RequestHandler } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "../supabase.js";
import { processInvoiceFiscalization } from "./fiscalization.js";
import { storage } from "../storage.js";
import { db } from "../db.js";
import { invoices } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

const router = Router();

/** Sage event type we care about */
const SAGE_INVOICE_CREATED = "SALES_INVOICE_CREATED";

/**
 * Verifies the HMAC-SHA256 signature sent by Sage in the
 * `X-Sage-Signature` header against the raw request body.
 *
 * @param rawBody  - Raw Buffer of the request body
 * @param signature - Value of the `X-Sage-Signature` header
 * @param signingKey - Secret key from `SAGE_WEBHOOK_SIGNING_KEY`
 * @returns true if the signature is valid
 */
function verifySageSignature(rawBody: Buffer, signature: string, signingKey: string): boolean {
  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Fetches a fresh access token for the given Sage connection using the
 * stored refresh token. Updates the `sage_connections` row in Supabase
 * with the new tokens.
 *
 * @param connection - Row from `sage_connections` table
 * @returns New access token string
 */
async function refreshSageToken(connection: any): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
    client_id: process.env.SAGE_CLIENT_ID!,
    client_secret: process.env.SAGE_CLIENT_SECRET!,
  });

  const resp = await fetch("https://oauth.accounting.sage.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Sage token refresh failed: ${resp.status} ${await resp.text()}`);
  }

  const data: any = await resp.json();

  // Persist refreshed tokens
  await supabaseAdmin!
    .from("sage_connections")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? connection.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return data.access_token;
}

/**
 * Fetches the full Sage sales invoice by its origin_id.
 * Automatically retries once with a refreshed token on HTTP 401.
 *
 * @param originId   - Sage invoice origin_id from the webhook payload
 * @param connection - Row from `sage_connections` table
 * @returns Parsed Sage invoice object
 */
async function fetchSageInvoice(originId: string, connection: any): Promise<any> {
  const baseUrl = process.env.SAGE_API_BASE_URL!;
  let token = connection.access_token;

  const doFetch = async (accessToken: string) =>
    fetch(`${baseUrl}/v3.1/sales_invoices/${originId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

  let resp = await doFetch(token);

  if (resp.status === 401) {
    token = await refreshSageToken(connection);
    resp = await doFetch(token);
  }

  if (!resp.ok) {
    throw new Error(`Sage invoice fetch failed: ${resp.status} ${await resp.text()}`);
  }

  return resp.json();
}

/**
 * Attaches a fiscal receipt PDF (base64-encoded) to a Sage invoice.
 * Uses the invoice's origin_id as the resource identifier.
 *
 * @param originId   - Sage invoice origin_id
 * @param pdfBase64  - Base64-encoded PDF content
 * @param connection - Row from `sage_connections` table
 */
async function attachReceiptToSageInvoice(
  originId: string,
  pdfBase64: string,
  connection: any
): Promise<void> {
  const baseUrl = process.env.SAGE_API_BASE_URL!;

  const resp = await fetch(`${baseUrl}/v3.1/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attachment: {
        file: pdfBase64,
        file_name: `fiscal_receipt_${originId}.pdf`,
        mime_type: "application/pdf",
        description: "ZIMRA Fiscal Receipt",
        attachable_sgid: originId,
      },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Sage attachment upload failed: ${resp.status} ${await resp.text()}`);
  }
}

/**
 * Logs the outcome of a Sage fiscal event to the `sage_fiscal_events`
 * table in Supabase for audit and deduplication purposes.
 *
 * @param originId  - Sage invoice origin_id
 * @param companyId - Internal company ID
 * @param status    - "success" | "failed" | "skipped"
 * @param details   - Additional context (error message, etc.)
 */
async function logSageFiscalEvent(
  originId: string,
  companyId: number,
  status: "success" | "failed" | "skipped",
  details?: Record<string, any>
): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("sage_fiscal_events").insert({
    origin_id: originId,
    company_id: companyId,
    status,
    details: details ?? null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Checks whether a Sage invoice has already been fiscalized by looking
 * up a successful entry in `sage_fiscal_events`.
 *
 * @param originId  - Sage invoice origin_id
 * @param companyId - Internal company ID
 * @returns true if a successful event already exists (duplicate)
 */
async function isDuplicate(originId: string, companyId: number): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data } = await supabaseAdmin
    .from("sage_fiscal_events")
    .select("id")
    .eq("origin_id", originId)
    .eq("company_id", companyId)
    .eq("status", "success")
    .maybeSingle();
  return !!data;
}

/**
 * Maps a Sage sales invoice object to the internal invoice format
 * expected by `processInvoiceFiscalization`. Creates or updates the
 * invoice record in local storage and returns its internal ID.
 *
 * @param sageInvoice - Full Sage invoice object from the API
 * @param companyId   - Internal company ID
 * @returns Internal invoice ID
 */
async function upsertInvoiceFromSage(sageInvoice: any, companyId: number): Promise<number> {
  // Deduplicate by invoice number (Sage invoice numbers are unique per company)
  const invoiceNumber = sageInvoice.invoice_number ?? sageInvoice.id;
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), eq(invoices.invoiceNumber, invoiceNumber)))
    .limit(1);

  if (existing) return existing.id;

  const items = (sageInvoice.invoice_lines ?? []).map((line: any) => ({
    description: line.description ?? "",
    quantity: parseFloat(line.quantity ?? "1"),
    unitPrice: parseFloat(line.unit_price?.amount ?? "0"),
    taxRate: parseFloat(line.tax_rate?.percentage ?? "0"),
    lineTotal: parseFloat(line.net_amount?.amount ?? "0"),
  }));

  const invoice = await storage.createInvoice({
    companyId,
    invoiceNumber,
    issueDate: new Date(sageInvoice.date),
    dueDate: sageInvoice.due_date ? new Date(sageInvoice.due_date) : new Date(),
    currency: sageInvoice.currency_id ?? "USD",
    subtotal: sageInvoice.net_amount?.amount ?? "0",
    taxAmount: sageInvoice.tax_amount?.amount ?? "0",
    total: sageInvoice.total_amount?.amount ?? "0",
    status: "pending",
    transactionType: "FiscalInvoice",
    taxInclusive: false,
    items,
  } as any);

  return invoice.id;
}

/**
 * POST /api/webhooks/sage
 *
 * Receives Sage Business Cloud webhook events. Validates the HMAC
 * signature, filters for SALES_INVOICE_CREATED events, fetches the
 * full invoice, fiscalizes it via ZIMRA, attaches the receipt PDF back
 * to Sage, and logs the result. Always returns HTTP 200 so Sage does
 * not retry on application-level errors (retries are handled internally).
 */
router.post("/", (async (req: Request & { rawBody?: Buffer }, res: Response) => {
  // Always respond 200 immediately — Sage must not retry on our errors
  res.status(200).json({ received: true });

  const signingKey = process.env.SAGE_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.error("[SageWebhook] SAGE_WEBHOOK_SIGNING_KEY is not set");
    return;
  }

  // Signature verification
  const signature = req.headers["x-sage-signature"] as string | undefined;
  const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));

  if (!signature || !verifySageSignature(rawBody, signature, signingKey)) {
    console.warn("[SageWebhook] Invalid signature — ignoring event");
    return;
  }

  const event = req.body;
  const eventType: string = event?.event_type ?? event?.type ?? "";
  const originId: string = event?.entity?.id ?? event?.origin_id ?? "";

  // Only handle invoice created events
  if (eventType !== SAGE_INVOICE_CREATED) {
    console.log(`[SageWebhook] Ignoring event type: ${eventType}`);
    return;
  }

  if (!originId) {
    console.error("[SageWebhook] Missing origin_id in event payload");
    return;
  }

  // Resolve company from Sage business ID
  const businessId: string = event?.entity?.business?.id ?? event?.business_id ?? "";

  if (!supabaseAdmin) {
    console.error("[SageWebhook] Supabase admin client not available");
    return;
  }

  const { data: connection, error: connErr } = await supabaseAdmin
    .from("sage_connections")
    .select("*")
    .eq("sage_business_id", businessId)
    .maybeSingle();

  if (connErr || !connection) {
    console.error(`[SageWebhook] No sage_connection found for business ${businessId}:`, connErr?.message);
    return;
  }

  const companyId: number = connection.company_id;

  // Deduplication check
  if (await isDuplicate(originId, companyId)) {
    console.log(`[SageWebhook] Duplicate event for origin_id=${originId} — skipping`);
    return;
  }

  try {
    // Fetch full invoice from Sage
    const sageInvoice = await fetchSageInvoice(originId, connection);

    // Map to internal invoice and persist
    const invoiceId = await upsertInvoiceFromSage(sageInvoice, companyId);

    // Fiscalize via ZIMRA
    const fiscalized = await processInvoiceFiscalization(invoiceId, companyId);

    // Attach fiscal receipt PDF back to Sage invoice if available
    const fiscalizedAny = fiscalized as any;
    if (fiscalizedAny?.fiscalReceiptPdf) {
      await attachReceiptToSageInvoice(originId, fiscalizedAny.fiscalReceiptPdf, connection);
    }

    await logSageFiscalEvent(originId, companyId, "success", { invoiceId });
    console.log(`[SageWebhook] Successfully fiscalized Sage invoice ${originId} → internal #${invoiceId}`);
  } catch (err: any) {
    console.error(`[SageWebhook] Failed to process invoice ${originId}:`, err.message);
    await logSageFiscalEvent(originId, companyId, "failed", { error: err.message });
  }
}) as RequestHandler);

export default router;
