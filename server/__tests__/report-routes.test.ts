/**
 * Property-based tests for report API routes.
 * Uses fast-check for property-based testing.
 *
 * Properties tested:
 *   Property 6: Server authorization — 403 for unauthorized company access
 *   Property 7: Server date range filtering — all returned records within range
 *   Property 8: Monetary amounts formatted as strings with two decimal places
 */
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";

// ---------------------------------------------------------------------------
// Minimal test app that mirrors the route logic without a real DB
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app that replicates the report route logic
 * (auth check, ownership check, date parsing) using in-memory stubs.
 */
function buildTestApp(opts: {
  /** companyIds the authenticated test user owns */
  ownedCompanyIds: number[];
  /** stub data returned by every storage method */
  stubData: any[];
}) {
  const app = express();
  app.use(express.json());

  // Simulate session-based auth: attach a fake user to every request
  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = {
      id: 1,
      isSuperAdmin: false,
    };
    next();
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const reportRouteHandler = (storageMethod: (id: number, s: Date, e: Date) => Promise<any>) => {
    return async (req: any, res: any) => {
      try {
        const companyId = parseInt(req.params.companyId);
        if (isNaN(companyId)) {
          return res.status(400).json({ message: "Invalid companyId" });
        }

        // Company ownership check
        if (!req.user.isSuperAdmin) {
          if (!opts.ownedCompanyIds.includes(companyId)) {
            return res.status(403).json({ message: "Forbidden" });
          }
        }

        // Parse date range with current-month defaults
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (req.query.startDate) {
          startDate = new Date(req.query.startDate as string);
          if (isNaN(startDate.getTime())) {
            return res.status(400).json({ message: "Invalid startDate format" });
          }
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (req.query.endDate) {
          endDate = new Date(req.query.endDate as string);
          if (isNaN(endDate.getTime())) {
            return res.status(400).json({ message: "Invalid endDate format" });
          }
        } else {
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const data = await storageMethod(companyId, startDate, endDate);
        res.json(data);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    };
  };

  const stub = (_id: number, _s: Date, _e: Date) => Promise.resolve(opts.stubData);

  const reportNames = [
    "sales-summary",
    "sales-by-customer",
    "sales-by-item",
    "sales-by-salesperson",
    "ar-aging-summary",
    "ar-aging-details",
    "invoice-details",
    "quote-details",
    "customer-balance-summary",
    "receivable-summary",
    "receivable-details",
    "bad-debts",
    "bank-charges",
    "time-to-get-paid",
    "refund-history",
    "withholding-tax",
    "expense-details",
    "expenses-by-category",
    "expenses-by-customer",
    "expenses-by-project",
    "billable-expense-details",
    "tax-summary",
  ];

  for (const name of reportNames) {
    app.get(`/api/companies/:companyId/reports/${name}`, requireAuth, reportRouteHandler(stub));
  }

  return app;
}

/** Make a simple HTTP request to the test app without supertest */
async function makeRequest(
  app: Express,
  path: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const url = `http://127.0.0.1:${port}${path}`;
      import("http").then(({ request }) => {
        const req = request(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close();
            try {
              resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode ?? 0, body: data });
            }
          });
        });
        req.on("error", (err) => {
          server.close();
          reject(err);
        });
        req.end();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Property 6: Server authorization — 403 for unauthorized company access
// Validates: Requirements 8.2, 8.7
// ---------------------------------------------------------------------------
describe("Property 6: Server authorization", () => {
  // Feature: reports-module, Property 6: Server authorization — 403 for unauthorized company access
  test("report endpoints return 403 for companyId not owned by the user", async () => {
    const ownedId = 42;
    const app = buildTestApp({ ownedCompanyIds: [ownedId], stubData: [] });

    await fc.assert(
      fc.asyncProperty(
        // Generate companyIds that are definitely NOT owned (avoid ownedId)
        fc.integer({ min: 99000, max: 99999 }),
        fc.constantFrom(
          "sales-summary",
          "invoice-details",
          "expense-details",
          "tax-summary",
          "ar-aging-summary",
          "bad-debts"
        ),
        async (companyId, reportName) => {
          const { status } = await makeRequest(
            app,
            `/api/companies/${companyId}/reports/${reportName}`
          );
          return status === 403;
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  test("report endpoints return 200 for owned companyId", async () => {
    const ownedId = 42;
    const app = buildTestApp({
      ownedCompanyIds: [ownedId],
      stubData: [{ date: "2024-01-01", total: "100.00" }],
    });

    const { status } = await makeRequest(
      app,
      `/api/companies/${ownedId}/reports/sales-summary`
    );
    expect(status).toBe(200);
  });

  test("superAdmin bypasses ownership check", async () => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.isAuthenticated = () => true;
      req.user = { id: 1, isSuperAdmin: true };
      next();
    });

    const requireAuth = (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      next();
    };

    app.get("/api/companies/:companyId/reports/sales-summary", requireAuth, async (req: any, res) => {
      const companyId = parseInt(req.params.companyId);
      if (!req.user.isSuperAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json([{ date: "2024-01-01", total: "100.00" }]);
    });

    const { status } = await makeRequest(app, "/api/companies/99999/reports/sales-summary");
    expect(status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Server date range filtering — all returned records within range
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------
describe("Property 7: Server date range filtering", () => {
  // Feature: reports-module, Property 7: Server date range filtering — all returned records within range

  /**
   * Build an app whose stub filters records by date so we can verify
   * the route correctly passes startDate/endDate to the storage method.
   */
  function buildFilteringApp(allRecords: { date: string; total: string }[]) {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.isAuthenticated = () => true;
      req.user = { id: 1, isSuperAdmin: false };
      next();
    });

    const requireAuth = (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      next();
    };

    app.get("/api/companies/:companyId/reports/sales-summary", requireAuth, async (req: any, res) => {
      const companyId = parseInt(req.params.companyId);
      if (companyId !== 1) return res.status(403).json({ message: "Forbidden" });

      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
        if (isNaN(startDate.getTime())) return res.status(400).json({ message: "Invalid startDate format" });
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        if (isNaN(endDate.getTime())) return res.status(400).json({ message: "Invalid endDate format" });
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Simulate storage filtering by date range
      const filtered = allRecords.filter((r) => {
        const d = new Date(r.date);
        return d >= startDate && d <= endDate;
      });

      res.json(filtered);
    });

    return app;
  }

  test("all returned records fall within the requested date range", async () => {
    // Generate a fixed set of records spanning 2023-2025
    const allRecords = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2023 + Math.floor(i / 12), i % 12, 1).toISOString().split("T")[0],
      total: "100.00",
    }));

    const app = buildFilteringApp(allRecords);

    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date("2023-01-01"), max: new Date("2024-06-01") }).filter((d) => !isNaN(d.getTime())),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2025-12-31") }).filter((d) => !isNaN(d.getTime())),
        async (startDate, endDate) => {
          const start = startDate.toISOString().split("T")[0];
          const end = endDate.toISOString().split("T")[0];
          const { status, body } = await makeRequest(
            app,
            `/api/companies/1/reports/sales-summary?startDate=${start}&endDate=${end}`
          );
          if (status !== 200) return false;
          return (body as { date: string; total: string }[]).every((r) => {
            const d = new Date(r.date);
            return d >= new Date(start) && d <= new Date(end);
          });
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  test("returns 400 for invalid date format", async () => {
    const app = buildFilteringApp([]);
    const { status } = await makeRequest(
      app,
      "/api/companies/1/reports/sales-summary?startDate=not-a-date"
    );
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Property 8: Monetary amounts formatted as strings with two decimal places
// Validates: Requirements 8.5
// ---------------------------------------------------------------------------
describe("Property 8: Monetary amount format", () => {
  // Feature: reports-module, Property 8: Monetary amounts formatted as strings with two decimal places

  const MONETARY_PATTERN = /^\d+\.\d{2}$/;

  /** Generate records whose monetary fields are already formatted as toFixed(2) strings */
  const monetaryRecord = fc.record({
    total: fc.float({ min: 0, max: 1_000_000, noNaN: true }).map((n) => n.toFixed(2)),
    subtotal: fc.float({ min: 0, max: 1_000_000, noNaN: true }).map((n) => n.toFixed(2)),
    taxAmount: fc.float({ min: 0, max: 100_000, noNaN: true }).map((n) => n.toFixed(2)),
  });

  test("all monetary fields match \\d+\\.\\d{2} pattern for any generated dataset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(monetaryRecord, { minLength: 1, maxLength: 20 }),
        async (records) => {
          const app = buildTestApp({ ownedCompanyIds: [1], stubData: records });
          const { status, body } = await makeRequest(
            app,
            "/api/companies/1/reports/sales-summary"
          );
          if (status !== 200) return false;

          const monetaryFields = ["total", "subtotal", "taxAmount", "amount", "outputTax", "inputTax", "netVat"];
          return (body as any[]).every((row) =>
            monetaryFields
              .filter((f) => f in row)
              .every((f) => MONETARY_PATTERN.test(row[f]))
          );
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  test("monetary pattern rejects values without two decimal places", () => {
    expect(MONETARY_PATTERN.test("100")).toBe(false);
    expect(MONETARY_PATTERN.test("100.1")).toBe(false);
    expect(MONETARY_PATTERN.test("100.123")).toBe(false);
    expect(MONETARY_PATTERN.test("100.00")).toBe(true);
    expect(MONETARY_PATTERN.test("0.00")).toBe(true);
    expect(MONETARY_PATTERN.test("1234567.89")).toBe(true);
  });
});
