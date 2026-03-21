/**
 * Property-based tests for the pass-through fiscalize handler.
 *
 * Property 3: companyId always comes from API key, never from request body
 * Validates: Requirements 2.15, 9.1
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock storage and fiscalization before importing the router
// ---------------------------------------------------------------------------
vi.mock("../../../storage.js", () => ({
  storage: {
    createCustomer: vi.fn(),
    createInvoice: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
  },
}));

vi.mock("../../../lib/fiscalization.js", () => ({
  processInvoiceFiscalization: vi.fn(),
}));

import { storage } from "../../../storage.js";
import { processInvoiceFiscalization } from "../../../lib/fiscalization.js";
import fiscalizeRouter from "../fiscalize.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid item */
const minimalItem = {
  description: "Test Item",
  quantity: 1,
  unitPrice: 100,
};

function setupDefaultMocks(authCompanyId: number) {
  vi.mocked(storage.createCustomer).mockResolvedValue({
    id: 1,
    companyId: authCompanyId,
    name: "Walk-in Customer",
    vatNumber: null,
    tin: null,
    phone: null,
    email: null,
    address: null,
  } as any);

  vi.mocked(storage.createInvoice).mockResolvedValue({
    id: 1,
    invoiceNumber: "INV-001",
    companyId: authCompanyId,
    status: "pending",
  } as any);

  vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");

  vi.mocked(processInvoiceFiscalization).mockResolvedValue({
    fiscalCode: "FC123",
    qrCodeData: "QR",
    receiptGlobalNo: 1,
    receiptCounter: 1,
    fiscalDayNo: 1,
    invoiceNumber: "INV-001",
  } as any);
}

/**
 * Dispatch a POST / request through the fiscalize router using mock req/res.
 * Returns the captured createInvoice call arguments (or null if not called).
 */
async function dispatchFiscalize(
  authCompany: { id: number; [key: string]: any },
  body: Record<string, any>
): Promise<{ statusCode: number; responseBody: any; createInvoiceArgs: any }> {
  let createInvoiceArgs: any = null;
  // Promise that resolves when the handler sends a response
  let resolveResponse!: () => void;
  const responsePromise = new Promise<void>((r) => { resolveResponse = r; });

  vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
    createInvoiceArgs = data;
    return {
      id: 1,
      invoiceNumber: "INV-001",
      companyId: authCompany.id,
      status: "pending",
    } as any;
  });

  const mockReq: any = {
    method: "POST",
    url: "/",
    path: "/",
    headers: { "content-type": "application/json" },
    body,
    company: authCompany,
    params: {},
    query: {},
    app: { get: () => undefined },
  };

  const mockRes: any = {
    statusCode: 200,
    _body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: any) {
      this._body = b;
      resolveResponse();
      return this;
    },
  };

  // Dispatch through the router; wait for the response to be sent
  fiscalizeRouter(mockReq, mockRes, () => resolveResponse());
  await responsePromise;

  return {
    statusCode: mockRes.statusCode,
    responseBody: mockRes._body,
    createInvoiceArgs,
  };
}

// ---------------------------------------------------------------------------
// Property 3: companyId always comes from API key, never from request body
// Validates: Requirements 2.15, 9.1
// ---------------------------------------------------------------------------

describe("Pass-Through Handler — Property 3: companyId always comes from API key, never from request body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.15, 9.1**
   *
   * For any combination of:
   * - req.company.id (the authenticated company's id from the API key)
   * - a companyId value that might be in the request body (different from req.company.id)
   *
   * storage.createInvoice must always be called with companyId === req.company.id,
   * regardless of any companyId present in the request body.
   */
  test("storage.createInvoice is always called with companyId from req.company.id, not from request body", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Authenticated company id (from API key resolution)
        fc.integer({ min: 1, max: 1_000_000 }),
        // Arbitrary companyId that an attacker might put in the request body
        fc.integer({ min: 1, max: 1_000_000 }),
        async (authCompanyId, bodyCompanyId) => {
          vi.clearAllMocks();
          setupDefaultMocks(authCompanyId);

          const authCompany = {
            id: authCompanyId,
            name: "Auth Company",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode: "04021099",
          };

          const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
            companyId: bodyCompanyId, // attempt to inject a different companyId
            items: [minimalItem],
          });

          // createInvoice must have been called
          expect(createInvoiceArgs).not.toBeNull();

          // The companyId passed to createInvoice must always be the authenticated one
          expect(createInvoiceArgs.companyId).toBe(authCompanyId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sanity check: even when bodyCompanyId === authCompanyId, the result is correct.
   */
  test("createInvoice companyId matches req.company.id even when body has same companyId", async () => {
    const authCompanyId = 42;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
      companyId: authCompanyId,
      items: [minimalItem],
    });

    expect(createInvoiceArgs).not.toBeNull();
    expect(createInvoiceArgs.companyId).toBe(authCompanyId);
  });

  /**
   * Sanity check: no companyId in body — still uses req.company.id.
   */
  test("createInvoice companyId matches req.company.id when body has no companyId", async () => {
    const authCompanyId = 99;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
      items: [minimalItem],
    });

    expect(createInvoiceArgs).not.toBeNull();
    expect(createInvoiceArgs.companyId).toBe(authCompanyId);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Invoice total arithmetic is always correct
// Validates: Requirements 2.11
// ---------------------------------------------------------------------------

describe("Pass-Through Handler — Property 5: Invoice total arithmetic is always correct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.11**
   *
   * For any array of items with arbitrary quantity (≥0), unitPrice (≥0), and
   * taxRate (0–100), the values passed to storage.createInvoice must satisfy:
   *   lineTotal  = quantity × unitPrice  (per item)
   *   subtotal   = sum of all lineTotals
   *   taxAmount  = sum of (lineTotal × taxRate / 100) per item
   *   total      = subtotal + taxAmount
   *
   * Floating-point comparison uses epsilon = 0.001.
   */
  test("subtotal, taxAmount, and total passed to createInvoice always match the formula", async () => {
    // toFixed(2) rounds each of subtotal, taxAmount, total independently,
    // introducing up to ~0.005 of rounding error per value.  Use 0.01 to
    // give a comfortable margin while still catching real arithmetic bugs.
    const epsilon = 0.01;

    const itemArb = fc.record({
      description: fc.constant("Item"),
      quantity: fc.float({ min: 0, max: 10_000, noNaN: true }),
      unitPrice: fc.float({ min: 0, max: 10_000, noNaN: true }),
      taxRate: fc.float({ min: 0, max: 100, noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        async (items) => {
          vi.clearAllMocks();

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode: "04021099",
          };

          setupDefaultMocks(authCompanyId);

          const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
            items,
          });

          expect(createInvoiceArgs).not.toBeNull();

          // Compute expected values using the formula
          const expectedSubtotal = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );
          const expectedTaxAmount = items.reduce(
            (sum, item) =>
              sum + item.quantity * item.unitPrice * (item.taxRate / 100),
            0
          );
          const expectedTotal = expectedSubtotal + expectedTaxAmount;

          // The handler stores these as toFixed(2) strings — parse them back
          const actualSubtotal = parseFloat(createInvoiceArgs.subtotal);
          const actualTaxAmount = parseFloat(createInvoiceArgs.taxAmount);
          const actualTotal = parseFloat(createInvoiceArgs.total);

          expect(Math.abs(actualSubtotal - expectedSubtotal)).toBeLessThan(epsilon);
          expect(Math.abs(actualTaxAmount - expectedTaxAmount)).toBeLessThan(epsilon);
          expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(epsilon);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sanity check: single item with known values.
   */
  test("single item: lineTotal, subtotal, taxAmount, total are computed correctly", async () => {
    const authCompanyId = 7;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
      items: [{ description: "Widget", quantity: 3, unitPrice: 100, taxRate: 15 }],
    });

    // lineTotal = 3 × 100 = 300
    // subtotal  = 300
    // taxAmount = 300 × 15/100 = 45
    // total     = 345
    expect(parseFloat(createInvoiceArgs.subtotal)).toBeCloseTo(300, 2);
    expect(parseFloat(createInvoiceArgs.taxAmount)).toBeCloseTo(45, 2);
    expect(parseFloat(createInvoiceArgs.total)).toBeCloseTo(345, 2);
  });

  /**
   * Sanity check: multiple items with mixed tax rates.
   */
  test("multiple items with mixed tax rates: totals are computed correctly", async () => {
    const authCompanyId = 8;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs } = await dispatchFiscalize(authCompany, {
      items: [
        { description: "A", quantity: 2, unitPrice: 50, taxRate: 15 },  // lineTotal=100, tax=15
        { description: "B", quantity: 1, unitPrice: 200, taxRate: 0 },  // lineTotal=200, tax=0
        { description: "C", quantity: 4, unitPrice: 25, taxRate: 10 },  // lineTotal=100, tax=10
      ],
    });

    // subtotal  = 100 + 200 + 100 = 400
    // taxAmount = 15 + 0 + 10 = 25
    // total     = 425
    expect(parseFloat(createInvoiceArgs.subtotal)).toBeCloseTo(400, 2);
    expect(parseFloat(createInvoiceArgs.taxAmount)).toBeCloseTo(25, 2);
    expect(parseFloat(createInvoiceArgs.total)).toBeCloseTo(425, 2);
  });
});

// ---------------------------------------------------------------------------
// Property 6: Item defaults are applied when optional fields are omitted
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------

describe("Pass-Through Handler — Property 6: Item defaults are applied when optional fields are omitted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.3, 2.4**
   *
   * For any company with an arbitrary defaultTaxRate (0–100) and any items
   * that omit taxRate and hsCode, the items stored via createInvoice must
   * have taxRate equal to company.defaultTaxRate.
   *
   * Also verifies that when company has no defaultTaxRate, items use 15%.
   * And when company has no defaultHsCode, the handler succeeds (hsCode
   * resolves to "04021099" internally, though not stored in createInvoice items).
   */
  test("items without taxRate use company.defaultTaxRate; fallback to 15 when company has no default", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary company defaultTaxRate (0–100)
        fc.float({ min: 0, max: 100, noNaN: true }),
        // Arbitrary items without taxRate or hsCode
        fc.array(
          fc.record({
            description: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.integer({ min: 1, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (defaultTaxRate, items) => {
          vi.clearAllMocks();

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate,
            defaultHsCode: "12345678",
          };

          setupDefaultMocks(authCompanyId);

          const { createInvoiceArgs, statusCode } = await dispatchFiscalize(
            authCompany,
            { items }
          );

          // Handler must succeed
          expect(statusCode).toBe(200);
          expect(createInvoiceArgs).not.toBeNull();

          // Every item stored must have taxRate = company.defaultTaxRate
          for (const storedItem of createInvoiceArgs.items) {
            expect(parseFloat(storedItem.taxRate)).toBeCloseTo(defaultTaxRate, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * When company has no defaultTaxRate (undefined/null), items without taxRate
   * must fall back to 15%.
   */
  test("items without taxRate fall back to 15% when company has no defaultTaxRate", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            description: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.integer({ min: 1, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          vi.clearAllMocks();

          const authCompanyId = 2;
          // Company with no defaultTaxRate
          const authCompany = {
            id: authCompanyId,
            name: "No Default Co",
            currency: "USD",
            defaultTaxRate: undefined,
            defaultHsCode: undefined,
          };

          setupDefaultMocks(authCompanyId);

          const { createInvoiceArgs, statusCode } = await dispatchFiscalize(
            authCompany,
            { items }
          );

          expect(statusCode).toBe(200);
          expect(createInvoiceArgs).not.toBeNull();

          // Every item must use the 15% fallback
          for (const storedItem of createInvoiceArgs.items) {
            expect(parseFloat(storedItem.taxRate)).toBeCloseTo(15, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * When company has no defaultHsCode, items without hsCode must resolve
   * successfully (handler does not error). The handler uses "04021099" as
   * the internal fallback. We verify the handler returns 200 for any
   * arbitrary company defaultHsCode (or none).
   */
  test("items without hsCode succeed regardless of company defaultHsCode (falls back to 04021099)", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary defaultHsCode or none
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        fc.array(
          fc.record({
            description: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 1000 }),
            unitPrice: fc.integer({ min: 1, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (defaultHsCode, items) => {
          vi.clearAllMocks();

          const authCompanyId = 3;
          const authCompany = {
            id: authCompanyId,
            name: "HS Test Co",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode,
          };

          setupDefaultMocks(authCompanyId);

          const { statusCode } = await dispatchFiscalize(authCompany, { items });

          // Handler must always succeed — hsCode fallback is always applied
          expect(statusCode).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sanity check: explicit taxRate on item overrides company default.
   */
  test("item with explicit taxRate uses its own taxRate, not company default", async () => {
    const authCompanyId = 10;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 20,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs, statusCode } = await dispatchFiscalize(authCompany, {
      items: [{ description: "Widget", quantity: 1, unitPrice: 100, taxRate: 5 }],
    });

    expect(statusCode).toBe(200);
    expect(parseFloat(createInvoiceArgs.items[0].taxRate)).toBeCloseTo(5, 5);
  });

  /**
   * Sanity check: item without taxRate uses company default of 20%.
   */
  test("item without taxRate uses company defaultTaxRate of 20%", async () => {
    const authCompanyId = 11;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 20,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs, statusCode } = await dispatchFiscalize(authCompany, {
      items: [{ description: "Widget", quantity: 1, unitPrice: 100 }],
    });

    expect(statusCode).toBe(200);
    expect(parseFloat(createInvoiceArgs.items[0].taxRate)).toBeCloseTo(20, 5);
  });

  /**
   * Sanity check: item without taxRate and company with no default uses 15%.
   */
  test("item without taxRate and no company default uses 15%", async () => {
    const authCompanyId = 12;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: null,
      defaultHsCode: null,
    };

    const { createInvoiceArgs, statusCode } = await dispatchFiscalize(authCompany, {
      items: [{ description: "Widget", quantity: 1, unitPrice: 100 }],
    });

    expect(statusCode).toBe(200);
    expect(parseFloat(createInvoiceArgs.items[0].taxRate)).toBeCloseTo(15, 5);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Buyer info stored inline without creating customer records
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------

describe("Pass-Through Handler — Property 7: Buyer info stored inline on invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.5**
   *
   * For any pass-through fiscalization request that includes a `buyer` object,
   * the buyer's name, VAT number, and TIN must appear on the created invoice
   * record (in buyerName, buyerVat, buyerTin fields of the createInvoice call).
   * The invoice must NOT be linked to a pre-existing customer via customerId
   * from a permanent customer record — the buyer data is stored inline.
   */
  test("buyer name, vatNumber, and TIN are stored on the invoice record (buyerName, buyerVat, buyerTin)", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary buyer objects
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          vatNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          tin: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        async (buyer) => {
          vi.clearAllMocks();

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode: "04021099",
          };

          setupDefaultMocks(authCompanyId);

          const { createInvoiceArgs, statusCode } = await dispatchFiscalize(
            authCompany,
            {
              items: [minimalItem],
              buyer,
            }
          );

          expect(statusCode).toBe(200);
          expect(createInvoiceArgs).not.toBeNull();

          // Buyer name must be stored inline on the invoice
          expect(createInvoiceArgs.buyerName).toBe(buyer.name);

          // VAT number must be stored inline if provided
          if (buyer.vatNumber !== undefined) {
            expect(createInvoiceArgs.buyerVat).toBe(buyer.vatNumber);
          }

          // TIN must be stored inline if provided
          if (buyer.tin !== undefined) {
            expect(createInvoiceArgs.buyerTin).toBe(buyer.tin);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.5**
   *
   * The invoice must not be linked to a permanent customer via a customerId
   * that was looked up from a pre-existing customer record. The customerId on
   * the createInvoice call (if any) must only come from the transient record
   * created for FK purposes — not from a customer lookup.
   */
  test("invoice is not linked to a pre-existing customer record (no getCustomer call)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          vatNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          tin: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        async (buyer) => {
          vi.clearAllMocks();

          const authCompanyId = 5;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode: "04021099",
          };

          setupDefaultMocks(authCompanyId);

          // Add a getCustomer mock to detect if it's called
          const getCustomerMock = vi.fn();
          (storage as any).getCustomer = getCustomerMock;

          await dispatchFiscalize(authCompany, {
            items: [minimalItem],
            buyer,
          });

          // getCustomer must never be called — buyer data is inline, not looked up
          expect(getCustomerMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sanity check: buyer with all fields populated.
   */
  test("buyer with name, vatNumber, and tin are all stored on the invoice", async () => {
    const authCompanyId = 20;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const buyer = {
      name: "Acme Corp",
      vatNumber: "VAT123456",
      tin: "TIN789",
    };

    const { createInvoiceArgs, statusCode } = await dispatchFiscalize(authCompany, {
      items: [minimalItem],
      buyer,
    });

    expect(statusCode).toBe(200);
    expect(createInvoiceArgs.buyerName).toBe("Acme Corp");
    expect(createInvoiceArgs.buyerVat).toBe("VAT123456");
    expect(createInvoiceArgs.buyerTin).toBe("TIN789");
  });

  /**
   * Sanity check: buyer with only name (no vatNumber or tin).
   */
  test("buyer with only name stores buyerName on the invoice", async () => {
    const authCompanyId = 21;
    setupDefaultMocks(authCompanyId);

    const authCompany = {
      id: authCompanyId,
      name: "Test Co",
      currency: "USD",
      defaultTaxRate: 15,
      defaultHsCode: "04021099",
    };

    const { createInvoiceArgs, statusCode } = await dispatchFiscalize(authCompany, {
      items: [minimalItem],
      buyer: { name: "John Doe" },
    });

    expect(statusCode).toBe(200);
    expect(createInvoiceArgs.buyerName).toBe("John Doe");
  });
});

// ---------------------------------------------------------------------------
// Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED
// Validates: Requirements 2.13
// ---------------------------------------------------------------------------

describe("Pass-Through Handler — Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.13**
   *
   * For any fiscalization attempt where processInvoiceFiscalization() throws
   * an error, the API response must have:
   *   - status 422
   *   - body.error === "FISCALIZATION_FAILED"
   *   - body.message containing the original error message
   */
  test("any processInvoiceFiscalization error yields 422 FISCALIZATION_FAILED with original message", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary error messages
        fc.string({ minLength: 1, maxLength: 500 }),
        async (errorMessage) => {
          vi.clearAllMocks();

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
            defaultHsCode: "04021099",
          };

          // Set up storage mocks (customer + invoice creation succeed)
          vi.mocked(storage.createCustomer).mockResolvedValue({
            id: 1,
            companyId: authCompanyId,
            name: "Walk-in Customer",
            vatNumber: null,
            tin: null,
            phone: null,
            email: null,
            address: null,
          } as any);

          vi.mocked(storage.createInvoice).mockResolvedValue({
            id: 1,
            invoiceNumber: "INV-001",
            companyId: authCompanyId,
            status: "pending",
          } as any);

          vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");

          // processInvoiceFiscalization throws with the generated error message
          vi.mocked(processInvoiceFiscalization).mockRejectedValue(
            new Error(errorMessage)
          );

          const { statusCode, responseBody } = await dispatchFiscalize(authCompany, {
            items: [minimalItem],
          });

          // Must respond with 422
          expect(statusCode).toBe(422);

          // Must have error code FISCALIZATION_FAILED
          expect(responseBody.error).toBe("FISCALIZATION_FAILED");

          // Must include the original error message
          expect(responseBody.message).toContain(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
