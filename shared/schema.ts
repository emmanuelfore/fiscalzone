
import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, primaryKey, uuid, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - Compatible with Supabase Auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), // Use UUID for Supabase Auth compatibility
  email: text("email").unique().notNull(),
  password: text("password"), // Optional - can use Supabase Auth instead
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  companyUsers: many(companyUsers),
}));

// Companies (Tenants)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tradingName: text("trading_name"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").default("Zimbabwe"),
  currency: text("currency").default("USD"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),

  // ZIMRA Compliance
  tin: text("tin").unique().notNull(),
  vatNumber: text("vat_number"),
  bpNumber: text("bp_number"),
  vatEnabled: boolean("vat_enabled").default(true),
  defaultPaymentTerms: text("default_payment_terms"),
  bankDetails: text("bank_details"),
  fdmsDeviceId: text("fdms_device_id"),
  fdmsDeviceSerialNo: text("fdms_device_serial_no"), // ZIMRA Field [21] - Device Serial Number
  fdmsApiKey: text("fdms_api_key"),
  zimraPrivateKey: text("zimra_private_key"),
  zimraCertificate: text("zimra_certificate"),
  zimraEnvironment: text("zimra_environment").default("test"), // 'test' or 'production'
  fiscalDayOpen: boolean("fiscal_day_open").default(false),
  currentFiscalDayNo: integer("current_fiscal_day_no").default(0),
  lastFiscalDayStatus: text("last_fiscal_day_status"),

  // Customization
  invoiceTemplate: text("invoice_template").default("modern"),
  primaryColor: text("primary_color").default("#4f46e5"),

  lastReceiptGlobalNo: integer("last_receipt_global_no").default(0),
  deviceReportingFrequency: integer("device_reporting_frequency").default(1440), // Default 24h/1440m just in case
  lastPing: timestamp("last_ping"),
  lastFiscalHash: text("last_fiscal_hash"), // To store previous receipt hash for chaining
  dailyReceiptCount: integer("daily_receipt_count").default(0), // To track RCPT011
  branchName: text("branch_name"), // ZIMRA Field [5] - Branch name (if different from company name)
  qrUrl: text("qr_url"), // ZIMRA Field [48] - URL for QR validation

  // Banking Details
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  branchCode: text("branch_code"),
  vatRegistered: boolean("vat_registered").default(true),
  emailSettings: jsonb("email_settings"),
  qrUrl: text("qr_url"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(companyUsers),
  customers: many(customers),
  products: many(products),
  invoices: many(invoices),
}));

// Join table for Users <-> Companies
export const companyUsers = pgTable("company_users", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  role: text("role").default("member"), // owner, admin, member
});

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  user: one(users, { fields: [companyUsers.userId], references: [users.id] }),
  company: one(companies, { fields: [companyUsers.companyId], references: [companies.id] }),
}));

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  address: text("address"),
  billingAddress: text("billing_address"),
  city: text("city"),
  country: text("country").default("Zimbabwe"),
  tin: text("tin"),
  vatNumber: text("vat_number"),
  bpNumber: text("bp_number"),
  customerType: text("customer_type").default("individual"), // individual, business
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, { fields: [customers.companyId], references: [companies.id] }),
  invoices: many(invoices),
}));

// Tax Types
export const taxTypes = pgTable("tax_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // VAT-STD, VAT-ZERO
  name: text("name").notNull(),
  description: text("description"),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  zimraCode: text("zimra_code"), // A, B, E, C
  zimraTaxId: text("zimra_tax_id"), // Optional ZIMRA ID e.g. "3"
  calculationMethod: text("calculation_method").default("INCLUSIVE"), // INCLUSIVE, EXCLUSIVE
});

// Tax Categories
export const taxCategories = pgTable("tax_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  defaultTaxTypeId: integer("default_tax_type_id").references(() => taxTypes.id),
  zimraCategoryCode: text("zimra_category_code"), // GOODS_STD, FOOD_BASIC
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({ id: true });
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;
export type TaxCategory = typeof taxCategories.$inferSelect;

export const insertTaxTypeSchema = createInsertSchema(taxTypes).omit({ id: true });
export type InsertTaxType = z.infer<typeof insertTaxTypeSchema>;
export type TaxType = typeof taxTypes.$inferSelect;

export const taxRateHistory = pgTable("tax_rate_history", {
  id: serial("id").primaryKey(),
  taxTypeId: integer("tax_type_id").references(() => taxTypes.id),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  reason: text("reason"),
  gazetteReference: text("gazette_reference"),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  barcode: text("barcode"),
  hsCode: text("hs_code").default("0000.00.00"),
  category: text("category"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("15.00"), // Default VAT

  // Inventory
  isTracked: boolean("is_tracked").default(false),
  stockLevel: decimal("stock_level", { precision: 10, scale: 2 }).default("0"),
  lowStockThreshold: decimal("low_stock_threshold", { precision: 10, scale: 2 }).default("10"),

  isActive: boolean("is_active").default(true),
  productType: text("product_type").default("good").notNull(), // 'good' or 'service'
  taxCategoryId: integer("tax_category_id").references(() => taxCategories.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
}));

// Validation Errors
export const validationErrors = pgTable("validation_errors", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  errorCode: text("error_code").notNull(), // RCPT010, RCPT011, etc.
  errorMessage: text("error_message").notNull(),
  errorColor: text("error_color").notNull(), // Grey, Yellow, Red
  requiresPreviousReceipt: boolean("requires_previous_receipt").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),

  invoiceNumber: text("invoice_number").notNull(),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date").notNull(),

  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),

  // Status
  status: text("status").default("draft"), // draft, issued, paid, cancelled
  taxInclusive: boolean("tax_inclusive").default(false),

  // Locking
  lockedBy: uuid("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),

  // ZIMRA Fiscal Fields
  fiscalCode: text("fiscal_code"),
  fiscalSignature: text("fiscal_signature"),
  qrCodeData: text("qr_code_data"),
  syncedWithFdms: boolean("synced_with_fdms").default(false),
  fdmsStatus: text("fdms_status").default("pending"), // pending, issued, failed
  submissionId: text("submission_id"),
  fiscalDayNo: integer("fiscal_day_no"), // To track which fiscal day this invoice belongs to
  receiptCounter: integer("receipt_counter"), // ZIMRA Field [17] - Daily receipt counter
  receiptGlobalNo: integer("receipt_global_no"), // ZIMRA Field [18] - Global receipt number

  // Validation Status
  validationStatus: text("validation_status"), // valid, invalid, grey, null
  lastValidationAttempt: timestamp("last_validation_attempt"),

  currency: text("currency").default("USD"),
  paymentMethod: text("payment_method").default("CASH"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.000000"),

  transactionType: text("transaction_type").default("FiscalInvoice"), // FiscalInvoice, CreditNote, DebitNote
  relatedInvoiceId: integer("related_invoice_id"), // Self-reference for CN/DN

  notes: text("notes"),
  invoiceTemplate: text("invoice_template").default("modern"),

  createdAt: timestamp("created_at").defaultNow(),
});



// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));

export const validationErrorsRelations = relations(validationErrors, ({ one }) => ({
  invoice: one(invoices, { fields: [validationErrors.invoiceId], references: [invoices.id] }),
}));

// Currencies
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  code: text("code").notNull(), // USD, ZWG, ZAR
  name: text("name").notNull(), // US Dollar, Zimbabwe Gold
  symbol: text("symbol").notNull(), // $, ZiG, R
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).notNull().default("1.000000"),
  isBase: boolean("is_base").default(false),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const currenciesRelations = relations(currencies, ({ one }) => ({
  company: one(companies, { fields: [currencies.companyId], references: [companies.id] }),
}));

// SCHEMAS

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true }).extend({
  sku: z.string().min(1, "Code/SKU is required")
});
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  invoiceNumber: z.string().optional(),
  fiscalDayNo: z.number().int().optional(),
  fiscalCode: z.string().optional(),
  fiscalSignature: z.string().optional(),
  qrCodeData: z.string().optional(),
  syncedWithFdms: z.boolean().optional(),
  fdmsStatus: z.string().optional(),
  submissionId: z.string().optional(),
  receiptCounter: z.number().int().optional(),
  receiptGlobalNo: z.number().int().optional(),
  validationStatus: z.string().optional(),
  lastValidationAttempt: z.date().optional(),
});
// When creating an invoice, the invoiceId foreign key is added after the invoice record is created.
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, invoiceId: true });

// TYPES
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;


export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

// API TYPES
export type CreateInvoiceRequest = InsertInvoice & {
  items: InsertInvoiceItem[];
};

export const insertCurrencySchema = createInsertSchema(currencies).omit({ id: true, lastUpdated: true });
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currencies.$inferSelect;


// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.000000"),

  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method").notNull(), // Cash, Card, Transfer, Ecocash
  reference: text("reference"), // Check No, Transaction ID

  notes: text("notes"),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  company: one(companies, { fields: [payments.companyId], references: [companies.id] }),
  user: one(users, { fields: [payments.createdBy], references: [users.id] }),
}));

// Also update Invoice relations to include payments
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
  payments: many(payments),
  validationErrors: many(validationErrors),
}));


export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const insertValidationErrorSchema = createInsertSchema(validationErrors).omit({ id: true, createdAt: true });
export type InsertValidationError = z.infer<typeof insertValidationErrorSchema>;
export type ValidationError = typeof validationErrors.$inferSelect;


// Quotations
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),

  quotationNumber: text("quotation_number").notNull(),
  issueDate: timestamp("issue_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),

  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),

  // Status & Settings
  status: text("status").default("draft"), // draft, sent, accepted, declined, invoiced
  taxInclusive: boolean("tax_inclusive").default(false),
  currency: text("currency").default("USD"),
  notes: text("notes"),
  invoiceTemplate: text("invoice_template").default("modern"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").references(() => quotations.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  company: one(companies, { fields: [quotations.companyId], references: [companies.id] }),
  customer: one(customers, { fields: [quotations.customerId], references: [customers.id] }),
  items: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, { fields: [quotationItems.quotationId], references: [quotations.id] }),
  product: one(products, { fields: [quotationItems.productId], references: [products.id] }),
}));

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
}).extend({
  quotationNumber: z.string().optional(),
});
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true, quotationId: true });

export type Quotation = typeof quotations.$inferSelect;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;

// Recurring Invoices
export const recurringInvoices = pgTable("recurring_invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),

  // Template data
  description: text("description"),
  currency: text("currency").default("USD").notNull(),
  taxInclusive: boolean("tax_inclusive").default(false),
  items: jsonb("items").notNull(), // Array of items

  // Schedule
  frequency: text("frequency").notNull(), // weekly, monthly, quarterly, yearly
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  nextRunDate: timestamp("next_run_date").notNull(),
  lastRunDate: timestamp("last_run_date"),

  // Settings
  status: text("status").default("active"), // active, paused, completed
  autoSend: boolean("auto_send").default(false),
  autoFiscalize: boolean("auto_fiscalize").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});

export const recurringInvoicesRelations = relations(recurringInvoices, ({ one }) => ({
  company: one(companies, { fields: [recurringInvoices.companyId], references: [companies.id] }),
  customer: one(customers, { fields: [recurringInvoices.customerId], references: [customers.id] }),
}));

export const insertRecurringInvoiceSchema = createInsertSchema(recurringInvoices).omit({ id: true, createdAt: true });
export type InsertRecurringInvoice = z.infer<typeof insertRecurringInvoiceSchema>;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;

// SECURITY & AUDIT
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ZIMRA Logs
export const zimraLogs = pgTable("zimra_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id), // Link to company for general logs
  invoiceId: integer("invoice_id").references(() => invoices.id), // Nullable for general requests
  endpoint: text("endpoint"), // Captured endpoint URL
  requestPayload: jsonb("request_payload").notNull(),
  responsePayload: jsonb("response_payload").notNull(),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertZimraLogSchema = createInsertSchema(zimraLogs).omit({ id: true, createdAt: true });
export type InsertZimraLog = z.infer<typeof insertZimraLogSchema>;
export type ZimraLog = typeof zimraLogs.$inferSelect;

