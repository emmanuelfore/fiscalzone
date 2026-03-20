# Requirements Document

## Introduction

The Reports Module is a comprehensive reporting section for the fiscalization/invoicing web app. It provides a two-panel layout (left navigation sidebar + right content area) covering five report categories: Sales, Receivables, Payments Received, Purchases & Expenses, and Taxes. Each report follows the same two-panel pattern used in the existing invoice-details page — a left list/navigation panel and a right detail/preview panel. The module integrates with existing data (invoices, payments, customers, products, expenses) via new and existing API endpoints, and reuses the existing Payments Received page at `/payments-received`.

---

## Glossary

- **Reports_Module**: The top-level React page at `/reports-module` that hosts the two-panel layout for all reports.
- **Report_Sidebar**: The left panel of the Reports_Module containing category groups and individual report links.
- **Report_Content**: The right panel of the Reports_Module that renders the active report's list and detail views.
- **Report_List**: The scrollable, filterable, searchable list of records shown in the left portion of a report view.
- **Report_Detail**: The right portion of a report view showing a breakdown or preview of the selected record or group.
- **Date_Range_Picker**: A UI control allowing the user to select a start and end date for filtering report data.
- **AR_Aging**: Accounts Receivable Aging — a report grouping outstanding invoice balances by how many days they are overdue.
- **Active_Company**: The company currently selected by the user, identified via the `useActiveCompany` hook.
- **API_Endpoint**: A server-side Express route that returns JSON data for a specific report.
- **Two_Panel_Layout**: A layout pattern with a fixed-width left panel (list/navigation) and a flexible right panel (detail/preview), matching the pattern in `invoice-details.tsx`.

---

## Requirements

### Requirement 1: Reports Module Shell and Navigation

**User Story:** As a user, I want a dedicated Reports section with a sidebar listing all report categories and reports, so that I can quickly navigate to any report without leaving the page.

#### Acceptance Criteria

1. THE Reports_Module SHALL render a two-panel layout with a fixed-width Report_Sidebar on the left and a Report_Content area on the right.
2. THE Report_Sidebar SHALL display five collapsible category groups: Sales, Receivables, Payments Received, Purchases & Expenses, and Taxes.
3. WHEN a category group is clicked, THE Report_Sidebar SHALL expand or collapse that group to show or hide its child report links.
4. THE Report_Sidebar SHALL highlight the currently active report link with a distinct visual indicator (e.g., filled background, accent color).
5. WHEN a report link is clicked, THE Report_Content SHALL update to display the selected report without a full page navigation.
6. THE Reports_Module SHALL be accessible at the route `/reports-module`.
7. THE Reports_Module SHALL use the `useActiveCompany` hook to scope all data to the Active_Company.
8. IF no Active_Company is set, THEN THE Reports_Module SHALL display a prompt instructing the user to select a company.
9. THE Report_Sidebar SHALL include the following reports under each category:
   - Sales: Sales, Sales by Customer, Sales by Item, Sales by Sales Person
   - Receivables: AR Aging Summary, AR Aging Details, Invoice Details, Quote Details, Bad Debts, Bank Charges, Customer Balance Summary, Receivable Summary, Receivable Details
   - Payments Received: Payments Received, Time to Get Paid, Refund History, Withholding Tax
   - Purchases & Expenses: Expense Details, Expenses by Category, Expenses by Customer, Expenses by Project, Billable Expense Details
   - Taxes: Tax Summary
10. THE Reports_Module SHALL add a "Reports" entry in the main navigation sidebar (layout.tsx) under the Reports group linking to `/reports-module`.

---

### Requirement 2: Shared Report Controls

**User Story:** As a user, I want consistent date range filtering and search controls across all reports, so that I can narrow down data without learning a new UI for each report.

#### Acceptance Criteria

1. THE Report_Content SHALL display a Date_Range_Picker at the top of every report, defaulting to the current calendar month.
2. WHEN the user selects a new date range, THE Report_Content SHALL re-fetch and re-render the report data for that range.
3. THE Report_Content SHALL provide quick-select buttons for "This Month", "Last Month", "This Quarter", and "All Time".
4. WHERE a report contains a list of records, THE Report_Content SHALL display a search input that filters the visible list client-side by relevant text fields (e.g., customer name, invoice number, description).
5. THE Report_Content SHALL display a summary stat bar above the list showing key aggregates (e.g., total amount, record count) that update when filters change.
6. WHEN data is loading, THE Report_Content SHALL display a loading skeleton or spinner in place of the list and detail panels.
7. IF an API request fails, THEN THE Report_Content SHALL display an error message with a retry button.

---

### Requirement 3: Sales Reports

**User Story:** As a business owner, I want to view sales data summarized overall, by customer, by item, and by sales person, so that I can understand revenue performance across different dimensions.

#### Acceptance Criteria

1. WHEN the "Sales" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/sales-summary` with `startDate` and `endDate` query parameters and display a list of daily or periodic sales totals.
2. WHEN a row in the Sales list is selected, THE Report_Detail SHALL display a breakdown of invoices contributing to that period's total.
3. WHEN the "Sales by Customer" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/sales-by-customer` and display a list of customers with their total sales amount.
4. WHEN a customer row is selected in "Sales by Customer", THE Report_Detail SHALL display all invoices for that customer within the date range.
5. WHEN the "Sales by Item" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/sales-by-item` and display a list of products/services with quantity sold and total revenue.
6. WHEN an item row is selected in "Sales by Item", THE Report_Detail SHALL display all invoice line items for that product within the date range.
7. WHEN the "Sales by Sales Person" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/sales-by-salesperson` and display a list of users with their total invoiced amount.
8. WHEN a sales person row is selected, THE Report_Detail SHALL display all invoices created by that user within the date range.

---

### Requirement 4: Receivables Reports

**User Story:** As an accounts receivable manager, I want to view aging summaries, invoice details, quote details, and customer balances, so that I can track outstanding amounts and follow up on overdue accounts.

#### Acceptance Criteria

1. WHEN the "AR Aging Summary" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/ar-aging-summary` and display customers grouped into aging buckets: Current (0–30 days), 31–60 days, 61–90 days, and 90+ days overdue.
2. WHEN a customer row is selected in "AR Aging Summary", THE Report_Detail SHALL display all outstanding invoices for that customer with their individual aging bucket and balance due.
3. WHEN the "AR Aging Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/ar-aging-details` and display individual invoices with their due date, days overdue, and balance due.
4. WHEN the "Invoice Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/invoice-details` and display a list of invoices with status, total, and balance due.
5. WHEN an invoice row is selected in "Invoice Details", THE Report_Detail SHALL display the full invoice breakdown including line items, tax, and payment history.
6. WHEN the "Quote Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/quote-details` and display a list of quotations with status and total.
7. WHEN a quote row is selected in "Quote Details", THE Report_Detail SHALL display the full quotation breakdown including line items and expiry date.
8. WHEN the "Customer Balance Summary" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/customer-balance-summary` and display each customer's total invoiced, total paid, and outstanding balance.
9. WHEN a customer row is selected in "Customer Balance Summary", THE Report_Detail SHALL display all invoices and payments for that customer within the date range.
10. WHEN the "Receivable Summary" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/receivable-summary` and display aggregate totals for total invoiced, total collected, and total outstanding.
11. WHEN the "Receivable Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/receivable-details` and display each invoice with its payment status and outstanding balance.
12. WHEN the "Bad Debts" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/bad-debts` and display invoices that are overdue by more than 90 days and have an outstanding balance greater than zero.
13. WHEN the "Bank Charges" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/bank-charges` and display payments where the payment method is "BANK_TRANSFER" with associated reference and amount.

---

### Requirement 5: Payments Received Reports

**User Story:** As a finance user, I want to view all payments received, time-to-payment metrics, refund history, and withholding tax records, so that I can reconcile cash flow and compliance obligations.

#### Acceptance Criteria

1. WHEN the "Payments Received" report link is clicked, THE Reports_Module SHALL navigate the user to the existing `/payments-received` page rather than rendering a new report inline.
2. WHEN the "Time to Get Paid" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/time-to-get-paid` and display each invoice with its issue date, payment date, and number of days to payment.
3. WHEN a row is selected in "Time to Get Paid", THE Report_Detail SHALL display the invoice details and all associated payments.
4. WHEN the "Refund History" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/refund-history` and display all credit note invoices (transactionType = 'CreditNote') with their amount and related original invoice.
5. WHEN a refund row is selected, THE Report_Detail SHALL display the credit note details and the original invoice it references.
6. WHEN the "Withholding Tax" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/withholding-tax` and display invoices where a withholding tax line item exists, showing the withheld amount.

---

### Requirement 6: Purchases and Expenses Reports

**User Story:** As a finance manager, I want to view expense details broken down by category, customer, and project, so that I can control costs and identify billable expenses.

#### Acceptance Criteria

1. WHEN the "Expense Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/expense-details` with date range parameters and display a list of all expenses with date, category, description, and amount.
2. WHEN an expense row is selected in "Expense Details", THE Report_Detail SHALL display the full expense record including supplier, payment method, reference, and notes.
3. WHEN the "Expenses by Category" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/expenses-by-category` and display each expense category with its total amount and percentage of total expenses.
4. WHEN a category row is selected in "Expenses by Category", THE Report_Detail SHALL display all individual expenses within that category for the selected date range.
5. WHEN the "Expenses by Customer" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/expenses-by-customer` and display expenses grouped by the supplier/customer they are associated with.
6. WHEN the "Expenses by Project" report is active, THE Report_Content SHALL display expenses grouped by the `notes` field used as a project tag, fetching from `GET /api/companies/:companyId/reports/expenses-by-project`.
7. WHEN the "Billable Expense Details" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/billable-expense-details` and display expenses that are marked as billable (status = 'pending' used as proxy until a billable flag exists).

---

### Requirement 7: Tax Reports

**User Story:** As a tax compliance officer, I want to view a tax summary showing VAT collected and reclaimable input tax, so that I can prepare accurate tax returns.

#### Acceptance Criteria

1. WHEN the "Tax Summary" report is active, THE Report_Content SHALL fetch data from `GET /api/companies/:companyId/reports/tax-summary` with date range parameters and display a list of tax types with total taxable amount, tax collected (output tax), and tax on expenses (input tax).
2. WHEN a tax type row is selected in "Tax Summary", THE Report_Detail SHALL display all invoices and expenses contributing to that tax type's totals within the date range.
3. THE Tax_Summary API_Endpoint SHALL aggregate output tax from invoice `taxAmount` grouped by tax type, and input tax from expenses grouped by category.
4. THE Report_Content SHALL display a net VAT payable figure (output tax minus input tax) in the summary stat bar for the Tax Summary report.

---

### Requirement 8: Backend API Endpoints

**User Story:** As a developer, I want well-defined API endpoints for each report, so that the frontend can fetch accurate, scoped data efficiently.

#### Acceptance Criteria

1. THE Server SHALL implement all report endpoints listed in Requirements 3–7 under the path pattern `GET /api/companies/:companyId/reports/:reportName`.
2. WHEN a request is received, THE Server SHALL validate that the requesting user has access to the specified companyId before returning data.
3. WHEN `startDate` and `endDate` query parameters are provided, THE Server SHALL filter results to records within that date range (inclusive).
4. IF `startDate` or `endDate` are missing, THEN THE Server SHALL default to the current calendar month.
5. THE Server SHALL return all monetary amounts as strings with two decimal places to preserve precision.
6. THE Server SHALL return responses within 3 seconds for datasets up to 10,000 records by using indexed queries on `companyId`, `issueDate`, and `expenseDate`.
7. IF the companyId does not match the authenticated user's companies, THEN THE Server SHALL return HTTP 403.

---

### Requirement 9: Export Functionality

**User Story:** As a user, I want to export any report to CSV or Excel, so that I can share data with stakeholders or import it into other tools.

#### Acceptance Criteria

1. THE Report_Content SHALL display an "Export" button for every report.
2. WHEN the Export button is clicked, THE Report_Content SHALL trigger a download of the current filtered report data as a CSV file.
3. THE exported CSV SHALL include all columns visible in the Report_List, using the same date range and search filters currently applied.
4. THE CSV filename SHALL follow the pattern `{report-name}-{startDate}-{endDate}.csv`.
