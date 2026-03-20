/**
 * Property-based tests for resolveApiKey middleware.
 *
 * Property 1: Invalid API key always returns 401
 * Validates: Requirements 1.3, 1.4
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock the storage module before importing middleware
// ---------------------------------------------------------------------------
vi.mock("../../../storage.js", () => ({
  storage: {
    getCompanyByApiKey: vi.fn(),
  },
}));

import { storage } from "../../../storage.js";
import { resolveApiKey } from "../middleware.js";

// ---------------------------------------------------------------------------
// Helpers to build mock req / res objects
// ---------------------------------------------------------------------------

function buildReq(headers: Record<string, string> = {}) {
  return {
    headers,
    company: undefined,
  } as any;
}

function buildRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;

  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: any) => {
    res.body = body;
    return res;
  };
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveApiKey middleware — Property 1: Invalid API key always returns 401", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1a: Missing X-API-Key header → 401 MISSING_API_KEY
   * Validates: Requirement 1.3
   */
  test("missing X-API-Key header returns 401 with MISSING_API_KEY", async () => {
    const req = buildReq({}); // no x-api-key header
    const res = buildRes();
    const next = vi.fn();

    await resolveApiKey(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("MISSING_API_KEY");
    expect(res.body.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * Property 1b (PBT): For any arbitrary string as X-API-Key where storage returns null,
   * the response must be 401 with INVALID_API_KEY.
   * Validates: Requirement 1.4
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  test("any arbitrary X-API-Key string that storage cannot resolve returns 401 INVALID_API_KEY", async () => {
    // storage.getCompanyByApiKey always returns null (key not found)
    vi.mocked(storage.getCompanyByApiKey).mockResolvedValue(null as any);

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary non-empty strings — including unicode, special chars
        fc.string({ minLength: 1 }),
        async (arbitraryKey) => {
          const req = buildReq({ "x-api-key": arbitraryKey });
          const res = buildRes();
          const next = vi.fn();

          await resolveApiKey(req, res, next);

          expect(res.statusCode).toBe(401);
          expect(res.body.error).toBe("INVALID_API_KEY");
          expect(res.body.statusCode).toBe(401);
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sanity check: valid key (storage returns a company) should NOT return 401.
   */
  test("valid API key (storage returns a company) calls next and does not return 401", async () => {
    const mockCompany = { id: 1, name: "Test Company" };
    vi.mocked(storage.getCompanyByApiKey).mockResolvedValue(mockCompany as any);

    const req = buildReq({ "x-api-key": "valid-key-abc123" });
    const res = buildRes();
    const next = vi.fn();

    await resolveApiKey(req, res, next);

    expect(res.statusCode).toBe(200); // unchanged — middleware didn't set it
    expect(next).toHaveBeenCalledOnce();
    expect(req.company).toEqual(mockCompany);
  });
});

/**
 * Property-based tests for resolveApiKey middleware.
 *
 * Property 2: Valid API key attaches company to request context
 * Validates: Requirements 1.2
 *
 * **Validates: Requirements 1.2**
 */
describe("resolveApiKey middleware — Property 2: Valid API key attaches company to request context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("for any valid API key, req.company equals the company returned by storage and next() is called", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary company objects with at least id (integer) and name (string)
        fc.record({
          id: fc.integer({ min: 1, max: 1_000_000 }),
          name: fc.string({ minLength: 1 }),
        }),
        // Generate an arbitrary non-empty API key string
        fc.string({ minLength: 1 }),
        async (company, apiKey) => {
          vi.mocked(storage.getCompanyByApiKey).mockResolvedValue(company as any);

          const req = buildReq({ "x-api-key": apiKey });
          const res = buildRes();
          const next = vi.fn();

          await resolveApiKey(req, res, next);

          // Company should be attached to request context
          expect(req.company).toEqual(company);
          // next() must have been called
          expect(next).toHaveBeenCalledOnce();
          // Response status must NOT be 401
          expect(res.statusCode).not.toBe(401);

          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
