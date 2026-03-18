
import { pgTable, text, serial, integer, boolean, timestamp, decimal, numeric, jsonb, primaryKey, uuid, date, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - Compatible with Supabase Auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), // Use UUID for Supabase Auth compatibility
  email: text("email").unique().notNull(),
  password: text("password"),
  name: text("name"),
  username: text("username").unique(),
  passwordChanged: boolean("password_changed").default(false),
  pin: text("pin"), // Encrypted PIN for POS overrides
  createdAt: timestamp("created_at").defaultNow(),
  isSuperAdmin: boolean("is_super_admin").default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  companyUsers: many(companyUsers),
}));

export const resetTokens = pgTable("reset_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  apiKey: text("api_key").unique(), // For external device authentication
  apiKeyCreatedAt: timestamp("api_key_created_at"),
  zimraPrivateKey: text("zimra_private_key"),
  zimraCertificate: text("zimra_certificate"),
  zimraEnvironment: text("zimra_environment").default("test"), // 'test' or 'production'
  fiscalDayOpen: boolean("fiscal_day_open").default(false),
  currentFiscalDayNo: integer("current_fiscal_day_no").default(0),
  fiscalDayOpenedAt: timestamp("fiscal_day_opened_at"),
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
  posSettings: jsonb("pos_settings"), // Stores receipt header/footer, auto-print defaults etc.
  lastReceiptAt: timestamp("last_receipt_at"),

  // Inventory Settings
  inventoryValuationMethod: text("inventory_valuation_method").default("FIFO"), // FIFO, LIFO, WAC

  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, expired
  registeredMacAddress: text("registered_mac_address"), // Physical device binding
  createdAt: timestamp("created_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(companyUsers),
  customers: many(customers),
  products: many(products),
  invoices: many(invoices),
  suppliers: many(suppliers),
  expenses: many(expenses),
}));

// Join table for Users <-> Companies
export const companyUsers = pgTable("company_users", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  role: text("role").default("member"), // owner, admin, member
}, (table) => {
  return {
    userIdIdx: index("company_users_user_id_idx").on(table.userId),
    companyIdIdx: index("company_users_company_id_idx").on(table.companyId),
  };
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
}, (table) => {
  return {
    companyIdIdx: index("customers_company_id_idx").on(table.companyId),
  };
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, { fields: [customers.companyId], references: [companies.id] }),
  invoices: many(invoices),
}));

// Tax Types
export const taxTypes = pgTable("tax_types", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id), // Nullable for system defaults if any
  code: text("code").notNull(), // VAT-STD, VAT-ZERO
  name: text("name").notNull(),
  description: text("description"),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  zimraCode: text("zimra_code"), // A, B, E, C
  zimraTaxId: text("zimra_tax_id"), // Optional ZIMRA ID e.g. "3"
  calculationMethod: text("calculation_method").default("INCLUSIVE"), // INCLUSIVE, EXCLUSIVE
}, (table) => {
  return {
    companyCodeUnique: unique("company_code_idx").on(table.companyId, table.code),
  };
});

// Tax Categories
export const taxCategories = pgTable("tax_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: text("name").notNull(),
  defaultTaxTypeId: integer("default_tax_type_id").references(() => taxTypes.id),
  zimraCategoryCode: text("zimra_category_code"), // GOODS_STD, FOOD_BASIC
  description: text("description"),
  isActive: boolean("is_active").default(true),
}, (table) => {
  return {
    companyNameUnique: unique("company_name_idx").on(table.companyId, table.name),
  };
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({ id: true, companyId: true });
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;
export type TaxCategory = typeof taxCategories.$inferSelect;

export const insertTaxTypeSchema = createInsertSchema(taxTypes, {
  rate: z.string().or(z.number()),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
}).omit({ id: true, companyId: true });
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
  taxTypeId: integer("tax_type_id").references(() => taxTypes.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("products_company_id_idx").on(table.companyId),
  };
});

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  inventoryTransactions: many(inventoryTransactions),
}));

// Product Categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("product_categories_company_id_idx").on(table.companyId),
    companyNameUnique: unique("product_categories_company_name_idx").on(table.companyId, table.name),
  };
});

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  company: one(companies, { fields: [productCategories.companyId], references: [companies.id] }),
}));

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

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
  isPos: boolean("is_pos").default(false),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),

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

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("invoices_company_id_idx").on(table.companyId),
    customerIdIdx: index("invoices_customer_id_idx").on(table.customerId),
    invoiceNumberIdx: index("invoices_invoice_number_idx").on(table.invoiceNumber),
  };
});



// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  taxTypeId: integer("tax_type_id").references(() => taxTypes.id),
  cogsAmount: decimal("cogs_amount", { precision: 10, scale: 2 }),
}, (table) => {
  return {
    invoiceIdIdx: index("invoice_items_invoice_id_idx").on(table.invoiceId),
  };
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
  symbol: text("symbol").notNull(), // $, ZWG, R
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
export const insertResetTokenSchema = createInsertSchema(resetTokens).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true }).extend({
  tin: z.string().regex(/^\d{10}$/, "TIN must be exactly 10 digits").or(z.string().length(0)).nullable().optional(),
  vatNumber: z.string().regex(/^\d{9,10}$/, "VAT number must be 9 or 10 digits").or(z.string().length(0)).nullable().optional(),
  bpNumber: z.string().regex(/^\d{10}$/, "BP number must be exactly 10 digits").or(z.string().length(0)).nullable().optional(),
});
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

export type ResetToken = typeof resetTokens.$inferSelect;
export type InsertResetToken = z.infer<typeof insertResetTokenSchema>;

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

export const insertCurrencySchema = createInsertSchema(currencies).omit({ id: true, companyId: true, lastUpdated: true });
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
  creator: one(users, { fields: [invoices.createdBy], references: [users.id] }),
  items: many(invoiceItems),
  payments: many(payments),
  validationErrors: many(validationErrors),
}));


export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, companyId: true, createdAt: true });
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
  taxTypeId: integer("tax_type_id").references(() => taxTypes.id),
  cogsAmount: decimal("cogs_amount", { precision: 10, scale: 2 }), // Cost of Goods Sold for this line
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
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
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

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  deviceSerialNo: text("device_serial_no").notNull(),
  deviceMacAddress: text("device_mac_address"), // Physical device binding
  paynowReference: text("paynow_reference").unique(), // Nullable for manual/cash payments
  paymentMethod: text("payment_method").default("paynow"), // paynow, cash, bank_transfer
  pollUrl: text("poll_url"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, paid, failed, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, { fields: [subscriptions.companyId], references: [companies.id] }),
}));

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// POS Shifts
export const posShifts = pgTable("pos_shifts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).notNull(),
  closingBalance: decimal("closing_balance", { precision: 10, scale: 2 }),
  status: text("status").default("open"), // open, closed
  notes: text("notes"),

  // Reconciliation data
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }),
  reconciledAt: timestamp("reconciled_at"),
  reconciledBy: uuid("reconciled_by").references(() => users.id),
  reconciliationNotes: text("reconciliation_notes"),
  reconciliationStatus: text("reconciliation_status"), // reconciled, minor_discrepancy, major_discrepancy, critical_discrepancy, pending

  createdAt: timestamp("created_at").defaultNow(),
});

export const posShiftsRelations = relations(posShifts, ({ one }) => ({
  company: one(companies, { fields: [posShifts.companyId], references: [companies.id] }),
  user: one(users, { fields: [posShifts.userId], references: [users.id] }),
}));

// POS Holds (Parked Sales)
export const posHolds = pgTable("pos_holds", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  holdName: text("hold_name"),
  total: numeric("total", { precision: 12, scale: 2 }),
  orderDiscount: numeric("order_discount", { precision: 12, scale: 2 }).default("0"),
  cartData: jsonb("cart_data").notNull(), // Array of cart items
  createdAt: timestamp("created_at").defaultNow(),
});

export const posHoldsRelations = relations(posHolds, ({ one }) => ({
  company: one(companies, { fields: [posHolds.companyId], references: [companies.id] }),
  user: one(users, { fields: [posHolds.userId], references: [users.id] }),
  customer: one(customers, { fields: [posHolds.customerId], references: [customers.id] }),
}));

export const insertPosShiftSchema = createInsertSchema(posShifts).omit({ id: true, createdAt: true });
export type PosShift = typeof posShifts.$inferSelect;
export type InsertPosShift = z.infer<typeof insertPosShiftSchema>;

export const insertPosHoldSchema = createInsertSchema(posHolds).omit({ id: true, createdAt: true });
export type PosHold = typeof posHolds.$inferSelect;
export type InsertPosHold = z.infer<typeof insertPosHoldSchema>;

// POS Shift Transactions (Cash Drops / Payouts)
export const posShiftTransactions = pgTable("pos_shift_transactions", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => posShifts.id).notNull(),
  items: jsonb("items").notNull(), // Array of { description, amount } or similar if needed, or just simple
  type: text("type").notNull(), // 'DROP', 'PAYOUT'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posShiftTransactionsRelations = relations(posShiftTransactions, ({ one }) => ({
  shift: one(posShifts, { fields: [posShiftTransactions.shiftId], references: [posShifts.id] }),
  user: one(users, { fields: [posShiftTransactions.userId], references: [users.id] }),
}));

export const insertPosShiftTransactionSchema = createInsertSchema(posShiftTransactions).omit({ id: true, createdAt: true });
export type PosShiftTransaction = typeof posShiftTransactions.$inferSelect;
export type InsertPosShiftTransaction = z.infer<typeof insertPosShiftTransactionSchema>;

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tin: text("tin"),
  vatNumber: text("vat_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("suppliers_company_id_idx").on(table.companyId),
  };
});

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  company: one(companies, { fields: [suppliers.companyId], references: [companies.id] }),
}));

// Inventory Transactions (Stock Ledger)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),

  type: text("type").notNull(), // 'STOCK_IN' (GRN), 'STOCK_OUT' (Invoice), 'ADJUSTMENT'
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),

  referenceType: text("reference_type"), // 'GRN', 'INVOICE', 'MANUAL'
  referenceId: text("reference_id"), // ID of the GRN or Invoice

  remainingQuantity: decimal("remaining_quantity", { precision: 10, scale: 2 }), // For FIFO/LIFO tracking
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("inv_trans_company_id_idx").on(table.companyId),
    productIdIdx: index("inv_trans_product_id_idx").on(table.productId),
  };
});

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  company: one(companies, { fields: [inventoryTransactions.companyId], references: [companies.id] }),
  product: one(products, { fields: [inventoryTransactions.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [inventoryTransactions.supplierId], references: [suppliers.id] }),
}));

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),

  category: text("category").notNull(), // Rent, Utilities, Salary, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  expenseDate: timestamp("expense_date").defaultNow().notNull(),

  paymentMethod: text("payment_method"),
  reference: text("reference"),
  status: text("status").default("paid"), // paid, pending

  attachmentUrl: text("attachment_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    companyIdIdx: index("expenses_company_id_idx").on(table.companyId),
  };
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  company: one(companies, { fields: [expenses.companyId], references: [companies.id] }),
  supplier: one(suppliers, { fields: [expenses.supplierId], references: [suppliers.id] }),
}));

// Zod schemas for new tables
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

