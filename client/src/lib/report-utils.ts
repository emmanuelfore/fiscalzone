/**
 * Shared utilities for the Reports Module.
 * Covers client-side filtering, aggregation, CSV generation, and AR aging.
 */

/**
 * Filters records client-side by checking if any of the specified fields
 * contains the searchTerm (case-insensitive).
 * If fields is not provided, searches all string values in each record.
 * Returns all records when searchTerm is empty.
 */
export function filterRecords(records: any[], searchTerm: string, fields?: string[]): any[] {
  if (!searchTerm) return records;
  const lower = searchTerm.toLowerCase();
  return records.filter((record) => {
    const searchFields = fields ?? Object.keys(record);
    return searchFields.some((field) => {
      const value = record[field];
      return value != null && typeof value === "string" && value.toLowerCase().includes(lower);
    });
  });
}

/**
 * Sums a numeric string field across records.
 * Parses each record[field] as a float and sums them.
 * Returns 0 for empty arrays or unparseable values.
 */
export function computeTotal(records: any[], field: string): number {
  return records.reduce((sum, record) => {
    const parsed = parseFloat(record[field]);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
}

/**
 * Serializes records to a CSV string with a header row.
 * Values containing commas are wrapped in double quotes.
 */
export function generateCsv(records: any[], columns: string[]): string {
  const escape = (value: any): string => {
    const str = value == null ? "" : String(value);
    return str.includes(",") ? `"${str}"` : str;
  };

  const header = columns.join(",");
  const rows = records.map((record) =>
    columns.map((col) => escape(record[col])).join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Returns a CSV filename following the pattern:
 * {report-name}-{yyyy-MM-dd}-{yyyy-MM-dd}.csv
 */
export function generateCsvFilename(
  reportName: string,
  startDate: Date,
  endDate: Date
): string {
  const fmt = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return `${reportName}-${fmt(startDate)}-${fmt(endDate)}.csv`;
}

/**
 * Triggers a browser download of the given CSV string as a file.
 * Creates a Blob, builds an object URL, clicks a temporary anchor, then revokes the URL.
 */
export function downloadCsv(filename: string, csvString: string): void {
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Returns the AR aging bucket for a given number of days overdue.
 * - "current"  : daysOverdue <= 30 (includes 0 and negative)
 * - "31-60"    : 31 <= daysOverdue <= 60
 * - "61-90"    : 61 <= daysOverdue <= 90
 * - "90+"      : daysOverdue > 90
 */
export function getAgingBucket(
  daysOverdue: number
): "current" | "31-60" | "61-90" | "90+" {
  if (daysOverdue <= 30) return "current";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}
