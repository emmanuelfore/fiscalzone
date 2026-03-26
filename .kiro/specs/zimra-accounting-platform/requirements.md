# Requirements Document

## Introduction

This document defines the requirements for the ZIMRA-compliant Accounting SaaS Platform ("the Platform"), a comprehensive multi-tenant cloud accounting system designed for Zimbabwean businesses. The Platform covers the full financial management lifecycle including general ledger, accounts receivable, accounts payable, payments, inventory, fixed assets, tax compliance, banking reconciliation, financial reporting, dashboards, mobile money integration, security, system configuration, background automation, and multi-tenancy. All modules comply with IFRS, ZIMRA regulations, and Zimbabwean tax law.

---

## Glossary

- **Platform**: The ZIMRA-compliant Accounting SaaS system described in this document.
- **GL**: General Ledger — the core double-entry bookkeeping engine.
- **COA**: Chart of Accounts — the hierarchical account structure.
- **ZIMRA**: Zimbabwe Revenue Authority — the tax authority whose regulations the Platform must satisfy.
- **EFD**: Electronic Fiscal Device — ZIMRA hardware/API used to fiscalise sales invoices.
- **Fiscal_Signature**: The cryptographic receipt number returned by the EFD after successful fiscalisation.
- **WHT**: Withholding Tax — tax deducted at source on supplier payments.
- **VAT**: Value Added Tax — currently 15.5% standard rate in Zimbabwe.
- **TIN**: Tax Identification Number — ZIMRA-issued identifier for taxpayers.
- **NBV**: Net Book Value — asset cost minus accumulated depreciation.
- **GRN**: Goods Receipt Note — document confirming receipt of goods against a purchase order.
- **RLS**: Row-Level Security — PostgreSQL feature enforcing tenant data isolation.
- **JWT**: JSON Web Token — stateless authentication token.
- **HMAC**: Hash-based Message Authentication Code — used to verify webhook authenticity.
- **DTA**: Deferred Tax Asset — IAS 12 asset arising from deductible temporary differences.
- **DTL**: Deferred Tax Liability — IAS 12 liability arising from taxable temporary differences.
- **IFRS**: International Financial Reporting Standards.
- **IAS**: International Accounting Standard (subset of IFRS).
- **PBT**: Profit Before Tax.
- **PAT**: Profit After Tax.
- **EBIT**: Earnings Before Interest and Tax.
- **ZWL**: Zimbabwe Gold / Zimbabwe Dollar — local currency.
- **USD**: United States Dollar — hard currency used alongside ZWL.
- **Tenant**: A company registered on the Platform.
- **Tenant_Middleware**: The request-scoped middleware that sets the PostgreSQL session variable for RLS.
- **Audit_Log**: The immutable, hash-chained table recording all data mutations.
- **Period**: An accounting period (typically one calendar month) within a fiscal year.
- **Period_13**: An optional adjustment period used for year-end entries.
- **Journal**: A set of balanced debit/credit lines posted to the GL.
- **Dunning**: The process of escalating reminders to customers with overdue invoices.
- **ABC_Classification**: Inventory classification (A/B/C) by value/frequency for cycle counting.
- **HS_Code**: Harmonised System code used for customs tariff classification.
- **FIFO**: First-In First-Out inventory costing method.
- **Cashbook**: A record of cash and bank transactions for a specific account.
- **Reconciliation**: The process of matching bank statement lines to cashbook entries.
- **Background_Job_Runner**: The node-cron scheduler executing all automated jobs.
- **Finance_Director**: The system role with authority to approve high-value and sensitive transactions.
- **SystemAdmin**: The system role with full platform administration rights.

---

## Integration Context

### What Already Exists

The Platform is being evolved from a production ZIMRA-compliant invoicing SaaS (branch: **gauro**) into a full accounting system. The following modules are already built and operational:

**Database (shared/schema.ts):** users, companies (multi-tenant with full ZIMRA EFD fields), companyUsers, customers, taxTypes, taxCategories, taxRateHistory, products, productCategories, invoices (full ZIMRA fiscal fields: fiscalCode, fiscalSignature, qrCodeData, syncedWithFdms, fdmsStatus, receiptCounter, receiptGlobalNo, fiscalDayNo), invoiceItems, validationErrors, currencies, payments, quotations, quotationItems, recurringInvoices, auditLogs, zimraLogs, subscriptions, posShifts, posHolds, posShiftTransactions, suppliers, inventoryTransactions (FIFO tracking with remainingQuantity, batchNumber, expiryDate), expenses.

**Server modules:** server/auth.ts (Passport.js), server/zimra.ts (ZimraDevice class, full EFD integration), server/lib/fiscalization.ts (fiscalisation queue), server/lib/inventory.ts, server/lib/pos.ts, server/lib/seeding.ts, server/jobs.ts (recurring invoice worker, hourly), server/email.ts (Resend), server/audit.ts, server/storage.ts (DatabaseStorage with full CRUD and reporting methods).

**Client pages:** dashboard, invoices, create-invoice, invoice-details, customers, customer-details, customer-statements, products, services, quotations, create-quotation, recurring-invoices, payments-received, suppliers, expenses, inventory-transactions, inventory-reports, inventory-account, financial-reports, reports, tax-reports, tax-config, currency-settings, settings, zimra-settings, zimra-logs, audit-logs, pos, pos-reports, pos-login, cashiers, daily-sales-ledger, recent-sales, my-sales, subscription, team-settings, user-profile, onboarding.

**Background jobs:** Recurring invoice generation (hourly via setInterval in server/jobs.ts).

### Integration Strategy

1. **Branch:** All new development occurs on branch `gauro`.
2. **Non-breaking:** Existing invoicing, POS, ZIMRA fiscalisation, and reporting functionality must remain fully operational throughout the evolution.
3. **Additive schema:** New accounting modules extend existing tables with new columns or add new tables — they do not replace or restructure existing tables.
4. **GL backbone:** The new General Ledger engine becomes the financial backbone. Existing invoice/payment/expense flows will post into the GL via new posting hooks added to existing routes.
5. **Migration:** A migration script will link existing invoices, payments, and expenses to GL entries retroactively, preserving historical data integrity.
6. **Status tags:** Each requirement below is tagged [EXISTING], [PARTIAL], or [NEW] to indicate implementation status.

---

## Requirements

### Requirement 0: Integration Strategy and Branch Conventions [EXISTING/PARTIAL]

**User Story:** As a platform architect, I want clear integration conventions enforced across all development, so that the evolution from invoicing SaaS to full accounting system does not break existing functionality.

#### Acceptance Criteria

1. THE Platform SHALL maintain all existing invoicing, POS, ZIMRA fiscalisation, quotation, recurring invoice, and reporting functionality without regression on branch `gauro`. **[EXISTING]**
2. THE Platform SHALL add all new accounting modules as additive schema changes — new tables or new nullable columns on existing tables — without dropping or renaming existing columns. **[NEW]**
3. WHEN the GL engine is introduced, THE Platform SHALL add posting hooks to existing invoice creation, payment recording, and expense creation routes so that every new transaction also generates a balanced GL entry. **[NEW]**
4. THE Platform SHALL provide a one-time migration script that creates GL entries for all existing invoices, payments, and expenses, linking each record to its corresponding GL transaction via a glTransactionId foreign key. **[NEW]**
5. THE Platform SHALL preserve the existing company_id multi-tenancy pattern on all new tables, ensuring every new table carries a company_id column consistent with the existing schema. **[EXISTING — pattern; NEW — enforcement on new tables]**

---

### Requirement 1: Chart of Accounts [NEW]

**User Story:** As an accountant, I want a hierarchical chart of accounts with IFRS-compliant classifications, so that I can organise financial data according to international standards and ZIMRA requirements.

#### Acceptance Criteria

1. THE Platform SHALL support unlimited parent-child nesting of accounts within the COA. **[NEW]**
2. THE Platform SHALL enforce account types of exactly: Asset, Liability, Equity, Revenue, or Expense for every account. **[NEW]**
3. THE Platform SHALL map each account to an IFRS balance sheet sub-type classification. **[NEW]**
4. THE Platform SHALL enforce the normal balance (Debit or Credit) corresponding to each account type. **[NEW]**
5. THE Platform SHALL tag each account with a cash flow category of Operating, Investing, or Financing. **[NEW]**
6. WHEN an account has the control account flag set, THE Platform SHALL prevent direct journal posting to that account. **[NEW]**
7. THE Platform SHALL allow a default VAT category, default cost centre, and default segment to be assigned per account. **[NEW]**
8. THE Platform SHALL support multi-currency accounts denominated in USD or ZWL. **[NEW]**
9. THE Platform SHALL allow a budget-enabled flag to be set per account. **[NEW]**
10. WHEN a user attempts to deactivate an account whose balance is non-zero, THE Platform SHALL reject the deactivation and return a descriptive error. **[NEW]**
11. THE Platform SHALL provide industry-specific COA templates selectable during company onboarding. **[NEW]**
12. THE Platform SHALL accept bulk account import from a CSV file and report per-row validation errors. **[NEW]**

### Requirement 2: GL Transactions and Double-Entry Validation [NEW]

**User Story:** As an accountant, I want every financial movement to post through a validated double-entry engine, so that the ledger remains balanced at all times.

#### Acceptance Criteria

1. WHEN a transaction is submitted for posting, THE GL SHALL verify that the sum of all debit amounts equals the sum of all credit amounts before accepting the transaction. **[NEW]**
2. IF the debit total does not equal the credit total, THEN THE GL SHALL reject the transaction and return a descriptive validation error. **[NEW]**
3. THE Platform SHALL partition GL transaction records by fiscal year for query performance. **[NEW]**
4. THE Platform SHALL enforce the transaction status lifecycle: Draft → PendingApproval → Posted → Reversed. **[NEW]**
5. WHEN a transaction amount exceeds the configured approval threshold, THE Platform SHALL require approval from an authorised approver before the status advances to Posted. **[NEW]**
6. WHEN a posted transaction is reversed, THE Platform SHALL create a new negating transaction and mark the original transaction as Reversed without modifying the original record. **[NEW]**
7. WHEN a user attempts to post a transaction to a Closed or Locked period, THE Platform SHALL reject the posting and return a descriptive error. **[NEW]**
8. THE Platform SHALL store a per-line VAT category, VAT amount, withholding tax amount, cost centre, and segment on every transaction line. **[NEW]**
9. THE Platform SHALL store the exchange rate and functional-currency equivalent on every transaction line that is denominated in a non-base currency. **[NEW — GL line; EXISTING — exchangeRate on invoices/payments]**
10. THE Platform SHALL store the ZIMRA Fiscal_Signature on every transaction that originates from a fiscalised invoice. **[NEW — GL link; EXISTING — fiscalSignature on invoices]**
11. THE Platform SHALL link each transaction to its source document (invoice ID, purchase order ID, or payment ID). **[NEW]**
12. THE Platform SHALL use optimistic concurrency control, rejecting saves where the stored row version does not match the submitted row version. **[NEW]**

### Requirement 3: Journal Management [NEW]

**User Story:** As an accountant, I want to create and manage journals of multiple types with approval workflows, so that all adjusting, closing, and reclassification entries are properly controlled.

#### Acceptance Criteria

1. THE Platform SHALL support journal types: General, Adjusting, Closing, Reversing, Reclassification, and InterCompany. **[NEW]**
2. WHEN an auto-reversing journal is created, THE Platform SHALL automatically generate the reversing entry on the first day of the next period when that period is opened. **[NEW]**
3. WHEN a Reclassification journal is submitted for approval, THE Platform SHALL require Finance_Director approval regardless of the transaction amount. **[NEW]**
4. THE Platform SHALL allow journal templates to be saved and reused for frequently recurring entries. **[NEW]**
5. THE Platform SHALL apply the same double-entry balance, period-open, and approval rules to journals as to individual transactions. **[NEW]**
6. THE Platform SHALL link each reversal journal to its originating journal so that both records reference each other. **[NEW]**

### Requirement 4: Period Management [NEW]

**User Story:** As a finance director, I want controlled period open/close/lock lifecycle management, so that the integrity of posted figures is preserved and year-end processes are automated.

#### Acceptance Criteria

1. THE Platform SHALL enforce the period status lifecycle: Open → Closed → Locked, where Locked is a terminal state. **[NEW]**
2. WHEN a period close is requested, THE Platform SHALL verify that the trial balance is balanced and no unposted transactions exist before closing the period. **[NEW]**
3. WHEN a period is closed, THE Platform SHALL automatically post depreciation for all active fixed assets. **[NEW]**
4. WHEN a period is closed, THE Platform SHALL automatically generate P&L closing entries transferring net income to Retained Earnings. **[NEW]**
5. WHEN a period is closed, THE Platform SHALL trigger processing of all auto-reversing journals scheduled for the next period. **[NEW]**
6. WHEN a user requests to reopen a Closed period, THE Platform SHALL require Finance_Director role and a written justification before reopening. **[NEW]**
7. WHEN the final period of a fiscal year is closed, THE Platform SHALL carry forward all Balance Sheet account balances as opening balances for the new fiscal year. **[NEW]**
8. THE Platform SHALL support a Period_13 adjustment period per fiscal year for year-end audit adjustments. **[NEW]**

### Requirement 5: Cost Centres and Segments [NEW]

**User Story:** As a finance manager, I want hierarchical cost centres and multi-dimensional segment tagging, so that I can produce IFRS 8 segment reports and cost centre analyses.

#### Acceptance Criteria

1. THE Platform SHALL support unlimited levels of parent-child nesting for cost centres. **[NEW]**
2. THE Platform SHALL allow a cost centre to be assigned to any transaction line. **[NEW]**
3. THE Platform SHALL support segment types: Business Line, Geography, Product, and Customer. **[NEW]**
4. THE Platform SHALL produce a cost centre analysis report filterable by period and cost centre. **[NEW]**
5. THE Platform SHALL produce a segment analysis report compliant with IFRS 8 disclosure requirements. **[NEW]**

---

### Requirement 6: Customer Master [PARTIAL]

**User Story:** As an accounts receivable clerk, I want a complete customer master with ZIMRA TIN validation and credit controls, so that billing is accurate and compliant.

#### Acceptance Criteria

1. THE Platform SHALL store TIN, VAT number, and business registration number per customer. **[EXISTING — tin, vatNumber, bpNumber columns exist on customers table]**
2. WHEN a customer TIN is entered, THE Platform SHALL record the TIN validation status. **[EXISTING — TIN format validation exists in insertCustomerSchema]**
3. WHEN an invoice is posted and the customer's outstanding balance would exceed the configured credit limit, THE Platform SHALL display a configurable warning to the user. **[NEW — creditLimit column and enforcement logic do not exist]**
4. THE Platform SHALL store payment terms in days per customer. **[NEW — paymentTermsDays column does not exist on customers; defaultPaymentTerms exists on companies only]**
5. THE Platform SHALL track a dunning level (0–4) per customer. **[NEW — dunningLevel column does not exist]**
6. WHEN a customer has the dunning hold flag set, THE Platform SHALL suppress all automated dunning escalations for that customer. **[NEW — dunningHold flag does not exist]**
7. THE Platform SHALL flag customers as related parties with a relationship type per IAS 24. **[NEW — isRelatedParty and relationshipType columns do not exist]**
8. THE Platform SHALL maintain a running balance per customer, updated on every transaction. **[PARTIAL — customer statements are computed on demand via getStatementData; no stored running balance column]**
9. THE Platform SHALL generate a customer statement report as at any requested date. **[EXISTING — getStatementData and customer-statements page exist]**
10. THE Platform SHALL accept bulk customer import from a CSV file and report per-row validation errors. **[EXISTING — CSV import route exists in server/routes.ts]**

### Requirement 7: Sales Invoices and ZIMRA Fiscalisation [PARTIAL]

**User Story:** As an accountant, I want a fully fiscalised invoice lifecycle with VAT breakdown and inventory linkage, so that every sale is ZIMRA-compliant and stock is updated automatically.

#### Acceptance Criteria

1. THE Platform SHALL enforce the invoice status lifecycle: Draft → Posted → PartiallyPaid → Paid, with alternative terminal states Cancelled and Disputed. **[PARTIAL — draft/issued/paid/cancelled exist; PartiallyPaid and Disputed statuses are missing]**
2. THE Platform SHALL calculate VAT per invoice line using the VAT rate effective on the invoice date. **[EXISTING — taxRate per invoiceItem, taxTypes with effectiveFrom/To exist]**
3. THE Platform SHALL classify each invoice line's VAT as one of: Standard Rate (15.5%), Zero Rated, Exempt, or Out of Scope. **[EXISTING — taxCategories with zimraCategoryCode and taxTypes with zimraCode cover this]**
4. THE Platform SHALL apply a line-level discount percentage and compute the discount amount per line. **[EXISTING — discountAmount on invoiceItems exists]**
5. WHEN an invoice line references an inventory item, THE Platform SHALL decrement warehouse stock for that item on invoice posting. **[EXISTING — server/lib/inventory.ts handles stock decrements; single warehouse only]**
6. WHEN an invoice is ready to post, THE Platform SHALL submit it to the EFD for fiscalisation and SHALL NOT advance the status to Posted until a Fiscal_Signature is received. **[EXISTING — server/zimra.ts and server/lib/fiscalization.ts implement this]**
7. THE Platform SHALL store the Fiscal_Signature and EFD receipt number on the invoice record and display both on the printed invoice. **[EXISTING — fiscalSignature, receiptGlobalNo, receiptCounter columns exist]**
8. WHEN a payment is allocated to an invoice, THE Platform SHALL recalculate the balance due on that invoice. **[EXISTING — payment allocation and balance calculation exist]**
9. WHEN a full payment is allocated to an invoice, THE Platform SHALL reset the customer's dunning level to 0. **[NEW — dunning level does not yet exist; reset logic not implemented]**
10. WHEN a user attempts to cancel an invoice that has allocated payments, THE Platform SHALL reject the cancellation and return a descriptive error. **[EXISTING — cancellation guard exists in routes]**
11. THE Platform SHALL support a dispute workflow allowing a manager to resolve disputed invoices. **[NEW — Disputed status and dispute workflow do not exist]**
12. THE Platform SHALL compute days overdue in real time based on the invoice due date and the current date. **[EXISTING — daysOverdue computed in AR aging reports]**
13. THE Platform SHALL flag invoices involving related parties per IAS 24. **[NEW — related party flag does not exist on invoices]**
14. THE Platform SHALL produce a printable invoice incorporating the company logo and selected document template. **[EXISTING — invoice templates (modern, etc.) and logo rendering exist]**

### Requirement 8: AR Aging and Dunning [PARTIAL]

**User Story:** As a credit controller, I want automated dunning escalation and aging reports, so that overdue receivables are followed up systematically.

#### Acceptance Criteria

1. THE Platform SHALL classify each outstanding invoice into aging buckets: Current, 1–30 days, 31–60 days, 61–90 days, and 90+ days. **[EXISTING — getReportArAgingSummary and getReportArAgingDetails implement this]**
2. THE Platform SHALL produce an AR aging report as at any requested date. **[EXISTING — AR aging report page and storage methods exist]**
3. WHEN the Background_Job_Runner executes the dunning escalation job, THE Platform SHALL advance the dunning level of each customer whose invoices meet the escalation criteria, unless the customer has the dunning hold flag set. **[NEW — dunning job does not exist; dunningLevel and dunningHold columns do not exist]**
4. WHEN a customer's dunning level is escalated, THE Platform SHALL send an automated reminder email to the customer. **[NEW — dunning email logic does not exist; server/email.ts infrastructure exists]**
5. THE Platform SHALL maintain a full dunning history log per customer per invoice. **[NEW — dunning history table does not exist]**

---

### Requirement 9: Supplier Master [PARTIAL]

**User Story:** As an accounts payable clerk, I want a complete supplier master with WHT type and bank details, so that payments and withholding tax are processed correctly.

#### Acceptance Criteria

1. THE Platform SHALL store TIN, VAT number, and bank account details per supplier. **[PARTIAL — tin and vatNumber exist on suppliers; bank account details columns do not exist]**
2. THE Platform SHALL assign a WHT type to each supplier. **[NEW — whtType column does not exist on suppliers]**
3. THE Platform SHALL flag suppliers as related parties with a relationship type. **[NEW — isRelatedParty column does not exist on suppliers]**
4. THE Platform SHALL maintain a running balance per supplier, updated on every transaction. **[NEW — no running balance or supplier statement logic exists]**
5. THE Platform SHALL generate a supplier statement report as at any requested date. **[NEW — supplier statement report does not exist]**
6. THE Platform SHALL accept bulk supplier import from a CSV file and report per-row validation errors. **[EXISTING — supplier CSV import route exists]**

### Requirement 10: Purchase Orders and Three-Way Match [NEW]

**User Story:** As a procurement officer, I want purchase orders with GRN-based three-way matching, so that supplier invoices are only approved when goods are confirmed received at the ordered quantity.

#### Acceptance Criteria

1. THE Platform SHALL enforce the purchase order status lifecycle: Draft → PendingApproval → Approved → PartiallyReceived → Received. **[NEW]**
2. WHEN a purchase order is submitted, THE Platform SHALL route it through the configured approval workflow before advancing to Approved. **[NEW]**
3. THE Platform SHALL track quantity ordered and quantity received per purchase order line. **[NEW]**
4. WHEN a user attempts to cancel a purchase order that has existing GRNs, THE Platform SHALL reject the cancellation and return a descriptive error. **[NEW]**
5. THE Platform SHALL calculate VAT per purchase order line. **[NEW]**
6. WHEN a GRN is confirmed against a purchase order, THE Platform SHALL post the received quantities to inventory and generate the corresponding GL entries. **[NEW]**
7. THE Platform SHALL perform a three-way match comparing PO quantity, GRN quantity, and supplier invoice quantity per line. **[NEW]**
8. THE Platform SHALL record a match status per line as one of: Pending, Matched, Disputed, Approved, or Overridden. **[NEW]**
9. WHEN a three-way match status is Disputed, THE Platform SHALL require approval before the supplier invoice can be posted. **[NEW]**

### Requirement 11: Payments, Receipts, and Cashbook [PARTIAL]

**User Story:** As a cashier, I want to record customer receipts and supplier payments across all payment methods with partial allocation, so that outstanding balances are accurately maintained.

#### Acceptance Criteria

1. THE Platform SHALL support payment methods: Cash, Cheque, EFT, Card, EcoCash, OneMoney, InnBucks, RTGS, and ZIPIT. **[EXISTING — paymentMethod on payments and splitPayments JSONB on invoices cover these methods]**
2. THE Platform SHALL allow a single payment to be partially allocated across multiple invoices. **[NEW — current payments table has a single invoiceId FK; multi-invoice allocation does not exist]**
3. THE Platform SHALL allow a discount to be recorded at the time of payment allocation. **[NEW — discount at allocation time does not exist]**
4. THE Platform SHALL hold unallocated payment amounts for later matching. **[NEW — unallocated payment holding does not exist]**
5. THE Platform SHALL store cheque number and cheque date for cheque payments. **[PARTIAL — reference column exists on payments; dedicated chequeNumber and chequeDate columns do not]**
6. THE Platform SHALL store mobile money reference and network name for mobile money payments. **[PARTIAL — reference column exists; dedicated mobileMoneyReference and networkName columns do not]**
7. WHEN a payment is confirmed, THE Platform SHALL post the entry to the Cashbook and the GL simultaneously. **[NEW — Cashbook module and GL do not exist; payment recording exists]**
8. THE Platform SHALL support Cashbook types: Bank account, Petty cash, and Cash on hand. **[NEW — Cashbook module does not exist]**
9. THE Platform SHALL support multi-line Cashbook entries with account splits. **[NEW]**
10. THE Platform SHALL track cheque status as one of: Issued, Cleared, or Bounced. **[NEW — cheque status tracking does not exist]**
11. THE Platform SHALL require approval for Cashbook postings when the configured approval threshold is exceeded. **[NEW]**
12. THE Platform SHALL maintain a running balance per Cashbook, updated in real time on every posting. **[NEW]**
13. THE Platform SHALL record VAT per Cashbook line. **[NEW]**

### Requirement 12: Fund Transfers [NEW]

**User Story:** As a finance manager, I want to transfer funds between accounts with FX gain/loss calculation, so that inter-account movements are accurately recorded in the GL.

#### Acceptance Criteria

1. THE Platform SHALL support transfer types: Internal, Inter-branch, and Inter-company. **[NEW]**
2. WHEN a fund transfer involves accounts in different currencies, THE Platform SHALL calculate and post the foreign exchange gain or loss to the GL. **[NEW]**
3. THE Platform SHALL require approval for fund transfers that exceed the configured threshold. **[NEW]**
4. THE Platform SHALL store the mobile money or bank reference on each transfer record. **[NEW]**
5. WHEN a user attempts to transfer funds from an account to the same account, THE Platform SHALL reject the transfer and return a descriptive error. **[NEW]**

---

### Requirement 13: Inventory Items [PARTIAL]

**User Story:** As an inventory manager, I want a detailed item master with costing method, customs data, and GL account linkage, so that stock movements are valued correctly and posted automatically.

#### Acceptance Criteria

1. THE Platform SHALL support costing methods per item: FIFO, Weighted Average, and Standard Cost. **[PARTIAL — inventoryValuationMethod (FIFO/LIFO/WAC) exists at company level; per-item costing method does not exist]**
2. THE Platform SHALL assign an ABC classification (A, B, or C) to each item. **[NEW — abcClassification column does not exist on products]**
3. THE Platform SHALL store HS code and country of origin per item for customs purposes. **[PARTIAL — hsCode exists on products; countryOfOrigin column does not exist]**
4. THE Platform SHALL store a customs duty rate per item. **[NEW — customsDutyRate column does not exist]**
5. THE Platform SHALL assign a VAT category per item. **[EXISTING — taxCategoryId and taxTypeId exist on products]**
6. THE Platform SHALL support expiry date tracking and serial number tracking as optional flags per item. **[PARTIAL — expiryDate exists on inventoryTransactions; per-item tracking flags do not exist on products]**
7. THE Platform SHALL store reorder level and reorder quantity per item. **[PARTIAL — lowStockThreshold exists; dedicated reorderQuantity column does not exist]**
8. THE Platform SHALL link a preferred supplier to each item. **[NEW — preferredSupplierId column does not exist on products]**
9. THE Platform SHALL store separate GL accounts for inventory, COGS, variance, and sales per item. **[NEW — GL account linkage does not exist; GL module does not exist yet]**
10. THE Platform SHALL accept bulk item import from a CSV file and report per-row validation errors. **[EXISTING — product CSV import route exists]**

### Requirement 14: Warehouse and Perpetual Inventory [PARTIAL]

**User Story:** As an inventory manager, I want perpetual inventory tracking across multiple warehouses with automatic GL posting, so that stock quantities and values are always current.

#### Acceptance Criteria

1. THE Platform SHALL support multiple warehouses per company branch. **[NEW — single implicit warehouse exists; warehouses table does not exist]**
2. THE Platform SHALL compute available quantity as on-hand quantity minus reserved quantity as a database-generated column. **[NEW — reservedQuantity does not exist; stockLevel exists on products]**
3. THE Platform SHALL record every stock movement (receive, issue, transfer) with a running quantity and running value per warehouse per item. **[PARTIAL — inventoryTransactions with remainingQuantity exist for FIFO; running value per warehouse does not exist]**
4. WHEN a stock movement is confirmed, THE Platform SHALL post the corresponding GL entries automatically. **[NEW — GL does not exist; inventory movements are recorded without GL posting]**
5. WHEN an item's available quantity falls to or below its reorder level, THE Platform SHALL generate a reorder alert. **[PARTIAL — getLowStockItems exists in storage; automated alert/notification does not exist]**
6. THE Platform SHALL produce an inventory valuation report by warehouse. **[PARTIAL — getReportStockOnHand exists but is not warehouse-segmented]**

### Requirement 15: Stock Takes [NEW]

**User Story:** As a warehouse supervisor, I want a controlled stock take lifecycle with variance approval and GL posting, so that physical counts are reconciled to system quantities with full audit trail.

#### Acceptance Criteria

1. THE Platform SHALL enforce the stock take status lifecycle: Draft → InProgress → Completed → Approved → GL Posted. **[NEW]**
2. THE Platform SHALL support count types: Full, Partial (filtered by category), and Cycle count. **[NEW]**
3. WHEN blind count mode is enabled for a stock take, THE Platform SHALL hide the system quantity from the counter during the count. **[NEW]**
4. WHEN a user attempts to create a new stock take for a warehouse that already has an active stock take, THE Platform SHALL reject the creation and return a descriptive error. **[NEW]**
5. THE Platform SHALL allow a supervisor to request a recount before approving a stock take line. **[NEW]**
6. THE Platform SHALL calculate variance quantity, variance percentage, and variance value per stock take line. **[NEW]**
7. WHEN a stock take is approved, THE Platform SHALL post GL adjustment entries for all lines with a non-zero variance. **[NEW]**
8. THE Platform SHALL schedule cycle counts based on ABC classification, with A-class items counted at higher frequency than B or C-class items. **[NEW]**

### Requirement 16: Fixed Asset Register [NEW]

**User Story:** As an accountant, I want a complete fixed asset register with IAS 16, IAS 36, and IAS 12 compliance, so that depreciation, impairment, and deferred tax are calculated and posted correctly.

#### Acceptance Criteria

1. THE Platform SHALL enforce the asset status lifecycle: Active → FullyDepreciated, Disposed, Impaired, or UnderMaintenance. **[NEW]**
2. THE Platform SHALL support depreciation methods: Straight-line, Declining balance, and Units of production. **[NEW]**
3. THE Platform SHALL store a separate tax useful life per asset for IAS 12 deferred tax calculation. **[NEW]**
4. THE Platform SHALL maintain accounting NBV and tax NBV as separate values per asset. **[NEW]**
5. THE Platform SHALL compute the temporary difference as accounting NBV minus tax NBV per asset. **[NEW]**
6. THE Platform SHALL support component accounting by linking child assets to a parent asset. **[NEW]**
7. THE Platform SHALL store insurance value, insurance expiry date, warranty expiry date, and next service date per asset. **[NEW]**
8. THE Platform SHALL store serial number and physical location per asset. **[NEW]**
9. THE Platform SHALL produce a fixed asset register report showing NBV and accumulated depreciation per asset. **[NEW]**

### Requirement 17: Depreciation and Asset Events [NEW]

**User Story:** As an accountant, I want automatic depreciation posting and IAS 16/36 event handling, so that asset values are always current and compliant.

#### Acceptance Criteria

1. WHEN a period is closed, THE Platform SHALL automatically post depreciation for all assets with Active status. **[NEW]**
2. THE Platform SHALL generate a depreciation schedule projecting charges over the full remaining useful life of each asset. **[NEW]**
3. WHEN an asset's accounting NBV falls to or below its residual value, THE Platform SHALL automatically set the asset status to FullyDepreciated. **[NEW]**
4. WHEN an IAS 36 impairment test is performed and the recoverable amount is less than the carrying amount, THE Platform SHALL post an impairment loss to the GL. **[NEW]**
5. WHEN an impairment reversal is processed, THE Platform SHALL post the reversal per IAS 36 rules, not exceeding the original impairment amount. **[NEW]**
6. WHEN an IAS 16 revaluation is processed, THE Platform SHALL post the revaluation surplus to the equity revaluation reserve account. **[NEW]**
7. WHEN an asset is disposed, THE Platform SHALL calculate the gain or loss as disposal proceeds minus accounting NBV and post the result to the GL. **[NEW]**
8. WHEN an asset disposal proceeds exceed the original cost, THE Platform SHALL assess capital gains tax on the excess amount. **[NEW]**

---

### Requirement 18: Withholding Tax [PARTIAL]

**User Story:** As a tax officer, I want automatic WHT calculation on supplier invoices with certificate generation and remittance tracking, so that ZIMRA WHT obligations are met accurately.

#### Acceptance Criteria

1. THE Platform SHALL support WHT types: Resident, Non-Resident, Contract Payments, Dividends, Interest, and Royalties. **[NEW — WHT type table does not exist; whtType on suppliers does not exist]**
2. THE Platform SHALL maintain a WHT rate table with effective start dates and end dates per WHT type. **[NEW — taxRateHistory exists for VAT; dedicated WHT rate table does not exist]**
3. WHEN a supplier invoice is posted, THE Platform SHALL automatically calculate WHT using the rate effective on the invoice date for the supplier's assigned WHT type. **[NEW — supplier invoice posting and WHT calculation do not exist]**
4. THE Platform SHALL generate a WHT certificate with a unique certificate number for each WHT deduction. **[NEW]**
5. THE Platform SHALL track the remittance reference for each WHT payment made to ZIMRA. **[NEW]**
6. THE Platform SHALL produce a WHT register report. **[PARTIAL — getReportWithholdingTax exists in storage but operates on sales invoices, not supplier WHT deductions]**

### Requirement 19: Provisional and Income Tax [NEW]

**User Story:** As a tax officer, I want provisional tax tracking and income tax reconciliation, so that quarterly and annual ZIMRA tax obligations are computed and filed correctly.

#### Acceptance Criteria

1. THE Platform SHALL track quarterly provisional tax payable with ITF12B reference numbers. **[NEW]**
2. THE Platform SHALL calculate quarterly provisional tax from estimated annual taxable income, deducting prior-year losses. **[NEW]**
3. THE Platform SHALL support an annual income tax return with ITF12C reference number. **[NEW]**
4. THE Platform SHALL produce a tax reconciliation report tracing accounting profit to taxable income, including non-deductible expenses and capital allowance adjustments. **[NEW]**
5. THE Platform SHALL apply provisional tax paid and WHT credits against the income tax liability in the reconciliation. **[NEW]**
6. THE Platform SHALL compute IAS 12 deferred tax from temporary differences between accounting and tax bases. **[NEW]**
7. THE Platform SHALL classify each deferred tax balance as a DTA or DTL. **[NEW]**

### Requirement 20: EFD Fiscalisation Queue [EXISTING]

**User Story:** As a system administrator, I want a resilient fiscalisation queue with retry logic, so that every invoice is fiscalised even when the EFD is temporarily offline.

#### Acceptance Criteria

1. WHEN an EFD submission fails, THE Platform SHALL add the invoice to the fiscalisation queue. **[EXISTING — server/lib/fiscalization.ts implements queue logic]**
2. WHEN the Background_Job_Runner executes the fiscalisation retry job, THE Platform SHALL retry queued submissions using exponential back-off between attempts. **[EXISTING — fiscalization.ts implements retry with back-off; currently triggered via setInterval, not node-cron]**
3. WHEN a queued invoice is successfully fiscalised, THE Platform SHALL store the Fiscal_Signature and remove the invoice from the retry queue. **[EXISTING — fiscalizeInvoice in storage.ts stores Fiscal_Signature]**
4. THE Platform SHALL store the Fiscal_Signature and EFD receipt number on every fiscalised invoice. **[EXISTING — fiscalSignature, receiptGlobalNo, receiptCounter columns exist on invoices]**

### Requirement 21: Tax Compliance Calendar and Provisions [NEW]

**User Story:** As a tax officer, I want a compliance calendar, IAS 37 provisions register, and IFRS 15 revenue tracking, so that all tax and reporting obligations are visible and managed.

#### Acceptance Criteria

1. THE Platform SHALL display a tax compliance calendar showing all upcoming and overdue ZIMRA return due dates. **[NEW]**
2. THE Platform SHALL maintain IAS 37 provisions with opening balance, additions, reversals, utilisation, and closing balance per provision. **[NEW]**
3. THE Platform SHALL support provision types: Doubtful Debts, Warranty, Legal, and Restructuring. **[NEW]**
4. THE Platform SHALL maintain a contingent liabilities register with probability classification and estimated amount per item. **[NEW]**
5. WHEN a contingent liability is reclassified as probable, THE Platform SHALL convert it to an IAS 37 provision. **[NEW]**
6. THE Platform SHALL track IFRS 15 revenue contracts with individual performance obligations. **[NEW]**
7. THE Platform SHALL classify revenue recognition per obligation as either point-in-time or over-time. **[NEW]**
8. THE Platform SHALL track deferred revenue and recognised revenue balances per performance obligation. **[NEW]**

### Requirement 22: Bank Accounts and Statement Import [NEW]

**User Story:** As an accountant, I want to import bank statements and detect duplicates, so that reconciliation starts with clean, complete data.

#### Acceptance Criteria

1. THE Platform SHALL support multiple bank accounts per company, each linked to a GL account. **[NEW — no bank account module exists; bankName/accountNumber exist on companies as single fields only]**
2. THE Platform SHALL import bank statements from CSV files. **[NEW — CSV import infrastructure exists in routes but no bank statement import route exists]**
3. THE Platform SHALL store Open Banking API tokens per bank account for future direct feed integration. **[NEW]**
4. WHEN a bank statement is imported, THE Platform SHALL detect and flag duplicate transactions based on amount, date, and reference. **[NEW]**

### Requirement 23: Bank Reconciliation [NEW]

**User Story:** As an accountant, I want to match bank statement lines to cashbook entries with auto-matching and a clear variance display, so that reconciliation is efficient and auditable.

#### Acceptance Criteria

1. THE Platform SHALL enforce the reconciliation status lifecycle: InProgress → Completed → Approved. **[NEW]**
2. WHEN the auto-match process runs, THE Platform SHALL match statement lines to Cashbook transactions by amount and date. **[NEW]**
3. THE Platform SHALL allow manual matching of statement lines to Cashbook transactions for exceptions. **[NEW]**
4. THE Platform SHALL compute outstanding deposits and outstanding payments as unmatched items. **[NEW]**
5. THE Platform SHALL display the variance between the statement closing balance and the GL balance. **[NEW]**
6. THE Platform SHALL allow a reconciliation to be completed with an acknowledged variance. **[NEW]**
7. WHEN an approver reopens a Completed reconciliation, THE Platform SHALL revert its status to InProgress. **[NEW]**
8. THE Platform SHALL display the match rate percentage on the reconciliation screen. **[NEW]**

---

### Requirement 24: IFRS Financial Statements [PARTIAL]

**User Story:** As a finance director, I want IFRS-compliant financial statements generated from posted GL data, so that I can produce auditable reports for stakeholders and regulators.

#### Acceptance Criteria

1. THE Platform SHALL produce a trial balance report as at any date with a comparative prior-period column. **[NEW — trial balance requires GL; getFinancialSummary exists but is not a GL-based trial balance]**
2. THE Platform SHALL produce a balance sheet with IFRS classification and a comparative column. **[NEW — requires GL backbone]**
3. THE Platform SHALL produce an income statement showing gross profit, operating profit, EBIT, PBT, and PAT. **[PARTIAL — getFinancialSummary and financial-reports page exist; EBIT/PBT/PAT breakdown requires GL]**
4. THE Platform SHALL produce a cash flow statement using the indirect method with Operating, Investing, and Financing sections. **[NEW — requires GL with cash flow category tags on accounts]**
5. THE Platform SHALL produce a statement of changes in equity. **[NEW — requires GL equity accounts]**
6. THE Platform SHALL allow all financial statements to be filtered by branch, cost centre, and segment. **[NEW — branch/cost centre/segment do not exist yet]**
7. THE Platform SHALL support consolidation of financial statements across group companies. **[NEW — group company structure does not exist]**

### Requirement 25: Management and Operational Reports [PARTIAL]

**User Story:** As a finance manager, I want a full suite of management reports exportable in multiple formats, so that operational decisions are supported by accurate data.

#### Acceptance Criteria

1. THE Platform SHALL produce AR and AP aging reports. **[PARTIAL — AR aging exists (getReportArAgingSummary/Details); AP aging does not exist]**
2. THE Platform SHALL produce an inventory valuation report by warehouse. **[PARTIAL — getReportStockOnHand exists; warehouse segmentation does not exist]**
3. THE Platform SHALL produce a fixed asset register report with NBV and depreciation. **[NEW — fixed assets module does not exist]**
4. THE Platform SHALL produce a budget vs actual report with variance amounts and percentages. **[NEW — budget module does not exist]**
5. THE Platform SHALL produce cost centre and segment analysis reports. **[NEW — cost centres and segments do not exist]**
6. THE Platform SHALL produce an audit trail report filterable by user, entity type, and date range. **[EXISTING — audit-logs page and getAuditLogs exist]**
7. THE Platform SHALL produce a VAT return summary report. **[EXISTING — getReportTaxSummary and tax-reports page exist]**
8. THE Platform SHALL produce a WHT register report. **[PARTIAL — getReportWithholdingTax exists for sales-side WHT; supplier WHT register does not exist]**
9. THE Platform SHALL export any report to PDF, CSV, and Excel formats. **[PARTIAL — some reports export to CSV/Excel via XLSX library; PDF export is not universal]**
10. THE Platform SHALL support scheduled report generation on daily, weekly, and monthly frequencies with automatic email delivery to configured recipients. **[NEW — scheduled report job does not exist; email infrastructure exists]**
11. THE Platform SHALL provide a custom report builder allowing users to save query definitions as named reports. **[NEW]**
12. THE Platform SHALL apply company logo and branding to all document templates. **[EXISTING — logoUrl on companies, invoiceTemplate settings exist]**

### Requirement 26: Dashboard and Analytics [PARTIAL]

**User Story:** As a company director, I want a real-time dashboard with key financial metrics and compliance alerts, so that I can monitor the business at a glance.

#### Acceptance Criteria

1. THE Platform SHALL display total cash position in both USD and ZWL on the dashboard. **[PARTIAL — dashboard exists; cash position across Cashbook accounts requires Cashbook module]**
2. THE Platform SHALL display a 30-day cash forecast on the dashboard. **[NEW — cash forecast does not exist]**
3. THE Platform SHALL display revenue, gross profit, and net profit with a vs-prior-period trend indicator. **[PARTIAL — revenue metrics exist on dashboard; gross/net profit trend requires GL]**
4. THE Platform SHALL display gross profit margin and net profit margin percentages. **[PARTIAL — getOperationalMetrics returns profitMargin; net profit margin requires GL]**
5. THE Platform SHALL display a receivables aging summary with urgency colour coding per bucket. **[EXISTING — getReceivablesAging exists and is displayed on dashboard]**
6. THE Platform SHALL display a payables aging summary. **[NEW — AP aging does not exist]**
7. THE Platform SHALL display the top 10 customers by outstanding balance. **[EXISTING — customer balance data available via getReportCustomerBalanceSummary]**
8. THE Platform SHALL display a low stock alert count for inventory items at or below reorder level. **[EXISTING — getLowStockItems exists]**
9. THE Platform SHALL display tax compliance alerts for upcoming and overdue ZIMRA returns. **[NEW — tax compliance calendar does not exist]**
10. THE Platform SHALL display a pending approvals widget showing the number of items pending and hours waiting per item. **[NEW — approval workflow does not exist]**
11. THE Platform SHALL automatically refresh all dashboard data every 5 minutes. **[NEW — auto-refresh polling does not exist on the dashboard page]**

---

### Requirement 27: Mobile Money Webhook Integration [NEW]

**User Story:** As a cashier, I want real-time mobile money payment confirmations via webhooks, so that EcoCash, OneMoney, and InnBucks payments are posted to the cashbook automatically.

#### Acceptance Criteria

1. THE Platform SHALL expose webhook endpoints for EcoCash, OneMoney, and InnBucks payment notifications. **[NEW — payment methods exist in schema; webhook endpoints do not exist]**
2. WHEN a webhook callback is received, THE Platform SHALL verify the HMAC signature before processing the payload. **[NEW]**
3. IF the HMAC signature verification fails, THEN THE Platform SHALL reject the callback with an HTTP 401 response and log the attempt. **[NEW]**
4. THE Platform SHALL enforce the mobile money transaction status lifecycle: Pending → Confirmed or Failed → Reconciled or Reversed. **[NEW]**
5. WHEN a Pending mobile money transaction has not been confirmed within 5 minutes, THE Platform SHALL automatically set its status to Failed. **[NEW]**
6. WHEN a network reversal notification is received, THE Platform SHALL update the transaction status to Reversed and reverse any posted cashbook entry. **[NEW]**
7. THE Platform SHALL store the raw webhook payload as JSONB on every mobile money transaction record. **[NEW]**
8. WHEN a mobile money transaction is Confirmed, THE Platform SHALL automatically post the payment to the Cashbook. **[NEW — Cashbook module does not exist]**
9. THE Platform SHALL store the transaction reference on the payment record for reconciliation matching. **[PARTIAL — reference column exists on payments; dedicated mobile money transaction table does not exist]**

### Requirement 28: Mobile Money Reconciliation [NEW]

**User Story:** As an accountant, I want automatic and manual mobile money reconciliation, so that all mobile money transactions are matched to cashbook entries.

#### Acceptance Criteria

1. WHEN the Background_Job_Runner executes the mobile money auto-reconciliation job, THE Platform SHALL match Confirmed transactions to Cashbook entries by transaction reference. **[NEW]**
2. THE Platform SHALL provide a manual reconciliation screen for transactions that could not be auto-matched. **[NEW]**

---

### Requirement 29: Authentication and Session Security [PARTIAL]

**User Story:** As a system administrator, I want secure JWT-based authentication with account lockout and session management, so that unauthorised access is prevented.

#### Acceptance Criteria

1. THE Platform SHALL issue JWT access tokens with a 60-minute expiry. **[NEW — current auth uses Passport.js session-based auth, not JWT]**
2. THE Platform SHALL issue refresh tokens with a 7-day expiry. **[NEW — refresh token mechanism does not exist]**
3. THE Platform SHALL hash all passwords using bcrypt before storage. **[EXISTING — bcrypt hashing is implemented in server/auth.ts]**
4. WHEN a user fails authentication 5 consecutive times, THE Platform SHALL lock the account for 30 minutes. **[NEW — account lockout does not exist]**
5. THE Platform SHALL prevent a user from reusing any of their last N passwords, where N is a configurable system parameter. **[NEW — password history does not exist]**
6. THE Platform SHALL force a password change on the user's first login. **[PARTIAL — passwordChanged column exists on users; force-change enforcement on first login does not exist]**
7. THE Platform SHALL store a password expiry date per user and prompt the user to change their password before expiry. **[NEW — passwordExpiresAt column does not exist]**
8. THE Platform SHALL record the IP address and user agent for every active session. **[PARTIAL — ipAddress is stored on auditLogs; dedicated session tracking table does not exist]**
9. THE Platform SHALL allow a SystemAdmin to terminate any active session. **[NEW — session termination does not exist]**
10. THE Platform SHALL support API key management with a configurable rate limit per key. **[PARTIAL — apiKey exists on companies for device auth; per-key rate limiting does not exist]**

### Requirement 30: Role-Based Access Control [PARTIAL]

**User Story:** As a system administrator, I want a granular permission matrix with system and custom roles, so that each user has access only to the modules and actions their role permits.

#### Acceptance Criteria

1. THE Platform SHALL enforce a permission matrix of 22 modules by up to 8 actions per module. **[NEW — current roles are owner/admin/member only; no granular permission matrix exists]**
2. THE Platform SHALL seed the following system roles: SystemAdmin, FinanceDirector, AccountsManager, Accountant, Cashier, InventoryManager, Auditor, TaxOfficer, and ReportViewer. **[NEW — only owner/admin/member roles exist]**
3. THE Platform SHALL allow custom roles to be created by cloning a system role and modifying its permissions. **[NEW]**
4. THE Platform SHALL support per-company role assignment, allowing a user to hold different roles in different companies. **[PARTIAL — companyUsers join table with role exists; role is a single text field (owner/admin/member), not linked to a permissions table]**
5. WHEN a request reaches a route handler, THE Platform SHALL verify the requesting user's permissions in middleware before executing the handler. **[PARTIAL — requireAuth and requireOwner middleware exist; granular permission checks do not exist]**
6. THE Platform SHALL hide sidebar navigation items and action buttons from users who lack the required permission. **[NEW — client-side permission-based UI hiding does not exist]**

### Requirement 31: Immutable Audit Log [PARTIAL]

**User Story:** As an auditor, I want an immutable, hash-chained audit log retained for 6 years, so that all data changes are traceable and tamper-evident for ZIMRA compliance.

#### Acceptance Criteria

1. THE Audit_Log SHALL be an append-only table with UPDATE and DELETE operations blocked at the database level. **[PARTIAL — auditLogs table exists; database-level UPDATE/DELETE block (trigger or RLS) does not exist]**
2. THE Platform SHALL compute a cryptographic hash for each Audit_Log record that incorporates the hash of the previous record, forming a hash chain. **[NEW — hash chaining does not exist; lastFiscalHash exists on companies for fiscal chaining only]**
3. THE Platform SHALL store before and after values as JSONB on every Audit_Log record. **[PARTIAL — details JSONB exists on auditLogs; before/after split is not enforced]**
4. THE Platform SHALL store the user ID, session ID, IP address, and request ID on every Audit_Log record. **[PARTIAL — userId and ipAddress exist; sessionId and requestId columns do not exist]**
5. THE Platform SHALL retain Audit_Log records for a minimum of 6 years per ZIMRA retention requirements. **[NEW — no retention policy or archival job exists]**
6. THE Platform SHALL log every HTTP POST, PUT, and DELETE request via middleware before the handler executes. **[PARTIAL — logAction is called manually in some routes; universal middleware logging does not exist]**
7. THE Platform SHALL produce an audit trail report filterable by user, entity type, and date range. **[EXISTING — audit-logs page and getAuditLogs exist]**

### Requirement 32: System and Company Configuration [PARTIAL]

**User Story:** As a system administrator, I want comprehensive company and system configuration options, so that each tenant can be set up to match their business structure and ZIMRA requirements.

#### Acceptance Criteria

1. THE Platform SHALL support multiple companies sharing a single database with RLS-enforced data isolation. **[PARTIAL — company_id multi-tenancy exists on all tables; PostgreSQL RLS policies are not yet implemented]**
2. THE Platform SHALL support a group company structure with parent-child company linking. **[NEW — parentCompanyId column does not exist on companies]**
3. THE Platform SHALL allow the fiscal year start month to be configured per company. **[NEW — fiscalYearStartMonth column does not exist on companies]**
4. THE Platform SHALL allow the base currency (USD or ZWL) to be configured per company. **[EXISTING — currency column and isBase flag on currencies table exist]**
5. THE Platform SHALL allow an industry type to be selected per company, loading the corresponding COA template. **[NEW — industryType column and COA templates do not exist]**
6. THE Platform SHALL support multiple branches per company. **[PARTIAL — branchName exists on companies as a single text field; a branches table does not exist]**
7. THE Platform SHALL store company logo and branding assets used on all generated documents. **[EXISTING — logoUrl, primaryColor, invoiceTemplate exist on companies]**
8. THE Platform SHALL maintain a VAT rate table with effective dates, supporting both system defaults and company-level overrides. **[EXISTING — taxTypes with effectiveFrom/To and taxRateHistory exist]**
9. THE Platform SHALL maintain a WHT rate table by type with effective dates. **[NEW — WHT rate table does not exist]**
10. THE Platform SHALL maintain a USD/ZWL exchange rate table with effective dates. **[EXISTING — currencies table with exchangeRate and lastUpdated exists]**
11. THE Platform SHALL support configurable number series per document type with prefix, suffix, and zero-padding settings. **[NEW — number series configuration does not exist; getNextInvoiceNumber uses a hardcoded pattern]**
12. THE Platform SHALL support configuration parameters as key-value pairs with effective dates. **[NEW — no config parameters table exists]**
13. THE Platform SHALL support document templates (invoice, PO, receipt) with company branding. **[PARTIAL — invoiceTemplate exists for invoices; PO and receipt templates do not exist]**
14. THE Platform SHALL maintain an HS code tariff table for customs duty lookup. **[NEW — hsCode exists on products; a tariff lookup table does not exist]**

### Requirement 33: Background Jobs [PARTIAL]

**User Story:** As a system administrator, I want all routine operations automated via scheduled jobs, so that the platform operates without manual intervention for recurring tasks.

#### Acceptance Criteria

1. WHEN the Background_Job_Runner executes the depreciation job at 01:00 daily, THE Platform SHALL post depreciation for all active assets. **[NEW — depreciation job does not exist; fixed assets module does not exist]**
2. WHEN the Background_Job_Runner executes the dunning escalation job hourly, THE Platform SHALL check all overdue invoices and escalate dunning levels where criteria are met. **[NEW — dunning job does not exist]**
3. WHEN the Background_Job_Runner executes the fiscalisation retry job every 5 minutes, THE Platform SHALL retry all queued EFD submissions using exponential back-off. **[EXISTING — server/lib/fiscalization.ts implements retry; currently triggered via setInterval, migration to node-cron needed]**
4. WHEN the Background_Job_Runner executes the mobile money reconciliation job every 5 minutes, THE Platform SHALL attempt to auto-match unreconciled Confirmed transactions to Cashbook entries. **[NEW — mobile money module does not exist]**
5. WHEN the Background_Job_Runner executes the reorder alert job at midnight daily, THE Platform SHALL generate alerts for all items whose available quantity is at or below the reorder level. **[NEW — reorder alert job does not exist; getLowStockItems query exists]**
6. WHEN the Background_Job_Runner executes the VAT reminder job on the 24th of each month at 08:00, THE Platform SHALL send VAT return reminder emails to configured recipients. **[NEW — VAT reminder job does not exist; email infrastructure exists]**
7. WHEN the Background_Job_Runner executes the currency revaluation job at 02:00 daily, THE Platform SHALL revalue all ZWL-denominated account balances using the current exchange rate and post FX gain/loss entries. **[NEW — currency revaluation job does not exist]**
8. WHEN the Background_Job_Runner executes the database backup job at 03:00 daily, THE Platform SHALL run pg_dump to produce a full database backup. **[NEW — database backup job does not exist]**
9. WHEN the Background_Job_Runner executes the scheduled report job, THE Platform SHALL generate all due reports and email them to configured recipients. **[NEW — scheduled report job does not exist]**
10. WHEN a period is closed, THE Platform SHALL trigger the auto-reversing journal processing job to create reversals for the new period. **[NEW — period management and journal reversal do not exist]**
11. IF any background job encounters an error, THEN THE Background_Job_Runner SHALL log the error and proceed to the next scheduled run without crashing. **[PARTIAL — recurring invoice job has try/catch with console.error; centralised error handling and structured logging for all jobs do not exist]**

### Requirement 34: Multi-Tenancy and Data Isolation [PARTIAL]

**User Story:** As a platform operator, I want PostgreSQL RLS-enforced multi-tenancy with per-request tenant context, so that each company's data is completely isolated from other tenants.

#### Acceptance Criteria

1. THE Platform SHALL store a company_id column on every tenant-scoped table. **[EXISTING — company_id exists on all tenant-scoped tables]**
2. THE Platform SHALL enforce PostgreSQL RLS policies on all tenant-scoped tables so that queries return only rows matching the session's company_id. **[NEW — RLS policies are not yet created in the database]**
3. WHEN a request is received, THE Tenant_Middleware SHALL set the PostgreSQL session variable to the authenticated user's company_id before any query executes. **[NEW — SET LOCAL session variable middleware does not exist]**
4. THE Platform SHALL support a super-admin bypass flag that allows system operations to query across all tenants. **[PARTIAL — isSuperAdmin exists on users and is checked in getCompanies; RLS bypass role does not exist]**
5. THE Platform SHALL exempt the following tables from RLS: users, roles, permissions, COA templates, VAT rates. **[NEW — RLS does not exist yet; exemption list to be defined when RLS is implemented]**
6. THE Platform SHALL allow a single user to access multiple companies, each with a different role assignment. **[EXISTING — companyUsers join table supports this]**
7. WHEN a user switches company in the UI, THE Platform SHALL reissue a new JWT containing the selected company_id. **[NEW — JWT auth does not exist; company switching exists but uses session, not JWT reissue]**
8. THE Platform SHALL cover all tenants in a single pg_dump backup operation. **[NEW — backup job does not exist]**

### Requirement 35: EFD Parser and Fiscal Signature Round-Trip [EXISTING]

**User Story:** As a developer, I want the EFD integration to correctly parse and serialise fiscal device responses, so that fiscal signatures are stored accurately and can be verified.

#### Acceptance Criteria

1. WHEN a valid EFD response payload is received, THE Platform SHALL parse it into a structured FiscalResponse object. **[EXISTING — ZimraDevice class in server/zimra.ts parses EFD responses]**
2. WHEN an invalid EFD response payload is received, THE Platform SHALL return a descriptive parse error without crashing. **[EXISTING — ZimraApiError class and error handling exist in server/zimra.ts]**
3. THE Platform SHALL serialise FiscalResponse objects back into the EFD wire format for logging and audit purposes. **[EXISTING — zimraLogs stores requestPayload and responsePayload as JSONB]**
4. FOR ALL valid FiscalResponse objects, parsing then serialising then parsing SHALL produce an equivalent FiscalResponse object (round-trip property). **[EXISTING — round-trip integrity is maintained via JSONB storage and re-parsing in fiscalization.ts]**
