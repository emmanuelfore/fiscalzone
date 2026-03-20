Sections
1. General ledger
2. Accounts receivable
3. Accounts payable
4. Payments and cash
5. Inventory management
6. Fixed assets
7. Tax and compliance
8. Banking and reconciliation
9. Financial reports
10. Dashboard and analytics
11. Mobile money
12. Security and users
13. System and configuration
14. Background jobs
15. Multi-tenancy and data isolation
01
General ledger
Core double-entry bookkeeping engine. Every financial movement in the system posts to the GL, maintaining a fully balanced ledger at all times.
Hierarchical account structure with unlimited parent–child nesting
Account types: Asset, Liability, Equity, Revenue, Expense
Account sub-types mapped to IFRS balance sheet classifications
Normal balance (Debit/Credit) enforced per account type
Cash flow category tagging (Operating, Investing, Financing)
Control account flag — prevents direct posting when set
Default VAT category per account
Default cost centre and segment per account
Multi-currency account support (USD and ZWL)
Budget-enabled flag per account
Deactivate accounts — only allowed when balance is zero
Industry-specific COA templates for self-onboarding
Bulk import from CSV
Full double-entry validation — debits must equal credits before posting
Partitioned by year for high-volume performance
Status lifecycle: Draft → PendingApproval → Posted → Reversed
Approval workflow with configurable amount thresholds
Reversal creates a new negated transaction — original is immutable
Cannot post to a Closed or Locked period
Per-line VAT category and VAT amount
Per-line withholding tax amount
Per-line cost centre and segment tagging
Multi-currency with exchange rate per transaction
ZIMRA fiscal signature stored per transaction
Source document linking (invoice ID, PO ID, etc.)
Optimistic concurrency — row version checked on save
Journal types: General, Adjusting, Closing, Reversing, Reclassification, InterCompany
Auto-reversing journals — reversal created automatically on next period open
Reclassification journals require Finance Director approval regardless of amount
Journal templates — save frequently used entries for reuse
Approval workflow with configurable thresholds
Same posting rules as transactions (balance, period open, double-entry)
Reversal tracking — original and reversal are linked
Status lifecycle: Open → Closed → Locked (Locked is terminal)
Close requires balanced trial balance and no unposted transactions
Closing auto-posts depreciation for all active assets
Closing generates P&L closing entries to Retained Earnings
Closing triggers all auto-reversing journal processing
Reopen requires Finance Director role and written justification
Year-end close carries forward all Balance Sheet balances
Support for period 13 (adjustment period)
Hierarchical cost centre structure with unlimited levels
Cost centre assigned per transaction line
Segment types: Business line, Geography, Product, Customer
Segment reporting per IFRS 8 requirements
Cost centre analysis report
Segment analysis report
02
Accounts receivable
Full customer billing lifecycle from invoice creation through payment collection, including ZIMRA-compliant fiscalisation and dunning management.
Full customer master with TIN, VAT number, business registration number
TIN validation status tracking
Credit limit with configurable warning on invoice post
Payment terms (days) per customer
Dunning level (0–4) tracked per customer
Dunning hold flag — suspends automated reminders
Related party flag with relationship type (IAS 24)
Running balance maintained on every transaction
Customer statement report
Bulk import from CSV
Status lifecycle: Draft → Posted → PartiallyPaid → Paid / Cancelled / Disputed
VAT calculated per line using rate effective at invoice date
VAT breakdown: Standard Rate (15.5%), Zero Rated, Exempt, Out of Scope
Line-level discount percentage and amount
Inventory item linkage per line — auto-updates warehouse stock on post
ZIMRA EFD fiscalisation required before posting
Fiscal signature and receipt number stored and displayed
Balance due recalculated on every payment allocation
Dunning level resets to 0 on full payment
Cannot cancel if payments are allocated
Dispute workflow with manager resolution
Days overdue computed in real time
Related party flag per invoice (IAS 24 disclosure)
Printable invoice with company logo and template
Aging buckets: Current, 1–30, 31–60, 61–90, 90+ days
Aging report as of any date
Dunning levels escalated automatically by background job
Automated reminder emails at level escalation
Full dunning history log per customer per invoice
Dunning hold prevents automated escalation
03
Accounts payable
Supplier invoice management with three-way matching, purchase order workflow, and withholding tax certificate generation.
Full supplier master with TIN, VAT number, bank account details
Withholding tax type assigned per supplier
Related party flag and relationship type
Running balance maintained on every transaction
Supplier statement report
Bulk import from CSV
Status lifecycle: Draft → PendingApproval → Approved → PartiallyReceived → Received
Approval workflow — configurable flag per company
Quantity ordered vs quantity received tracked per line
Cannot cancel if GRNs already exist
VAT calculated per line
Delivery address per order
Goods receipt note (GRN) created against purchase order lines
GRN posts to inventory and GL on confirmation
Three-way match: PO quantity = GRN quantity = supplier invoice quantity
Match status: Pending, Matched, Disputed, Approved, Overridden
Approval required for disputed matches
04
Payments and cash management
Receipts, payments, cashbooks, and inter-account fund transfers across all payment methods including mobile money.
Customer receipts and supplier payments in a single module
Payment methods: Cash, Cheque, EFT, Card, EcoCash, OneMoney, InnBucks, RTGS, ZIPIT
Partial allocation across multiple invoices
Discount taken on allocation
Unallocated payments held and matched later
Cheque number and date recorded for cheque payments
Mobile money reference and network stored
Bank reference for EFT/RTGS
Posts to cashbook and GL on confirmation
Cashbook types: Bank account, Petty cash, Cash on hand
Multi-line cashbook entries with account splits
Receipt and payment transaction types
Cheque management including status tracking (issued, cleared, bounced)
Mobile money reference per transaction
Approval workflow for cashbook postings
Running balance maintained in real time
VAT per cashbook line
Transfer types: Internal, Inter-branch, Inter-company
Foreign exchange gain/loss calculated and posted on FX transfers
Approval workflow with configurable threshold
Mobile money and bank reference stored
Cannot transfer to the same account
05
Inventory management
Perpetual inventory with multiple costing methods, warehouse management, stock takes, and automatic reorder alerts.
Costing methods: FIFO, Weighted Average, Standard Cost
ABC classification (A/B/C) for cycle count frequency
HS code and country of origin for customs
Customs duty rate per item
VAT category per item
Expiry and serial number tracking flags
Reorder level and reorder quantity
Preferred supplier linkage
Inventory, COGS, variance, and sales account per item
Bulk import from CSV
Multiple warehouses per branch
Available quantity = on-hand minus reserved (generated column)
Perpetual inventory — every movement recorded with running quantity and value
Receive, issue, and transfer movements
GL posted on every stock movement
Reorder alert triggered when available quantity drops to reorder level
Inventory valuation report
Status lifecycle: Draft → InProgress → Completed → Approved → GL Posted
Count types: Full, Partial (category filter), Cycle count
Blind count mode — hides system quantity from counter
Only one stock take active per warehouse at a time
Recount workflow — supervisor can request second count before approval
Variance quantity, percentage, and value per line
Approval posts GL adjustment entries for all variances
ABC-based cycle counting schedules (A = high frequency)
06
Fixed assets
Complete asset lifecycle management compliant with IAS 16, IAS 36, and IAS 12 deferred tax requirements.
Status lifecycle: Active → FullyDepreciated / Disposed / Impaired / UnderMaintenance
Depreciation methods: Straight-line, Declining balance, Units of production
Separate tax useful life for IAS 12 deferred tax calculation
Accounting NBV and tax NBV maintained separately
Temporary difference = accounting NBV − tax NBV
Component accounting — child assets linked to parent
Insurance value, insurance expiry, warranty expiry, next service date
Serial number and location tracking
Fixed asset register report
Auto-depreciation posted on period close for all active assets
Depreciation schedule generated for full asset life
FullyDepreciated status set automatically when NBV ≤ residual value
IAS 36 impairment test — recoverable amount vs carrying amount
Impairment reversal allowed per IAS 36
IAS 16 revaluation model — revaluation surplus to equity
Disposal: gain/loss calculated and posted to GL
Capital gains tax assessed on disposal proceeds exceeding cost
07
Tax and ZIMRA compliance
All ZIMRA tax obligations in one module — VAT returns, withholding tax, provisional tax, income tax, deferred tax, and fiscalisation.
WHT types: Resident, Non-Resident, Contract Payments, Dividends, Interest, Royalties
Rate table with effective and end dates
WHT calculated automatically on supplier invoice post
WHT certificate generation with certificate number
Remittance reference tracking
WHT register report
Provisional tax — quarterly, ITF12B reference
Quarterly payable calculated from estimated annual income
Prior year losses deducted
Income tax return — annual, ITF12C reference
Tax reconciliation: accounting profit → taxable income
Non-deductible expenses, capital allowances adjustments
Provisional tax paid and WHT credits applied
IAS 12 deferred tax — temporary differences between accounting and tax bases
Deferred tax asset and liability classification
EFD (Electronic Fiscal Device) integration for sales transactions
Fiscalisation queue — transactions queued when EFD offline
Queue retried with exponential back-off when EFD reconnects
Fiscal signature and receipt number stored per invoice
Tax compliance calendar showing all upcoming due dates
IAS 37 provisions — opening balance, additions, reversals, utilisation, closing
Provision types: Doubtful debts, Warranty, Legal, Restructuring
IAS 37 contingent liabilities register — probability, estimated amount
Contingent liability converted to provision when probable
IFRS 15 revenue contracts with performance obligations
Revenue recognition: point in time or over time
Deferred and recognised revenue tracked per obligation
08
Banking and reconciliation
Multiple bank accounts per company with GL account linkage
Bank statement import (CSV format)
Open Banking API token storage for future direct feeds
Duplicate transaction detection on import
Statement line matching to cashbook transactions
Status lifecycle: InProgress → Completed → Approved
Auto-match by amount and date
Manual match for exceptions
Outstanding deposits and outstanding payments computed
Statement balance vs GL balance with variance display
Can complete with acknowledged variance
Approver can reopen completed reconciliation
Match rate percentage shown on reconciliation screen
09
Financial reports
Full set of IFRS-compliant financial statements and management reports, all generated from posted GL transactions.
Trial balance — as at any date, with comparative period
Balance sheet — with IFRS classification, comparative column
Income statement — with gross profit, operating profit, EBIT, PBT, PAT
Cash flow statement — indirect method, three sections
Statement of changes in equity
All statements filterable by branch, cost centre, segment
Consolidation support for group companies
Accounts receivable aging report
Accounts payable aging report
Inventory valuation report by warehouse
Fixed asset register with NBV and depreciation
Budget vs actual with variance amounts and percentages
Cost centre analysis
Segment analysis (IFRS 8)
Audit trail report — filterable by user, entity, date range
VAT return summary report
WHT register report
Export to PDF
Export to CSV/Excel
Scheduled reports — daily, weekly, monthly
Scheduled reports emailed to multiple recipients automatically
Custom report builder — saved query definitions
Document templates with company logo and branding
10
Dashboard and analytics
Total cash position in USD and ZWL
30-day cash forecast
Revenue, gross profit, net profit with vs-prior-period trend
Gross profit margin and net profit margin
Receivables aging summary with urgency colour coding
Payables aging summary
Top 10 customers by outstanding balance
Inventory metrics — low stock alerts count
Tax compliance alerts — upcoming and overdue returns
Pending approvals widget — hours waiting per item
Dashboard auto-refreshes every 5 minutes
11
Mobile money integration
Native support for Zimbabwe's three mobile money networks with webhook-based real-time payment confirmation and automatic reconciliation.
Webhook endpoints for all three networks
HMAC signature verification on every callback
Status lifecycle: Pending → Confirmed / Failed → Reconciled / Reversed
Automatic 5-minute timeout for unconfirmed transactions
Network reversal notification handled
Raw notification payload stored as JSONB for audit
Auto-reconciliation — matches by transaction reference to cashbook
Manual reconciliation screen for unmatched transactions
Confirmed payment auto-posts to cashbook
Transaction reference stored on payment record
12
Security and user management
JWT access tokens (60-minute expiry)
Refresh tokens (7-day expiry)
Bcrypt password hashing
Account lockout after 5 failed attempts (30-minute lock)
Password history — prevents reuse of last N passwords
Force password change on first login flag
Password expiry date
Session tracking with IP address and user agent
Session termination by admin
API key management with per-key rate limiting
22 modules × up to 8 actions = granular permission matrix
System roles seeded: SystemAdmin, FinanceDirector, AccountsManager, Accountant, Cashier, InventoryManager, Auditor, TaxOfficer, ReportViewer
Custom roles — clone from system role and modify
Per-company role assignment (user can have different role in each company)
Permissions checked in middleware before every route handler
Sidebar items and action buttons hidden if permission absent
Immutable append-only table — UPDATE and DELETE rules blocked
Cryptographic hash chain — each record hashes itself and previous record
Before and after values stored as JSONB
User, session, IP address, request ID per entry
6-year retention period enforced (ZIMRA requirement)
All POST, PUT, DELETE requests logged by middleware
Audit trail report with filters
13
System and configuration
Multi-company with shared database and PostgreSQL RLS isolation
Group company structure with parent–child linking
Fiscal year start month configurable per company
Base currency (USD or ZWL) per company
Industry type selection with pre-built COA templates
Branches per company
Company logo and branding for documents
VAT rate table with effective dates — system defaults and company overrides
WHT rate table by type with effective dates
Exchange rates USD/ZWL with effective dates
Number series per document type with prefix, suffix, padding
Configuration parameters (key–value) with effective dates
Document templates (invoice, PO, receipt) with branding
HS code tariff table for customs duty lookup
14
Background jobs (automated)
All jobs run via node-cron. No manual trigger required for routine operations.
Depreciation — daily at 01:00, posts to all active assets
Dunning escalation — hourly, checks all overdue invoices
Fiscalisation queue — every 5 minutes, retries failed EFD submissions
Mobile money auto-reconciliation — every 5 minutes
Reorder level alerts — daily at midnight
VAT return reminder emails — 24th of each month at 08:00
Currency revaluation (ZWL accounts) — daily at 02:00
Database backup — daily at 03:00 using pg_dump
Scheduled report generation and email delivery
Auto-reversing journal processing — triggered on period close
All jobs log errors without crashing — next run proceeds regardless of previous failure.
15
Multi-tenancy and data isolation
Shared database, shared schema — every tenant table has company_id
PostgreSQL Row-Level Security (RLS) enforced at database level
Session variable SET LOCAL on every request via tenant middleware
Super-admin bypass flag for system operations
Single backup and restore covers all tenants
System-wide tables exempt from RLS: users, roles, permissions, COA templates, VAT rates
User can access multiple companies with different roles in each
Company selector in UI — JWT reissued with new company_id on switch