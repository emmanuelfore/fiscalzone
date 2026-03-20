# Implementation Plan: Reports Module

## Overview

Implement the Reports Module as a two-panel React page at `/reports-module` with 20 report sub-components, all backend API endpoints, CSV export, and property-based tests using fast-check. Implementation follows the existing patterns in `invoice-details.tsx` and `payments-received.tsx`.

## Tasks

- [x] 1. Implement CSV export utility and shared report helpers
  - Create `client/src/lib/report-utils.ts` exporting:
    - `filterRecords(records, searchTerm, fields)` — case-insensitive client-side filter
    - `computeTotal(records, field)` — sums a numeric string field across records
    - `generateCsv(records, columns)` — serializes records to CSV string with header row
    - `generateCsvFilename(reportName, startDate, endDate)` — returns `{report-name}-{yyyy-MM-dd}-{yyyy-MM-dd}.csv`
    - `downloadCsv(filename, csvString)` — triggers browser download via Blob URL
    - `getAgingBucket(daysOverdue)` — returns `"current" | "31-60" | "61-90" | "90+"`
  - _Requirements: 2.4, 9.2, 9.3, 9.4_

  - [x] 1.1 Write property test for `filterRecords` (Property 1)
    - **Property 1: Client-side search filtering correctness**
    - **Validates: Requirements 2.4**
    - File: `client/src/lib/__tests__/report-utils.test.ts`

  - [x] 1.2 Write property test for `computeTotal` (Property 2)
    - **Property 2: Summary stat bar aggregates match filtered data**
    - **Validates: Requirements 2.5**

  - [x] 1.3 Write property test for `getAgingBucket` (Property 4)
    - **Property 4: AR aging bucket assignment correctness**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 1.4 Write property test for `generateCsv` (Property 9)
    - **Property 9: CSV export rows match filtered list**
    - **Validates: Requirements 9.3**

  - [x] 1.5 Write property test for `generateCsvFilename` (Property 10)
    - **Property 10: CSV filename follows naming pattern**
    - **Validates: Requirements 9.4**

- [x] 2. Add all backend report storage methods to `server/storage.ts`
  - Add the following methods to the `IStorage` interface and `DatabaseStorage` class:
    - `getReportSalesSummary(companyId, start, end)`
    - `getReportSalesByCustomer(companyId, start, end)`
    - `getReportSalesByItem(companyId, start, end)`
    - `getReportSalesBySalesperson(companyId, start, end)`
    - `getReportArAgingSummary(companyId, start, end)`
    - `getReportArAgingDetails(companyId, start, end)`
    - `getReportInvoiceDetails(companyId, start, end)`
    - `getReportQuoteDetails(companyId, start, end)`
    - `getReportCustomerBalanceSummary(companyId, start, end)`
    - `getReportReceivableSummary(companyId, start, end)`
    - `getReportReceivableDetails(companyId, start, end)`
    - `getReportBadDebts(companyId, start, end)`
    - `getReportBankCharges(companyId, start, end)`
    - `getReportTimeToGetPaid(companyId, start, end)`
    - `getReportRefundHistory(companyId, start, end)`
    - `getReportWithholdingTax(companyId, start, end)`
    - `getReportExpenseDetails(companyId, start, end)`
    - `getReportExpensesByCategory(companyId, start, end)`
    - `getReportExpensesByCustomer(companyId, start, end)`
    - `getReportExpensesByProject(companyId, start, end)`
    - `getReportBillableExpenseDetails(companyId, start, end)`
    - `getReportTaxSummary(companyId, start, end)`
  - Each method uses Drizzle ORM with `eq(companyId)` + `gte`/`lte` on `issueDate` or `expenseDate`
  - All monetary values returned as `toFixed(2)` strings
  - AR aging methods compute `daysOverdue` as `CURRENT_DATE - dueDate` and assign bucket via `getAgingBucket`
  - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_

- [x] 3. Add all backend report routes to `server/routes.ts`
  - Register individual named routes for each of the 22 report endpoints under `GET /api/companies/:companyId/reports/:reportName`
  - Each route: validates auth via `requireAuth`, checks company ownership (403 if not authorized), parses `startDate`/`endDate` with current-month defaults, delegates to the matching storage method, returns JSON
  - Return 400 for invalid date formats
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_

  - [x] 3.1 Write property test for server authorization (Property 6)
    - **Property 6: Server authorization — 403 for unauthorized company access**
    - **Validates: Requirements 8.2, 8.7**
    - File: `server/__tests__/report-routes.test.ts`

  - [x] 3.2 Write property test for server date range filtering (Property 7)
    - **Property 7: Server date range filtering — all returned records within range**
    - **Validates: Requirements 8.3**

  - [x] 3.3 Write property test for monetary amount format (Property 8)
    - **Property 8: Monetary amounts formatted as strings with two decimal places**
    - **Validates: Requirements 8.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Build the Reports page shell and sidebar (`client/src/pages/reports.tsx`)
  - Create `client/src/pages/reports.tsx` with:
    - `ReportsPage` component managing `activeReport` and `openCategories` state
    - `ReportSidebar` component with 5 `Collapsible` category groups and all 20 report links
    - Active report link styled `bg-violet-600 text-white` (matching `layout.tsx` pattern)
    - "Payments Received" link navigates to `/payments-received` via `<Link>` (external, not inline)
    - No-active-company guard: render centered prompt "Please select a company to view reports"
    - Uses `useActiveCompany` hook to get `companyId`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 5.1_

- [x] 6. Build shared `ReportContent` controls
  - Add `ReportContent` component inside `reports.tsx` with:
    - `DateRangePicker` using `Popover` + `Calendar` (same pattern as `payments-received.tsx`), defaulting to current month
    - Quick-select buttons: "This Month", "Last Month", "This Quarter", "All Time"
    - `SearchInput` (`Input` with `Search` icon) for client-side filtering
    - `StatBar` showing total amount and record count, computed from filtered data
    - `ExportButton` (disabled when filtered list is empty) that calls `downloadCsv`
    - Loading skeleton (`Loader2` spinner) and error state with retry button
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 9.1, 9.2_

- [x] 7. Implement Sales report sub-components
  - Create `client/src/components/reports/sales-reports.tsx` with four components:
    - `SalesReport` — list of daily totals, detail shows contributing invoices; endpoint `reports/sales-summary`
    - `SalesByCustomerReport` — list of customers with totals, detail shows customer invoices; endpoint `reports/sales-by-customer`
    - `SalesByItemReport` — list of products with qty + revenue, detail shows line items; endpoint `reports/sales-by-item`
    - `SalesBySalespersonReport` — list of users with totals, detail shows their invoices; endpoint `reports/sales-by-salesperson`
  - Each component: `useQuery` fetch, `selectedRow` state, list panel + detail panel, applies `filterRecords` from report-utils
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 8. Implement Receivables report sub-components
  - Create `client/src/components/reports/receivables-reports.tsx` with nine components:
    - `ArAgingSummaryReport` — customers in aging buckets (current/31-60/61-90/90+), detail shows outstanding invoices; endpoint `reports/ar-aging-summary`
    - `ArAgingDetailsReport` — individual invoices with days overdue + bucket badge; endpoint `reports/ar-aging-details`
    - `InvoiceDetailsReport` — invoice list with status/total/balance, detail shows line items + payment history; endpoint `reports/invoice-details`
    - `QuoteDetailsReport` — quotation list, detail shows line items + expiry; endpoint `reports/quote-details`
    - `CustomerBalanceSummaryReport` — per-customer invoiced/paid/balance, detail shows invoices + payments; endpoint `reports/customer-balance-summary`
    - `ReceivableSummaryReport` — single aggregate row (no detail panel needed); endpoint `reports/receivable-summary`
    - `ReceivableDetailsReport` — invoice list with payment status + balance; endpoint `reports/receivable-details`
    - `BadDebtsReport` — invoices overdue 90+ days with balance > 0; endpoint `reports/bad-debts`
    - `BankChargesReport` — BANK_TRANSFER payments with reference + amount; endpoint `reports/bank-charges`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_

- [x] 9. Implement Payments Received report sub-components
  - Create `client/src/components/reports/payments-reports.tsx` with three inline components (Payments Received is external link):
    - `TimeToGetPaidReport` — invoices with issue date, payment date, days-to-payment; detail shows invoice + payments; endpoint `reports/time-to-get-paid`
    - `RefundHistoryReport` — credit note invoices with related original invoice; detail shows credit note details; endpoint `reports/refund-history`
    - `WithholdingTaxReport` — invoices with withheld amount; endpoint `reports/withholding-tax`
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10. Implement Purchases & Expenses report sub-components
  - Create `client/src/components/reports/expenses-reports.tsx` with five components:
    - `ExpenseDetailsReport` — full expense list with date/category/description/amount, detail shows supplier + payment method + reference + notes; endpoint `reports/expense-details`
    - `ExpensesByCategoryReport` — categories with total + percentage, detail shows individual expenses in category; endpoint `reports/expenses-by-category`
    - `ExpensesByCustomerReport` — expenses grouped by supplier; endpoint `reports/expenses-by-customer`
    - `ExpensesByProjectReport` — expenses grouped by `notes` as project tag; endpoint `reports/expenses-by-project`
    - `BillableExpenseDetailsReport` — expenses with status = 'pending'; endpoint `reports/billable-expense-details`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 11. Implement Tax Summary report sub-component
  - Create `client/src/components/reports/tax-reports.tsx` with:
    - `TaxSummaryReport` — list of tax types with taxable amount / output tax / input tax / net VAT, detail shows contributing invoices + expenses; endpoint `reports/tax-summary`
    - Net VAT payable displayed in the `StatBar` (output tax minus input tax across all rows)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Wire all report sub-components into `ReportContent` and add routing
  - In `reports.tsx`, import all report sub-components and render the active one based on `activeReport` key
  - Add route `/reports-module` to the app router (check `client/src/App.tsx` or equivalent router file)
  - Add "Reports Module" nav entry to the Reports group in `client/src/components/layout.tsx` linking to `/reports-module`
  - _Requirements: 1.5, 1.6, 1.10_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use `fast-check` (`fc`) with `numRuns: 100`
- All monetary display values use `.toFixed(2)`; backend returns them as strings
- The "Payments Received" sidebar link is an external navigation to `/payments-received`, not an inline report
- Checkpoints ensure incremental validation before moving to the next phase
