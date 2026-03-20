/**
 * Property-based and unit tests for report-utils.ts
 * Uses fast-check for property-based testing.
 */
import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  filterRecords,
  computeTotal,
  generateCsv,
  generateCsvFilename,
  getAgingBucket,
} from "../report-utils";

// ---------------------------------------------------------------------------
// Property 1: Client-side search filtering correctness
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------
describe("filterRecords", () => {
  // Feature: reports-module, Property 1: Client-side search filtering correctness
  test("every result contains the search term in at least one string field", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            customerName: fc.string(),
            invoiceNumber: fc.string(),
            total: fc.string(),
          })
        ),
        fc.string({ minLength: 1 }),
        (records, searchTerm) => {
          const filtered = filterRecords(records, searchTerm);
          return filtered.every((r) =>
            Object.values(r).some(
              (v) =>
                typeof v === "string" &&
                v.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test("no non-matching record appears in the result", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            customerName: fc.string(),
            invoiceNumber: fc.string(),
          })
        ),
        fc.string({ minLength: 1 }),
        (records, searchTerm) => {
          const filtered = filterRecords(records, searchTerm);
          const nonMatching = records.filter(
            (r) =>
              !Object.values(r).some(
                (v) =>
                  typeof v === "string" &&
                  v.toLowerCase().includes(searchTerm.toLowerCase())
              )
          );
          return nonMatching.every((r) => !filtered.includes(r));
        }
      ),
      { numRuns: 100 }
    );
  });

  test("empty search term returns all records", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ name: fc.string() })),
        (records) => {
          return filterRecords(records, "").length === records.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("with explicit fields, only those fields are searched", () => {
    const records = [
      { name: "Alice", code: "XYZ" },
      { name: "Bob", code: "ABC" },
    ];
    const result = filterRecords(records, "alice", ["name"]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
});

// ---------------------------------------------------------------------------
// Property 2: Summary stat bar aggregates match filtered data
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------
describe("computeTotal", () => {
  // Feature: reports-module, Property 2: Summary stat bar aggregates match filtered data
  test("sum equals arithmetic sum of the field across all records", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            total: fc.float({ min: 0, max: 100000, noNaN: true }),
          })
        ),
        (records) => {
          const stringRecords = records.map((r) => ({
            total: r.total.toFixed(2),
          }));
          const result = computeTotal(stringRecords, "total");
          // Compare against the sum of the rounded string values (not the original floats)
          const expected = stringRecords.reduce((s, r) => s + parseFloat(r.total), 0);
          return Math.abs(result - expected) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("returns 0 for empty array", () => {
    expect(computeTotal([], "total")).toBe(0);
  });

  test("ignores unparseable values", () => {
    const records = [{ total: "10.00" }, { total: "N/A" }, { total: "5.00" }];
    expect(computeTotal(records, "total")).toBeCloseTo(15, 2);
  });
});

// ---------------------------------------------------------------------------
// Property 4: AR aging bucket assignment correctness
// Validates: Requirements 4.1, 4.3
// ---------------------------------------------------------------------------
describe("getAgingBucket", () => {
  // Feature: reports-module, Property 4: AR aging bucket assignment correctness
  test("bucket is correctly assigned for any days overdue value", () => {
    fc.assert(
      fc.property(fc.integer({ min: -365, max: 730 }), (daysOverdue) => {
        const bucket = getAgingBucket(daysOverdue);
        if (daysOverdue <= 30) return bucket === "current";
        if (daysOverdue <= 60) return bucket === "31-60";
        if (daysOverdue <= 90) return bucket === "61-90";
        return bucket === "90+";
      }),
      { numRuns: 100 }
    );
  });

  test("boundary values", () => {
    expect(getAgingBucket(0)).toBe("current");
    expect(getAgingBucket(1)).toBe("current");
    expect(getAgingBucket(30)).toBe("current");
    expect(getAgingBucket(31)).toBe("31-60");
    expect(getAgingBucket(60)).toBe("31-60");
    expect(getAgingBucket(61)).toBe("61-90");
    expect(getAgingBucket(90)).toBe("61-90");
    expect(getAgingBucket(91)).toBe("90+");
    expect(getAgingBucket(-5)).toBe("current");
  });
});

// ---------------------------------------------------------------------------
// Property 9: CSV export rows match filtered list
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------
describe("generateCsv", () => {
  // Feature: reports-module, Property 9: CSV export rows match filtered list
  test("CSV row count matches record count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer(),
            customerName: fc.string(),
            total: fc.string(),
          })
        ),
        (records) => {
          const csv = generateCsv(records, ["id", "customerName", "total"]);
          const lines = csv.trim().split("\n");
          // First line is header, rest are data rows
          return lines.length - 1 === records.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("header row matches columns", () => {
    const csv = generateCsv([{ a: "1", b: "2" }], ["a", "b"]);
    const [header] = csv.split("\n");
    expect(header).toBe("a,b");
  });

  test("values with commas are quoted", () => {
    const csv = generateCsv([{ name: "Smith, John" }], ["name"]);
    expect(csv).toContain('"Smith, John"');
  });

  test("empty records produce only header", () => {
    const csv = generateCsv([], ["id", "name"]);
    expect(csv.trim()).toBe("id,name");
  });
});

// ---------------------------------------------------------------------------
// Property 10: CSV filename follows naming pattern
// Validates: Requirements 9.4
// ---------------------------------------------------------------------------
describe("generateCsvFilename", () => {
  // Feature: reports-module, Property 10: CSV filename follows naming pattern
  test("filename matches {report-name}-{yyyy-MM-dd}-{yyyy-MM-dd}.csv", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "sales",
          "ar-aging-summary",
          "expense-details",
          "tax-summary"
        ),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }).filter((d) => !isNaN(d.getTime())),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }).filter((d) => !isNaN(d.getTime())),
        (reportName, startDate, endDate) => {
          const filename = generateCsvFilename(reportName, startDate, endDate);
          const pattern = new RegExp(
            `^${reportName}-\\d{4}-\\d{2}-\\d{2}-\\d{4}-\\d{2}-\\d{2}\\.csv$`
          );
          return pattern.test(filename);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("specific date formatting", () => {
    const filename = generateCsvFilename(
      "sales",
      new Date(2024, 0, 5),  // Jan 5 2024
      new Date(2024, 11, 31) // Dec 31 2024
    );
    expect(filename).toBe("sales-2024-01-05-2024-12-31.csv");
  });
});
