/**
 * Property-based tests for the customers router.
 *
 * Property 3: companyId always comes from API key, never from request body
 * Property 4: Cross-company resource access always returns 404
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock storage
vi.mock("../../../storage.js", () => ({
  storage: {
    createCustomer: vi.fn(),
    getCustomers: vi.fn(),
    getCustomer: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));

import { storage } from "../../../storage.js";
import customersRouter from "../customers.js";

function mockCustomer(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: 1,
    name: "Test Customer",
    email: null,
    phone: null,
    address: null,
    vatNumber: null,
    tin: null,
    ...overrides,
  };
}

async function dispatch(
  method: string,
  url: string,
  authCompany: { id: number; [key: string]: any },
  body: Record<string, any> = {}
): Promise<{ statusCode: number; responseBody: any }> {
  let resolveResponse!: () => void;
  const responsePromise = new Promise<void>((r) => { resolveResponse = r; });

  // Simple params parsing for the test router wrapper
  let params: any = {};
  if (url !== "/") {
    params.id = url.slice(1);
  }

  const mockReq: any = {
    method,
    url,
    path: url,
    headers: { "content-type": "application/json" },
    body,
    company: authCompany,
    params,
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
    send() {
      resolveResponse();
      return this;
    },
  };

  customersRouter(mockReq, mockRes, () => resolveResponse());
  await responsePromise;

  return { statusCode: mockRes.statusCode, responseBody: mockRes._body };
}

describe("Customers Router — Property 3: companyId always comes from API key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("POST / always uses req.company.id ignoring body.companyId", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        async (authCompanyId, bodyCompanyId) => {
          vi.clearAllMocks();

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };

          let capturedArgs: any = null;
          vi.mocked(storage.createCustomer).mockImplementation(async (data: any) => {
            capturedArgs = data;
            return mockCustomer({ companyId: authCompanyId }) as any;
          });

          await dispatch("POST", "/", authCompany, {
            name: "Test Customer",
            companyId: bodyCompanyId, // Should be ignored
          });

          expect(capturedArgs).not.toBeNull();
          expect(capturedArgs.companyId).toBe(authCompanyId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Customers Router — Property 4: Cross-company access returns 404", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("GET /:id returns 404 when customer belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, customerCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getCustomer).mockResolvedValue(
            mockCustomer({ companyId: customerCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch("GET", "/1", authCompany);

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("PUT /:id returns 404 when customer belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, customerCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getCustomer).mockResolvedValue(
            mockCustomer({ companyId: customerCompanyId }) as any
          );

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "PUT", "/1", authCompany,
            { name: "Updated Name" }
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });
});
