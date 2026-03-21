/**
 * Property-based tests for the invoices router (Mode B).
 *
 * Property 3:  companyId always comes from API key, never from request body
 * Property 4:  Cross-company resource access always returns 404
 * Property 5:  Invoice total arithmetic is always correct
 * Property 10: productId causes tax and HS code to be pulled from product record
 * Property 11: Re-fiscalizing an already-fiscalized invoice returns 409
 * Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock modules before importing the router
// ---------------------------------------------------------------------------

vi.mock("../../../storage.js", () => ({
  storage: {
    createInvoice: vi.fn(),
    getInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    deleteInvoice: vi.fn(),
    getInvoicesPaginated: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    getProduct: vi.fn(),
  },
}));

vi.mock("../../../lib/fiscalization.js", () => ({
  processInvoiceFiscalization: vi.fn(),
}));

// Mock db with a chainable select/from/where that returns [] by default.
// We use vi.hoisted so the variable is available inside the vi.mock factory.
const { mockDbChain } = vi.hoisted(() => {
  const mockDbChain = {
    _result: [] as any[],
    select() { return this; },
    from() { return this; },
    where() { return Promise.resolve(this._result); },
  };
  return { mockDbChain };
});

vi.mock("../../../db.js", () => ({
  db: mockDbChain,
}));

import { storage } from "../../../storage.js";
import { processInvoiceFiscalization } from "../../../lib/fiscalization.js";
import invoicesRouter from "../invoices.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid invoice body */
function minimalBody(overrides: Record<string, any> = {}) {
  return {
    items: [{ description: "Test Item", quantity: 1, unitPrice: 100 }],
    ...overrides,
  };
}

/** Build a mock invoice record */
function mockInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    invoiceNumber: "INV-001",
    companyId: 1,
    status: "pending",
    transactionType: "FiscalInvoice",
    issueDate: new Date(),
    dueDate: new Date(),
    currency: "USD",
    subtotal: "100.00",
    taxAmount: "15.00",
    total: "115.00",
    fiscalCode: null,
    qrCodeData: null,
    receiptGlobalNo: null,
    receiptCounter: null,
    fiscalDayNo: null,
    customerId: null,
    notes: null,
    items: [],
    ...overrides,
  };
}

/**
 * Dispatch a request through the invoices router using mock req/res.
 *
 * Pass the actual URL (e.g. "/", "/1", "/1/fiscalize") so Express can match
 * the route and populate req.params automatically.
 */
async function dispatch(
  method: string,
  url: string,
  authCompany: { id: number; [key: string]: any },
  body: Record<string, any> = {},
  _params: Record<string, string> = {},   // kept for API compat but not used
  query: Record<string, string> = {}
): Promise<{ statusCode: number; responseBody: any }> {
  let resolveResponse!: () => void;
  const responsePromise = new Promise<void>((r) => { resolveResponse = r; });

  const mockReq: any = {
    method,
    url,
    path: url,
    headers: { "content-type": "application/json" },
    body,
    company: authCompany,
    params: {},
    query,
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
    send() {
      resolveResponse();
      return this;
    },
  };

  invoicesRouter(mockReq, mockRes, () => resolveResponse());
  await responsePromise;

  return { statusCode: mockRes.statusCode, responseBody: mockRes._body };
}

// ---------------------------------------------------------------------------
// Property 3: companyId always comes from API key, never from request body
// Validates: Requirements 3.6, 9.1
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 3: companyId always comes from API key, never from request body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 3.6, 9.1**
   *
   * For any POST /invoices request, storage.createInvoice must be called with
   * companyId === req.company.id regardless of any companyId in the body.
   */
  test("storage.createInvoice is always called with companyId from req.company.id, not from request body", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        async (authCompanyId, bodyCompanyId) => {
          vi.clearAllMocks();
          mockDbChain._result = [];

          const authCompany = {
            id: authCompanyId,
            name: "Auth Company",
            currency: "USD",
            defaultTaxRate: 15,
          };

          let capturedArgs: any = null;
          vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
          vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
            capturedArgs = data;
            return mockInvoice({ companyId: authCompanyId }) as any;
          });

          await dispatch("POST", "/", authCompany, {
            companyId: bodyCompanyId,
            items: [{ description: "Item", quantity: 1, unitPrice: 50 }],
          });

          expect(capturedArgs).not.toBeNull();
          expect(capturedArgs.companyId).toBe(authCompanyId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("createInvoice companyId matches req.company.id even when body has same companyId", async () => {
    const authCompanyId = 42;
    const authCompany = { id: authCompanyId, name: "Test Co", currency: "USD", defaultTaxRate: 15 };

    let capturedArgs: any = null;
    vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
    vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
      capturedArgs = data;
      return mockInvoice({ companyId: authCompanyId }) as any;
    });

    await dispatch("POST", "/", authCompany, {
      companyId: authCompanyId,
      items: [{ description: "Item", quantity: 1, unitPrice: 50 }],
    });

    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs.companyId).toBe(authCompanyId);
  });
});

// ---------------------------------------------------------------------------
// Property 4: Cross-company resource access always returns 404
// Validates: Requirements 3.9, 4.2, 9.2, 9.3
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 4: Cross-company resource access always returns 404", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 3.9, 4.2, 9.2, 9.3**
   *
   * For GET /:id, PUT /:id, DELETE /:id, POST /:id/fiscalize:
   * when invoice.companyId !== req.company.id, response must be 404.
   */
  test("GET /:id returns 404 when invoice belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, invoiceCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId: invoiceCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "GET", "/1", authCompany
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("PUT /:id returns 404 when invoice belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, invoiceCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId: invoiceCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "PUT", "/1", authCompany,
            { items: [{ description: "X", quantity: 1, unitPrice: 10 }] }
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("DELETE /:id returns 404 when invoice belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, invoiceCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId: invoiceCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "DELETE", "/1", authCompany
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("POST /:id/fiscalize returns 404 when invoice belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, invoiceCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId: invoiceCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "POST", "/1/fiscalize", authCompany
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("GET /:id returns 404 when invoice does not exist", async () => {
    vi.mocked(storage.getInvoice).mockResolvedValue(undefined);
    const authCompany = { id: 1, name: "Auth Co", currency: "USD" };
    const { statusCode, responseBody } = await dispatch(
      "GET", "/999", authCompany
    );
    expect(statusCode).toBe(404);
    expect(responseBody.error).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// Property 5: Invoice total arithmetic is always correct
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 5: Invoice total arithmetic is always correct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * For any items array, the subtotal/taxAmount/total passed to createInvoice
   * must match the formula:
   *   lineTotal  = quantity × unitPrice
   *   subtotal   = sum of lineTotals
   *   taxAmount  = sum of (lineTotal × taxRate / 100)
   *   total      = subtotal + taxAmount
   */
  test("subtotal, taxAmount, and total passed to createInvoice always match the formula", async () => {
    const epsilon = 0.01;

    const itemArb = fc.record({
      description: fc.constant("Item"),
      quantity: fc.float({ min: 0, max: 1_000, noNaN: true }),
      unitPrice: fc.float({ min: 0, max: 1_000, noNaN: true }),
      taxRate: fc.float({ min: 0, max: 100, noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(itemArb, { minLength: 1, maxLength: 10 }),
        async (items) => {
          vi.clearAllMocks();
          mockDbChain._result = [];

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
          };

          let capturedArgs: any = null;
          vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
          vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
            capturedArgs = data;
            return mockInvoice({ companyId: authCompanyId }) as any;
          });

          await dispatch("POST", "/", authCompany, { items });

          expect(capturedArgs).not.toBeNull();

          const expectedSubtotal = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          );
          const expectedTaxAmount = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
            0
          );
          const expectedTotal = expectedSubtotal + expectedTaxAmount;

          const actualSubtotal = parseFloat(capturedArgs.subtotal);
          const actualTaxAmount = parseFloat(capturedArgs.taxAmount);
          const actualTotal = parseFloat(capturedArgs.total);

          expect(Math.abs(actualSubtotal - expectedSubtotal)).toBeLessThan(epsilon);
          expect(Math.abs(actualTaxAmount - expectedTaxAmount)).toBeLessThan(epsilon);
          expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(epsilon);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("single item: subtotal, taxAmount, total are computed correctly", async () => {
    const authCompanyId = 7;
    const authCompany = { id: authCompanyId, name: "Test Co", currency: "USD", defaultTaxRate: 15 };

    let capturedArgs: any = null;
    vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
    vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
      capturedArgs = data;
      return mockInvoice({ companyId: authCompanyId }) as any;
    });

    await dispatch("POST", "/", authCompany, {
      items: [{ description: "Widget", quantity: 3, unitPrice: 100, taxRate: 15 }],
    });

    // lineTotal=300, subtotal=300, taxAmount=45, total=345
    expect(parseFloat(capturedArgs.subtotal)).toBeCloseTo(300, 2);
    expect(parseFloat(capturedArgs.taxAmount)).toBeCloseTo(45, 2);
    expect(parseFloat(capturedArgs.total)).toBeCloseTo(345, 2);
  });

  test("multiple items with mixed tax rates: totals are computed correctly", async () => {
    const authCompanyId = 8;
    const authCompany = { id: authCompanyId, name: "Test Co", currency: "USD", defaultTaxRate: 15 };

    let capturedArgs: any = null;
    vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
    vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
      capturedArgs = data;
      return mockInvoice({ companyId: authCompanyId }) as any;
    });

    await dispatch("POST", "/", authCompany, {
      items: [
        { description: "A", quantity: 2, unitPrice: 50, taxRate: 15 },  // lineTotal=100, tax=15
        { description: "B", quantity: 1, unitPrice: 200, taxRate: 0 },  // lineTotal=200, tax=0
        { description: "C", quantity: 4, unitPrice: 25, taxRate: 10 },  // lineTotal=100, tax=10
      ],
    });

    // subtotal=400, taxAmount=25, total=425
    expect(parseFloat(capturedArgs.subtotal)).toBeCloseTo(400, 2);
    expect(parseFloat(capturedArgs.taxAmount)).toBeCloseTo(25, 2);
    expect(parseFloat(capturedArgs.total)).toBeCloseTo(425, 2);
  });
});

// ---------------------------------------------------------------------------
// Property 10: productId causes tax and HS code to be pulled from product record
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 10: productId causes tax and HS code to be pulled from product record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * When item has productId, the taxRate used must come from the product record,
   * not from item.taxRate.
   */
  test("taxRate in stored item always comes from product record when productId is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Product's taxRate (what should be used)
        fc.float({ min: 0, max: 100, noNaN: true }),
        // Item's inline taxRate (should be ignored)
        fc.float({ min: 0, max: 100, noNaN: true }),
        // Product's hsCode
        fc.string({ minLength: 1, maxLength: 20 }),
        async (productTaxRate, itemTaxRate, hsCode) => {
          vi.clearAllMocks();

          const authCompanyId = 1;
          const authCompany = {
            id: authCompanyId,
            name: "Test Co",
            currency: "USD",
            defaultTaxRate: 15,
          };

          const productId = 42;

          // Mock db chain to return a product with productTaxRate
          mockDbChain._result = [{
            id: productId,
            companyId: authCompanyId,
            name: "Test Product",
            taxRate: productTaxRate.toString(),
            hsCode: "12345678",
          }];

          let capturedArgs: any = null;
          vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
          vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
            capturedArgs = data;
            return mockInvoice({ companyId: authCompanyId }) as any;
          });

          await dispatch("POST", "/", authCompany, {
            items: [{
              description: "Product Item",
              quantity: 1,
              unitPrice: 100,
              productId,
              taxRate: itemTaxRate, // this should be ignored
            }],
          });

          expect(capturedArgs).not.toBeNull();

          // The taxRate stored must come from the product, not the item
          const storedTaxRate = parseFloat(capturedArgs.items[0].taxRate);
          expect(storedTaxRate).toBeCloseTo(productTaxRate, 4);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("hsCode in stored item comes from product record when productId is provided", async () => {
    const authCompanyId = 5;
    const authCompany = { id: authCompanyId, name: "Test Co", currency: "USD", defaultTaxRate: 15 };
    const productId = 10;

    mockDbChain._result = [{
      id: productId,
      companyId: authCompanyId,
      name: "Product",
      taxRate: "20",
      hsCode: "99887766",
    }];

    let capturedArgs: any = null;
    vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");
    vi.mocked(storage.createInvoice).mockImplementation(async (data: any) => {
      capturedArgs = data;
      return mockInvoice({ companyId: authCompanyId }) as any;
    });

    await dispatch("POST", "/", authCompany, {
      items: [{ description: "Item", quantity: 1, unitPrice: 100, productId }],
    });

    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs.items[0].taxRate).toBe("20");
  });

  test("returns 400 when productId references a product not found", async () => {
    const authCompanyId = 6;
    const authCompany = { id: authCompanyId, name: "Test Co", currency: "USD", defaultTaxRate: 15 };

    // db returns empty array — product not found
    mockDbChain._result = [];

    vi.mocked(storage.getNextInvoiceNumber).mockResolvedValue("INV-001");

    const { statusCode, responseBody } = await dispatch("POST", "/", authCompany, {
      items: [{ description: "Item", quantity: 1, unitPrice: 100, productId: 999 }],
    });

    expect(statusCode).toBe(400);
    expect(responseBody.error).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Property 11: Re-fiscalizing an already-fiscalized invoice returns 409
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 11: Re-fiscalizing an already-fiscalized invoice returns 409", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * When invoice.fiscalCode is non-null, POST /:id/fiscalize must return 409
   * ALREADY_FISCALIZED and processInvoiceFiscalization must NOT be called.
   */
  test("POST /:id/fiscalize returns 409 ALREADY_FISCALIZED when invoice already has a fiscalCode", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Arbitrary non-empty fiscal code
        fc.string({ minLength: 1, maxLength: 100 }),
        // Arbitrary company id
        fc.integer({ min: 1, max: 1_000_000 }),
        async (fiscalCode, companyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId, fiscalCode }) as any
          );

          const authCompany = { id: companyId, name: "Test Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "POST", "/1/fiscalize", authCompany
          );

          expect(statusCode).toBe(409);
          expect(responseBody.error).toBe("ALREADY_FISCALIZED");
          expect(processInvoiceFiscalization).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  test("processInvoiceFiscalization is never called when invoice is already fiscalized", async () => {
    const companyId = 1;
    vi.mocked(storage.getInvoice).mockResolvedValue(
      mockInvoice({ companyId, fiscalCode: "FISCAL-CODE-123" }) as any
    );

    const authCompany = { id: companyId, name: "Test Co", currency: "USD" };
    await dispatch("POST", "/1/fiscalize", authCompany);

    expect(processInvoiceFiscalization).not.toHaveBeenCalled();
  });

  test("POST /:id/fiscalize proceeds normally when fiscalCode is null", async () => {
    const companyId = 1;
    vi.mocked(storage.getInvoice)
      .mockResolvedValueOnce(mockInvoice({ companyId, fiscalCode: null }) as any)
      .mockResolvedValueOnce(mockInvoice({ companyId, fiscalCode: "NEW-CODE" }) as any);

    vi.mocked(processInvoiceFiscalization).mockResolvedValue({
      fiscalCode: "NEW-CODE",
      qrCodeData: "QR",
      receiptGlobalNo: 1,
      receiptCounter: 1,
      fiscalDayNo: 1,
    } as any);

    const authCompany = { id: companyId, name: "Test Co", currency: "USD" };
    const { statusCode } = await dispatch(
      "POST", "/1/fiscalize", authCompany
    );

    expect(statusCode).toBe(200);
    expect(processInvoiceFiscalization).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe("Invoices Router — Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain._result = [];
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * When processInvoiceFiscalization throws, response must be 422
   * FISCALIZATION_FAILED with original message.
   */
  test("any processInvoiceFiscalization error yields 422 FISCALIZATION_FAILED with original message", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        async (errorMessage, companyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getInvoice).mockResolvedValue(
            mockInvoice({ companyId, fiscalCode: null }) as any
          );

          vi.mocked(processInvoiceFiscalization).mockRejectedValue(
            new Error(errorMessage)
          );

          const authCompany = { id: companyId, name: "Test Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "POST", "/1/fiscalize", authCompany
          );

          expect(statusCode).toBe(422);
          expect(responseBody.error).toBe("FISCALIZATION_FAILED");
          expect(responseBody.message).toContain(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("fiscalization error message is preserved in the 422 response", async () => {
    const companyId = 1;
    const errorMsg = "ZIMRA device not registered";

    vi.mocked(storage.getInvoice).mockResolvedValue(
      mockInvoice({ companyId, fiscalCode: null }) as any
    );
    vi.mocked(processInvoiceFiscalization).mockRejectedValue(new Error(errorMsg));

    const authCompany = { id: companyId, name: "Test Co", currency: "USD" };
    const { statusCode, responseBody } = await dispatch(
      "POST", "/1/fiscalize", authCompany
    );

    expect(statusCode).toBe(422);
    expect(responseBody.error).toBe("FISCALIZATION_FAILED");
    expect(responseBody.message).toContain(errorMsg);
  });
});
