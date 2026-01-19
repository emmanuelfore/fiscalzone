
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
  fdmsApiKey: text("fdms_api_key"),
  zimraPrivateKey: text("zimra_private_key"),
  zimraCertificate: text("zimra_certificate"),
  zimraEnvironment: text("zimra_environment").default("test"), // 'test' or 'production'
  fiscalDayOpen: boolean("fiscal_day_open").default(false),
  currentFiscalDayNo: integer("current_fiscal_day_no").default(0),
  lastFiscalDayStatus: text("last_fiscal_day_status"),
  lastReceiptGlobalNo: integer("last_receipt_global_no").default(0),
  deviceReportingFrequency: integer("device_reporting_frequency").default(1440), // Default 24h/1440m just in case
  lastPing: timestamp("last_ping"),
  lastFiscalHash: text("last_fiscal_hash"), // To store previous receipt hash for chaining
  dailyReceiptCount: integer("daily_receipt_count").default(0), // To track RCPT011

  // Banking Details
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  branchCode: text("branch_code"),

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

  // ZIMRA Fiscal Fields
  fiscalCode: text("fiscal_code"),
  fiscalSignature: text("fiscal_signature"),
  qrCodeData: text("qr_code_data"),
  syncedWithFdms: boolean("synced_with_fdms").default(false),
  fdmsStatus: text("fdms_status").default("pending"),
  submissionId: text("submission_id"),
  fiscalDayNo: integer("fiscal_day_no"), // To track which fiscal day this invoice belongs to

  currency: text("currency").default("USD"),
  paymentMethod: text("payment_method").default("CASH"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.000000"),

  // Transaction Type
  transactionType: text("transaction_type").default("FiscalInvoice"), // FiscalInvoice, CreditNote, DebitNote
  relatedInvoiceId: integer("related_invoice_id"), // Self-reference for CN/DN

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items: many(invoiceItems),
}));

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
  fiscalCode: true,
  fiscalSignature: true,
  qrCodeData: true,
  syncedWithFdms: true
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
