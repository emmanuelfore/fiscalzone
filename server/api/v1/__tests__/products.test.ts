/**
 * Property-based tests for the products router.
 *
 * Property 4: Cross-company resource access always returns 404
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock storage
vi.mock("../../../storage.js", () => ({
  storage: {
    createProduct: vi.fn(),
    getProducts: vi.fn(),
    updateProduct: vi.fn(),
  },
}));

import { storage } from "../../../storage.js";
import productsRouter from "../products.js";

function mockProduct(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: 1,
    name: "Test Product",
    price: "100.00",
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

  productsRouter(mockReq, mockRes, () => resolveResponse());
  await responsePromise;

  return { statusCode: mockRes.statusCode, responseBody: mockRes._body };
}

describe("Products Router — Property 4: Cross-company access returns 404", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("PUT /:id returns 404 when product belongs to a different company", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        async (authCompanyId, productCompanyId) => {
          vi.clearAllMocks();

          vi.mocked(storage.getProducts).mockImplementation(async (companyId: number) => {
            if (companyId === productCompanyId) {
              return [mockProduct({ id: 1, companyId: productCompanyId }) as any];
            }
            return [];
          });

          const authCompany = { id: authCompanyId, name: "Auth Co", currency: "USD" };
          const { statusCode, responseBody } = await dispatch(
            "PUT", "/1", authCompany,
            { name: "Updated Name", price: 50 }
          );

          expect(statusCode).toBe(404);
          expect(responseBody.error).toBe("NOT_FOUND");
        }
      ),
      { numRuns: 100 }
    );
  });
});
