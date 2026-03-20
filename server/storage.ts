
import {
  users, companies, customers, products, invoices, invoiceItems, companyUsers,
  type User, type InsertUser, type Company, type InsertCompany,
  type Customer, type Product, type Invoice, type InvoiceItem,
  type InsertCustomer, type InsertProduct, type CreateInvoiceRequest, type InsertInvoice,
  taxTypes, taxCategories, type TaxType, type TaxCategory, type InsertTaxCategory, type InsertTaxType,
  currencies, type Currency, type InsertCurrency,
  payments, type Payment, type InsertPayment,
  auditLogs, type AuditLog, type InsertAuditLog,
  recurringInvoices, type RecurringInvoice, type InsertRecurringInvoice,
  quotations, quotationItems, type Quotation, type QuotationItem, type InsertQuotation, type InsertQuotationItem,
  zimraLogs, type ZimraLog, type InsertZimraLog,
  validationErrors, type ValidationError, type InsertValidationError,
  subscriptions, type Subscription, type InsertSubscription,
  posShifts, type PosShift, type InsertPosShift,
  posHolds, type PosHold, type InsertPosHold,
  productCategories, type ProductCategory, type InsertProductCategory,
  resetTokens, insertResetTokenSchema,
  suppliers, inventoryTransactions, expenses,
  type Supplier, type InsertSupplier,
  type InventoryTransaction, type InsertInventoryTransaction,
  type Expense, type InsertExpense
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, lte, gte, lt, ne, or, isNull, sql, ilike, count, inArray } from "drizzle-orm";
import { type FiscalDayCounter } from "./zimra.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { format } from "date-fns";

const scryptAsync = promisify(scrypt);

export interface IStorage {
  // User & Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  setUserPin(userId: string, pin: string): Promise<void>;
  verifyUserPin(userId: string, pin: string): Promise<boolean>;

  // Password Reset
  createResetToken(userId: string): Promise<string>;
  verifyResetToken(token: string): Promise<string | null>; // Returns userId if valid
  consumeResetToken(token: string): Promise<void>;

  // Companies
  createCompany(company: InsertCompany, userId: string): Promise<Company>;
  getCompanies(userId: string): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByApiKey(apiKey: string): Promise<Company | undefined>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;

  // Customers
  getCustomers(companyId: number): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;

  // Products
  getProducts(companyId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteCompanyProducts(companyId: number): Promise<void>;
  getProductsForExport(companyId: number): Promise<any[]>;

  // Invoices
  getInvoicesPaginated(companyId: number, page?: number, limit?: number, search?: string, status?: string, type?: string, dateFrom?: Date, dateTo?: Date, isPos?: boolean): Promise<{ data: (Invoice & { customer?: Customer; latestError?: { message: string, color: string } })[]; total: number; pages: number }>;
  getInvoices(companyId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer; validationErrors?: any[]; relatedInvoiceNumber?: string; relatedInvoiceDate?: Date | null; relatedFiscalCode?: string; relatedReceiptGlobalNo?: number; relatedReceiptCounter?: number }) | undefined>;
  createInvoice(invoice: CreateInvoiceRequest): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  fiscalizeInvoice(id: number, fiscalData: { fiscalCode: string; qrCodeData: string; fiscalSignature?: string; fiscalDayNo?: number; receiptCounter?: number; receiptGlobalNo?: number; syncedWithFdms?: boolean; fdmsStatus?: string; validationStatus?: string; lastValidationAttempt?: Date }): Promise<Invoice>;
  createValidationErrors(errors: Array<{ invoiceId: number; errorCode: string; errorMessage: string; errorColor: string; requiresPreviousReceipt: boolean }>): Promise<void>;

  // Tax Config
  getTaxTypes(companyId?: number): Promise<TaxType[]>;
  createTaxType(taxType: InsertTaxType & { companyId: number }): Promise<TaxType>;
  updateTaxType(id: number, companyId: number, taxType: Partial<InsertTaxType>): Promise<TaxType | undefined>;
  getTaxCategories(companyId?: number): Promise<TaxCategory[]>;
  createTaxCategory(category: InsertTaxCategory & { companyId: number }): Promise<TaxCategory>;
  updateTaxCategory(id: number, companyId: number, category: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined>;
  syncTaxTypes(companyId: number, zimraTaxes: any[]): Promise<TaxType[]>;

  // Currencies
  getCurrencies(companyId: number): Promise<Currency[]>;
  createCurrency(currency: InsertCurrency): Promise<Currency>;
  updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency>;
  deleteCurrency(id: number): Promise<void>;

  // User Management
  getCompanyUsers(companyId: number): Promise<(User & { role: string })[]>;
  addCompanyUser(userId: string, companyId: number, role: string): Promise<void>;
  updateUserRole(userId: string, companyId: number, role: string): Promise<void>;
  removeCompanyUser(userId: string, companyId: number): Promise<void>;
  getCompanyUserRole(userId: string, companyId: number): Promise<string | undefined>;

  // Analytics
  getCompanyStats(companyId: number): Promise<{ totalRevenue: number; pendingAmount: number; invoicesCount: number; customersCount: number }>;
  getRevenueOverTime(companyId: number, days?: number): Promise<{ date: string; amount: number }[]>;
  getReceivablesAging(companyId: number): Promise<{
    total: number;
    current: number;
    days1_15: number;
    days16_30: number;
    days31_45: number;
    above45: number;
  }>;
  getFiscalYearStats(companyId: number): Promise<{
    totalSales: number;
    totalReceipts: number;
    totalExpenses: number;
    monthlyData: { month: string; sales: number; expenses: number }[];
  }>;
  calculateFiscalCounters(companyId: number, fiscalDayNo: number): Promise<FiscalDayCounter[]>;

  // Locking
  lockInvoice(id: number, userId: string): Promise<boolean>;
  unlockInvoice(id: number, userId: string): Promise<void>;

  // Atomic counter claim — prevents race conditions on concurrent fiscalizations
  claimNextReceiptNumbers(companyId: number): Promise<{ receiptGlobalNo: number; receiptCounter: number }>;

  // Utils
  getNextInvoiceNumber(companyId: number, prefix: string): Promise<string>;
  generateNextDeviceSerial(companyId: number): Promise<string>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayments(invoiceId: number): Promise<Payment[]>;
  getPayment(id: number): Promise<(Payment & { invoice?: Invoice; customer?: Customer; company?: Company }) | undefined>;
  deletePayment(id: number): Promise<void>;

  // Reports
  getStatementData(customerId: number, startDate: Date, endDate: Date, currency?: string): Promise<{
    customer: Customer;
    openingBalance: number;
    closingBalance: number;
    transactions: any[];
  }>;
  getSalesReport(companyId: number, startDate: Date, endDate: Date, cashierId?: string): Promise<any[]>;
  getPaymentsReport(companyId: number, startDate: Date, endDate: Date): Promise<any[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: number, limit?: number): Promise<AuditLog[]>;

  // Recurring Invoices
  getRecurringInvoices(companyId: number): Promise<RecurringInvoice[]>;
  getDueRecurringInvoices(): Promise<RecurringInvoice[]>;
  createRecurringInvoice(data: InsertRecurringInvoice): Promise<RecurringInvoice>;
  updateRecurringInvoice(id: number, data: Partial<InsertRecurringInvoice>): Promise<RecurringInvoice>;
  deleteRecurringInvoice(id: number): Promise<void>;

  // Quotations
  getQuotations(companyId: number): Promise<Quotation[]>;
  getQuotation(id: number): Promise<(Quotation & { items: QuotationItem[]; customer?: Customer }) | undefined>;
  getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer; validationErrors?: any[]; relatedInvoiceNumber?: string; relatedInvoiceDate?: Date | null; relatedFiscalCode?: string; relatedReceiptGlobalNo?: number; relatedReceiptCounter?: number }) | undefined>;
  createQuotation(data: InsertQuotation & { items: InsertQuotationItem[] }): Promise<Quotation>;

  updateQuotation(id: number, data: Partial<InsertQuotation> & { items?: InsertQuotationItem[] }): Promise<Quotation>;
  deleteQuotation(id: number): Promise<void>;
  getNextQuotationNumber(companyId: number): Promise<string>;

  // ZIMRA Logs
  createZimraLog(log: InsertZimraLog): Promise<ZimraLog>;
  getZimraLogs(invoiceId: number): Promise<ZimraLog[]>;
  getCompanyZimraLogs(companyId: number, limit?: number): Promise<ZimraLog[]>;
  // ZIMRA Helpers
  resolveGreyErrors(companyId: number, fiscalDayNo: number, skipInvoiceId?: number): Promise<void>;
  getInvoicesByFiscalDay(companyId: number, fiscalDayNo: number): Promise<Invoice[]>;

  // Subscriptions
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByReference(reference: string): Promise<Subscription | undefined>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription>;
  getActiveSubscriptionByDevice(companyId: number, deviceSerialNo: string, macAddress: string): Promise<Subscription | undefined>;
  getSubscriptionsByCompany(companyId: number): Promise<Subscription[]>;
  hasActiveSubscriptionByMac(companyId: number, macAddress: string): Promise<boolean>;

  // POS
  getPosHolds(companyId: number, userId: string): Promise<PosHold[]>;
  createPosHold(data: InsertPosHold): Promise<PosHold>;
  deletePosHold(id: number, userId: string): Promise<void>;
  getPosShifts(companyId: number, userId: string): Promise<PosShift[]>;
  getActivePosShift(companyId: number, userId: string): Promise<PosShift | undefined>;
  getPosSales(companyId: number, startDate: Date, endDate: Date, cashierId?: string, paymentMethod?: string, status?: string, search?: string): Promise<any[]>;
  createPosShift(data: InsertPosShift): Promise<PosShift>;
  updatePosShift(id: number, userId: string, data: Partial<PosShift>): Promise<PosShift>;

  // Product Categories
  getProductCategories(companyId: number): Promise<ProductCategory[]>;
  createProductCategory(data: InsertProductCategory & { companyId: number }): Promise<ProductCategory>;
  deleteProductCategory(id: number, companyId: number): Promise<void>;

  // Reports
  getSalesByCategory(companyId: number, startDate: Date, endDate: Date): Promise<{ category: string; totalSales: number; count: number }[]>;
  getSalesByUser(companyId: number, startDate: Date, endDate: Date): Promise<{ userId: string; userName: string; totalSales: number; count: number }[]>;
  getProductPerformance(companyId: number, startDate: Date, endDate: Date, isPosOnly?: boolean): Promise<{ productId: number; productName: string; quantity: number; revenue: number }[]>;

  // Maintenance
  clearTestInvoices(companyId: number): Promise<number>;

  // Suppliers
  getSuppliers(companyId: number): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier & { companyId: number }): Promise<Supplier>;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;

  // Inventory Transactions
  getInventoryTransactions(companyId: number, productId?: number): Promise<InventoryTransaction[]>;
  createInventoryTransaction(data: InsertInventoryTransaction & { companyId: number }): Promise<InventoryTransaction>;

  // Expenses
  getExpenses(companyId: number): Promise<Expense[]>;
  createExpense(data: InsertExpense & { companyId: number }): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;

  // Reports & Analytics
  getStockValuationReport(companyId: number): Promise<any[]>;
  getFinancialSummary(companyId: number, dateFrom?: Date, dateTo?: Date, cashierId?: string): Promise<any>;

  // Report Module Methods
  getReportSalesSummary(companyId: number, start: Date, end: Date): Promise<{ date: string; invoiceCount: number; subtotal: string; taxAmount: string; total: string }[]>;
  getReportSalesByCustomer(companyId: number, start: Date, end: Date): Promise<{ customerId: number; customerName: string; invoiceCount: number; total: string }[]>;
  getReportSalesByItem(companyId: number, start: Date, end: Date): Promise<{ productId: number | null; description: string; quantitySold: string; revenue: string }[]>;
  getReportSalesBySalesperson(companyId: number, start: Date, end: Date): Promise<{ userId: string; userName: string; invoiceCount: number; total: string }[]>;
  getReportArAgingSummary(companyId: number, start: Date, end: Date): Promise<{ customerId: number; customerName: string; current: string; days31_60: string; days61_90: string; days90plus: string; total: string }[]>;
  getReportArAgingDetails(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; dueDate: string; daysOverdue: number; balanceDue: string; bucket: "current" | "31-60" | "61-90" | "90+" }[]>;
  getReportInvoiceDetails(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; issueDate: string; dueDate: string; status: string; total: string; paidAmount: string; balanceDue: string }[]>;
  getReportQuoteDetails(companyId: number, start: Date, end: Date): Promise<{ quotationId: number; quotationNumber: string; customerName: string; issueDate: string; expiryDate: string | null; status: string; total: string }[]>;
  getReportCustomerBalanceSummary(companyId: number, start: Date, end: Date): Promise<{ customerId: number; customerName: string; totalInvoiced: string; totalPaid: string; balance: string }[]>;
  getReportReceivableSummary(companyId: number, start: Date, end: Date): Promise<{ totalInvoiced: string; totalCollected: string; totalOutstanding: string }>;
  getReportReceivableDetails(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; issueDate: string; total: string; paidAmount: string; balanceDue: string; status: string }[]>;
  getReportBadDebts(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; dueDate: string; daysOverdue: number; balanceDue: string }[]>;
  getReportBankCharges(companyId: number, start: Date, end: Date): Promise<{ paymentId: number; invoiceNumber: string; customerName: string; paymentDate: string; reference: string; amount: string }[]>;
  getReportTimeToGetPaid(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; issueDate: string; paymentDate: string; daysToPayment: number; amount: string }[]>;
  getReportRefundHistory(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; issueDate: string; amount: string; relatedInvoiceNumber: string | null }[]>;
  getReportWithholdingTax(companyId: number, start: Date, end: Date): Promise<{ invoiceId: number; invoiceNumber: string; customerName: string; issueDate: string; withheldAmount: string; total: string }[]>;
  getReportExpenseDetails(companyId: number, start: Date, end: Date): Promise<{ expenseId: number; expenseDate: string; category: string; description: string; supplierName: string | null; paymentMethod: string | null; reference: string | null; amount: string; currency: string }[]>;
  getReportExpensesByCategory(companyId: number, start: Date, end: Date): Promise<{ category: string; total: string; percentage: string; count: number }[]>;
  getReportExpensesByCustomer(companyId: number, start: Date, end: Date): Promise<{ supplierId: number | null; supplierName: string; total: string; count: number }[]>;
  getReportExpensesByProject(companyId: number, start: Date, end: Date): Promise<{ project: string; total: string; count: number }[]>;
  getReportBillableExpenseDetails(companyId: number, start: Date, end: Date): Promise<{ expenseId: number; expenseDate: string; category: string; description: string; amount: string; status: string }[]>;
  getReportTaxSummary(companyId: number, start: Date, end: Date): Promise<{ taxCode: string; taxName: string; taxRate: string; taxableAmount: string; outputTax: string; inputTax: string; netVat: string }[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateUser: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateUser)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setUserPin(userId: string, pin: string): Promise<void> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
    const hashedPin = `${buf.toString("hex")}.${salt}`;

    await db.update(users)
      .set({ pin: hashedPin })
      .where(eq(users.id, userId));
  }

  async verifyUserPin(userId: string, pin: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.pin) return false;

    const [hashed, salt] = user.pin.split(".");
    const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
    const computed = buf.toString("hex");

    // Console log for debugging
    console.log(`[VERIFY] ID: ${userId}, Stored: ${hashed}, Computed: ${computed}`);

    return computed === hashed;
  }

  async createCompany(company: InsertCompany, userId: string): Promise<Company> {
    return await db.transaction(async (tx) => {
      const [newCompany] = await tx.insert(companies).values(company).returning();
      await tx.insert(companyUsers).values({
        userId,
        companyId: newCompany.id,
        role: "owner"
      });

      // Automatically create default currencies (USD and ZIG)
      await tx.insert(currencies).values([
        {
          companyId: newCompany.id,
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          exchangeRate: "1.000000",
          isBase: true,
          isActive: true
        },
        {
          companyId: newCompany.id,
          code: "ZWG",
          name: "Zimbabwe Gold",
          symbol: "ZWG",
          exchangeRate: "13.500000",
          isBase: false,
          isActive: true
        }
      ]);

      return newCompany;
    });
  }


  async createResetToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await db.insert(resetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
      createdAt: new Date()
    });

    return token;
  }

  async verifyResetToken(token: string): Promise<string | null> {
    const [record] = await db
      .select()
      .from(resetTokens)
      .where(eq(resetTokens.token, token));

    if (!record) return null;
    if (record.used) return null;
    if (new Date() > record.expiresAt) return null;

    return record.userId;
  }

  async consumeResetToken(token: string): Promise<void> {
    await db
      .update(resetTokens)
      .set({ used: true })
      .where(eq(resetTokens.token, token));
  }

  // Companies
  async getCompanies(userId: string): Promise<(Company & { role: string })[]> {
    const user = await this.getUser(userId);

    if (user?.isSuperAdmin) {
      const allCompanies = await db.select().from(companies);
      return allCompanies.map(c => ({ ...c, role: "owner" }));
    }

    const result = await db
      .select({
        company: companies,
        role: companyUsers.role
      })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(eq(companyUsers.userId, userId));

    return result.map(r => ({
      ...r.company,
      role: r.role || "member"
    }));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByApiKey(apiKey: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.apiKey, apiKey));
    return company;
  }

  async generateNextDeviceSerial(companyId: number): Promise<string> {
    // Get the highest device serial number across ALL companies to ensure global uniqueness (or per company if preferred)
    // The user requested "starting with FS-00001 going upwards" which implies a global or incremental sequence.
    // However, usually serial numbers are unique identifiers. Let's find the max FS- number in the system.
    const allSerials = await db
      .select({ fdmsDeviceSerialNo: companies.fdmsDeviceSerialNo })
      .from(companies)
      .where(
        and(
          sql`${companies.fdmsDeviceSerialNo} IS NOT NULL`,
          sql`${companies.fdmsDeviceSerialNo} != ''`
        )
      );

    let maxNumber = 0;
    for (const item of allSerials) {
      if (item.fdmsDeviceSerialNo) {
        const match = item.fdmsDeviceSerialNo.match(/FS-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `FS-${nextNumber.toString().padStart(5, '0')}`;
  }

  async getCustomers(companyId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.companyId, companyId));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async getProducts(companyId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.companyId, companyId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const data = { ...product };
    if (data.isTracked === false) {
      data.productType = 'service';
    }
    const [newProduct] = await db.insert(products).values(data).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const data = { ...product };
    if (data.isTracked === false) {
      data.productType = 'service';
    }
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }
  
  async deleteCompanyProducts(companyId: number): Promise<void> {
    await db.delete(products).where(eq(products.companyId, companyId));
  }
  
  async getProductsForExport(companyId: number): Promise<any[]> {
    return await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        costPrice: products.costPrice,
        taxRate: products.taxRate,
        taxCode: taxTypes.code,
        category: products.category,
        productType: products.productType,
        stockLevel: products.stockLevel,
        hsCode: products.hsCode,
        isTracked: products.isTracked,
        isActive: products.isActive
      })
      .from(products)
      .leftJoin(taxTypes, eq(products.taxTypeId, taxTypes.id))
      .where(and(
        eq(products.companyId, companyId),
        eq(products.isActive, true)
      ));
  }

  async getInvoices(companyId: number): Promise<(Invoice & { customer?: Customer })[]> {
    const rows = await db
      .select({
        invoice: invoices,
        customer: customers
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.createdAt));

    return rows.map(r => ({
      ...r.invoice,
      customer: r.customer || undefined
    }));
  }

  async getInvoicesPaginated(
    companyId: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string,
    type?: string,
    dateFrom?: Date,
    dateTo?: Date,
    isPos?: boolean
  ): Promise<{ data: (Invoice & { customer?: Customer; latestError?: { message: string, color: string } })[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;

    const filters = [eq(invoices.companyId, companyId)];

    // Add POS filter if specified
    if (isPos !== undefined) {
      filters.push(eq(invoices.isPos, isPos));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      filters.push(
        or(
          ilike(invoices.invoiceNumber, searchTerm),
          ilike(customers.name, searchTerm),
          sql`CAST(${invoices.total} AS TEXT) ILIKE ${searchTerm}`
        )
      );
    }

    if (status && status !== 'all') {
      if (status === 'fiscalized') {
        filters.push(eq(invoices.syncedWithFdms, true));
      } else if (status === 'pending-sync') {
        filters.push(and(
          eq(invoices.syncedWithFdms, false),
          eq(invoices.status, 'issued')
        ));
      } else {
        filters.push(eq(invoices.status, status));
      }
    }

    if (type && type !== 'all') {
      filters.push(eq(invoices.transactionType, type));
    }

    if (dateFrom) {
      filters.push(gte(invoices.issueDate, dateFrom));
    }

    if (dateTo) {
      // Add one day to include the end date fully
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      filters.push(lt(invoices.issueDate, nextDay));
    }

    const whereClause = and(...filters);

    const [totalResult] = await db
      .select({ count: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause);

    const total = totalResult?.count || 0;
    const pages = Math.ceil(total / limit);

    // Subquery to get the latest error for each invoice
    const latestErrorSubquery = db
      .select({
        invoiceId: validationErrors.invoiceId,
        errorMessage: validationErrors.errorMessage,
        errorColor: validationErrors.errorColor,
        rn: sql`row_number() over (partition by ${validationErrors.invoiceId} order by ${validationErrors.createdAt} desc)`.as("rn"),
      })
      .from(validationErrors)
      .as("latest_errors");

    const rows = await db
      .select({
        invoice: invoices,
        customer: customers,
        latestErrorMsg: latestErrorSubquery.errorMessage,
        latestErrorColor: latestErrorSubquery.errorColor
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(latestErrorSubquery, and(
        eq(invoices.id, latestErrorSubquery.invoiceId),
        eq(latestErrorSubquery.rn, 1)
      ))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(invoices.createdAt));

    const data = rows.map(r => ({
      ...r.invoice,
      customer: r.customer || undefined,
      latestError: r.latestErrorMsg ? {
        message: r.latestErrorMsg,
        color: r.latestErrorColor || 'Red'
      } : undefined
    }));

    return { data, total, pages };
  }

  async getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer; validationErrors?: any[]; relatedInvoiceNumber?: string; relatedInvoiceDate?: Date | null; relatedFiscalCode?: string; relatedReceiptGlobalNo?: number; relatedReceiptCounter?: number }) | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId));

    // Fetch related invoice details if this is a credit/debit note
    // ZIMRA Fields [26], [27], [28]
    let relatedInvoiceNumber: string | undefined;
    let relatedInvoiceDate: Date | null | undefined;
    let relatedFiscalCode: string | undefined;
    let relatedReceiptGlobalNo: number | undefined;
    let relatedReceiptCounter: number | undefined;

    if (invoice.relatedInvoiceId) {
      const [relatedInvoice] = await db.select({
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        fiscalCode: invoices.fiscalCode,
        receiptGlobalNo: invoices.receiptGlobalNo,
        receiptCounter: invoices.receiptCounter
      }).from(invoices).where(eq(invoices.id, invoice.relatedInvoiceId));
      relatedInvoiceNumber = relatedInvoice?.invoiceNumber;
      relatedInvoiceDate = relatedInvoice?.issueDate;
      relatedFiscalCode = relatedInvoice?.fiscalCode || undefined;
      relatedReceiptGlobalNo = relatedInvoice?.receiptGlobalNo || undefined;
      relatedReceiptCounter = relatedInvoice?.receiptCounter || undefined;
    }

    const rows = await db
      .select({
        item: invoiceItems,
        product: products
      })
      .from(invoiceItems)
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoiceItems.invoiceId, id));

    const items = rows.map(r => ({
      ...r.item,
      product: r.product || undefined
    }));

    // Fetch validation errors if any
    const validationErrorsRows = await db
      .select()
      .from(validationErrors)
      .where(eq(validationErrors.invoiceId, id))
      .orderBy(validationErrors.createdAt);

    return {
      ...invoice,
      items,
      customer,
      validationErrors: validationErrorsRows,
      relatedInvoiceNumber,
      relatedInvoiceDate,
      relatedFiscalCode,
      relatedReceiptGlobalNo,
      relatedReceiptCounter
    };
  }


  async deleteInvoice(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Delete items (Foreign Key Constraint)
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      // 2. Delete validation errors
      await tx.delete(validationErrors).where(eq(validationErrors.invoiceId, id));

      // 3. Delete payments
      await tx.delete(payments).where(eq(payments.invoiceId, id));

      // 4. Nullify zimra_logs references (preserve logs for audit, but break the link to deleted invoice)
      await tx.update(zimraLogs)
        .set({ invoiceId: null })
        .where(eq(zimraLogs.invoiceId, id));

      // 5. Finally delete the invoice
      await tx.delete(invoices).where(eq(invoices.id, id));
    });
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const { items, ...invoiceData } = data;
      const [invoice] = await tx.insert(invoices).values({
        ...invoiceData,
        invoiceNumber: await this.getNextInvoiceNumber(invoiceData.companyId, invoiceData.transactionType === 'CreditNote' ? 'CN' : (invoiceData.transactionType === 'DebitNote' ? 'DN' : 'INV')),
        dueDate: new Date(invoiceData.dueDate), // Ensure Date object
      }).returning();

      const { calculateCOGS } = await import("./lib/inventory.js");

      if (items.length > 0) {
        // We will process items one by one to calculate COGS for each
        for (const item of items) {
          let cogsAmount: number | null = null;

          if (item.productId) {
            const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
            if (product && product.isTracked) {
              const quantity = parseFloat(item.quantity.toString());

              if (invoiceData.transactionType !== 'CreditNote') {
                // Calculate and deduct for sales
                cogsAmount = await calculateCOGS(item.productId, quantity, invoiceData.companyId);

                // Record the STOCK_OUT transaction
                await tx.insert(inventoryTransactions).values({
                  companyId: invoiceData.companyId,
                  productId: item.productId,
                  type: "STOCK_OUT",
                  quantity: (-quantity).toString(),
                  totalCost: cogsAmount?.toString() || null,
                  referenceType: "INVOICE",
                  referenceId: invoice.id.toString(),
                  notes: `Sale - Invoice ${invoice.invoiceNumber}`
                });
              } else {
                // Restoring stock for Credit Note
                // Simplification for now: just record as STOCK_IN without specific batch tracking for returns
                // but incrementing stock level
                await tx.insert(inventoryTransactions).values({
                  companyId: invoiceData.companyId,
                  productId: item.productId,
                  type: "ADJUSTMENT",
                  quantity: quantity.toString(),
                  referenceType: "INVOICE",
                  referenceId: invoice.id.toString(),
                  notes: `Return - Credit Note ${invoice.invoiceNumber}`,
                  remainingQuantity: quantity.toString()
                });
              }

              // Update stock level on product
              const stockChange = invoiceData.transactionType === 'CreditNote' ? quantity : -quantity;
              const newStockLevel = (parseFloat(product.stockLevel || "0") + stockChange).toString();
              await tx.update(products)
                .set({ stockLevel: newStockLevel })
                .where(eq(products.id, item.productId));
            }
          }

          // Insert the invoice item with COGS
          await tx.insert(invoiceItems).values({
            ...item,
            invoiceId: invoice.id,
            cogsAmount: cogsAmount?.toString() || null
          });
        }
      }

      // Manually construct the full invoice object using tx to avoid transaction visibility issues
      // 1. Fetch Customer
      let customer: Customer | undefined;
      if (invoice.customerId) {
        const [c] = await tx.select().from(customers).where(eq(customers.id, invoice.customerId));
        customer = c;
      }

      // 2. Fetch Related Invoice Details
      let relatedInvoiceNumber: string | undefined;
      let relatedInvoiceDate: Date | null | undefined;
      let relatedFiscalCode: string | undefined;
      let relatedReceiptGlobalNo: number | undefined;
      let relatedReceiptCounter: number | undefined;

      if (invoice.relatedInvoiceId) {
        const [related] = await tx.select({
          invoiceNumber: invoices.invoiceNumber,
          issueDate: invoices.issueDate,
          fiscalCode: invoices.fiscalCode,
          receiptGlobalNo: invoices.receiptGlobalNo,
          receiptCounter: invoices.receiptCounter
        }).from(invoices).where(eq(invoices.id, invoice.relatedInvoiceId));

        if (related) {
          relatedInvoiceNumber = related.invoiceNumber;
          relatedInvoiceDate = related.issueDate;
          relatedFiscalCode = related.fiscalCode || undefined;
          relatedReceiptGlobalNo = related.receiptGlobalNo || undefined;
          relatedReceiptCounter = related.receiptCounter || undefined;
        }
      }

      // 3. Fetch Items with Products
      const invoiceItemsRows = await tx
        .select({
          item: invoiceItems,
          product: products
        })
        .from(invoiceItems)
        .leftJoin(products, eq(invoiceItems.productId, products.id))
        .where(eq(invoiceItems.invoiceId, invoice.id));

      const fullItems = invoiceItemsRows.map(r => ({
        ...r.item,
        product: r.product || undefined
      }));

      return {
        ...invoice,
        items: fullItems,
        customer,
        validationErrors: [],
        relatedInvoiceNumber,
        relatedInvoiceDate,
        relatedFiscalCode,
        relatedReceiptGlobalNo,
        relatedReceiptCounter
      } as Invoice;
    });
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice> & { items?: any[] }): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      // 1. Update invoice details
      const { items, ...invoiceData } = data;
      const [updated] = await tx
        .update(invoices)
        .set(invoiceData)
        .where(eq(invoices.id, id))
        .returning();

      if (!updated) throw new Error("Invoice not found");

      // 2. If items provided, replace them
      if (data.items) {
        // Delete existing items
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

        // Insert new items
        await tx.insert(invoiceItems).values(
          data.items.map(item => ({
            ...item,
            invoiceId: id
          }))
        );
      }

      return updated;
    });
  }

  async fiscalizeInvoice(id: number, fiscalData: {
    fiscalCode: string;
    qrCodeData: string;
    fiscalSignature?: string;
    fiscalDayNo?: number;
    receiptCounter?: number;
    receiptGlobalNo?: number;
    syncedWithFdms?: boolean;
    fdmsStatus?: string;
    submissionId?: string;
    validationStatus?: string;
    lastValidationAttempt?: Date;
  }): Promise<Invoice> {
    const { syncedWithFdms = true, fdmsStatus = "issued", validationStatus, lastValidationAttempt, submissionId, ...rest } = fiscalData;

    await db
      .update(invoices)
      .set({
        ...rest,
        submissionId,
        syncedWithFdms,
        fdmsStatus,
        validationStatus,
        lastValidationAttempt,
        status: syncedWithFdms ? "issued" : "draft"
      })
      .where(eq(invoices.id, id));


    // Return full invoice with items for the receipt
    const fullInvoice = await this.getInvoice(id);
    if (!fullInvoice) throw new Error("Invoice not found after fiscalization");
    return fullInvoice as Invoice;
  }

  async createValidationErrors(errors: Array<{ invoiceId: number; errorCode: string; errorMessage: string; errorColor: string; requiresPreviousReceipt: boolean }>): Promise<void> {
    if (errors.length === 0) return;

    // Import validationErrors table
    const { validationErrors } = await import("../shared/schema.js");

    // Clear existing validation errors for this invoice
    await db.delete(validationErrors).where(eq(validationErrors.invoiceId, errors[0].invoiceId));

    // Insert new validation errors
    await db.insert(validationErrors).values(
      errors.map(error => ({
        invoiceId: error.invoiceId,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
        errorColor: error.errorColor as any,
        requiresPreviousReceipt: error.requiresPreviousReceipt
      }))
    );
  }

  async lockInvoice(id: number, userId: string): Promise<boolean> {
    // Check if locked by someone else and lock is fresh (< 5 mins)
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!existing) return false;

    if (existing.lockedBy && existing.lockedBy !== userId) {
      const lockTime = new Date(existing.lockedAt!).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (lockTime > fiveMinutesAgo) {
        return false; // Still locked by someone else
      }
    }

    // Acquire lock
    const [locked] = await db
      .update(invoices)
      .set({ lockedBy: userId, lockedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    return !!locked;
  }

  async unlockInvoice(id: number, userId: string): Promise<void> {
    await db
      .update(invoices)
      .set({ lockedBy: null, lockedAt: null })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.lockedBy, userId)
        )
      );
  }

  /**
   * Atomically increments both receipt counters in a single UPDATE...RETURNING.
   * This is the only safe way to claim numbers — no two concurrent calls can
   * get the same pair because Postgres serialises the row-level update.
   */
  async claimNextReceiptNumbers(companyId: number): Promise<{ receiptGlobalNo: number; receiptCounter: number }> {
    const [updated] = await db
      .update(companies)
      .set({
        lastReceiptGlobalNo: sql`${companies.lastReceiptGlobalNo} + 1`,
        dailyReceiptCount: sql`${companies.dailyReceiptCount} + 1`,
      })
      .where(eq(companies.id, companyId))
      .returning({
        receiptGlobalNo: companies.lastReceiptGlobalNo,
        receiptCounter: companies.dailyReceiptCount,
      });

    if (!updated) throw new Error(`Company ${companyId} not found when claiming receipt numbers`);
    return { receiptGlobalNo: updated.receiptGlobalNo!, receiptCounter: updated.receiptCounter! };
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    // Check if we are switching environment to production
    if (data.zimraEnvironment === 'production') {
      const current = await this.getCompany(id);
      if (current && current.zimraEnvironment !== 'production') {
        console.log(`[ZIMRA] Environment switch to PRODUCTION for company ${id}. Performing full cleanup.`);

        // 1. Reset global counters
        data.lastReceiptGlobalNo = 0;
        data.dailyReceiptCount = 0;
        data.lastFiscalHash = null;

        // 2. Delete all test data associated with the company
        try {
          // Get all invoice IDs for this company
          const companyInvoices = await db
            .select({ id: invoices.id })
            .from(invoices)
            .where(eq(invoices.companyId, id));

          const invoiceIds = companyInvoices.map(inv => inv.id);

          if (invoiceIds.length > 0) {
            // Delete related records first due to foreign key constraints
            await db.delete(invoiceItems).where(sql`${invoiceItems.invoiceId} IN ${invoiceIds}`);
            await db.delete(validationErrors).where(sql`${validationErrors.invoiceId} IN ${invoiceIds}`);
            await db.delete(payments).where(sql`${payments.invoiceId} IN ${invoiceIds}`);

            // Finally delete the invoices themselves
            await db.delete(invoices).where(eq(invoices.companyId, id));
            console.log(`[ZIMRA] Successfully deleted ${invoiceIds.length} test invoices and related data for company ${id}.`);
          }
        } catch (cleanupErr) {
          console.error(`[ZIMRA] Error during production cleanup for company ${id}:`, cleanupErr);
          // We continue with the update even if cleanup fails, but log the error
        }
      }
    }

    const [updated] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async getTaxTypes(companyId?: number): Promise<TaxType[]> {
    if (companyId) {
      return await db
        .select()
        .from(taxTypes)
        .where(or(eq(taxTypes.companyId, companyId), isNull(taxTypes.companyId)))
        .orderBy(taxTypes.rate);
    }
    return await db.select().from(taxTypes).orderBy(taxTypes.rate);
  }

  async createTaxType(taxType: InsertTaxType & { companyId: number }): Promise<TaxType> {
    const [newTaxType] = await db.insert(taxTypes).values({
      ...taxType,
      rate: taxType.rate.toString()
    }).returning();
    return newTaxType;
  }

  async updateTaxType(id: number, companyId: number, taxType: Partial<InsertTaxType>): Promise<TaxType | undefined> {
    const updateData = { ...taxType };
    if (updateData.rate !== undefined) {
      updateData.rate = updateData.rate.toString();
    }
    const [updated] = await db
      .update(taxTypes)
      .set(updateData as any)
      .where(and(eq(taxTypes.id, id), eq(taxTypes.companyId, companyId)))
      .returning();
    return updated;
  }

  async getTaxCategories(companyId?: number): Promise<TaxCategory[]> {
    if (companyId) {
      return await db
        .select()
        .from(taxCategories)
        .where(or(eq(taxCategories.companyId, companyId), isNull(taxCategories.companyId)));
    }
    return await db.select().from(taxCategories);
  }

  async createTaxCategory(category: InsertTaxCategory & { companyId: number }): Promise<TaxCategory> {
    const [newCategory] = await db.insert(taxCategories).values(category).returning();
    return newCategory;
  }

  async updateTaxCategory(id: number, companyId: number, category: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined> {
    const [updated] = await db.update(taxCategories).set(category).where(and(eq(taxCategories.id, id), eq(taxCategories.companyId, companyId))).returning();
    return updated;
  }


  async getCurrencies(companyId: number): Promise<Currency[]> {
    return await db.select().from(currencies).where(eq(currencies.companyId, companyId)).orderBy(currencies.id);
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    // Ensure exchangeRate is string for decimal column
    const data = {
      ...currency,
      exchangeRate: currency.exchangeRate ? String(currency.exchangeRate) : "1.000000"
    }
    const [newCurrency] = await db.insert(currencies).values(data).returning();
    return newCurrency;
  }

  async updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency> {
    const updateData = { ...currency };
    if (updateData.exchangeRate !== undefined) {
      updateData.exchangeRate = updateData.exchangeRate.toString();
    }
    const [updated] = await db
      .update(currencies)
      .set(updateData as any)
      .where(eq(currencies.id, id))
      .returning();
    return updated;
  }

  async deleteCurrency(id: number): Promise<void> {
    await db.delete(currencies).where(eq(currencies.id, id));
  }
  // Tax Sync
  async syncTaxTypes(companyId: number, zimraTaxes: any[]): Promise<TaxType[]> {
    return await db.transaction(async (tx) => {
      // Delete existing tax types for THIS company only
      await tx.delete(taxTypes).where(eq(taxTypes.companyId, companyId));

      const results: TaxType[] = [];

      for (const zTax of zimraTaxes) {
        if (!zTax.taxID) continue;

        // Default to 0 if taxPercent is missing (e.g. for Exempt)
        const percent = zTax.taxPercent !== undefined ? zTax.taxPercent : 0;
        const taxRate = percent.toFixed(2);
        const zimraCode = zTax.taxCode || zTax.taxName?.substring(0, 1).toUpperCase() || "V";
        const code = zTax.taxCode ? `VAT-${zTax.taxCode}` : `VAT-${zTax.taxID}`;
        const taxName = zTax.taxName || `VAT ${percent}%`;

        // Use ZIMRA validFrom or current date, formatted for SQL DATE (YYYY-MM-DD)
        const effectiveFrom = (zTax.validFrom || new Date().toISOString()).split('T')[0];

        // Create new tax type
        const [created] = await tx.insert(taxTypes).values({
          companyId: companyId,
          code: code,
          name: taxName,
          rate: taxRate,
          description: `ZIMRA Tax Level ${zTax.taxID} (${zTax.taxName})`,
          zimraTaxId: zTax.taxID.toString(),
          zimraCode: zimraCode, // Store A, B, C etc.
          effectiveFrom: effectiveFrom,
          isActive: true
        }).returning();

        results.push(created);
      }
      return results;
    });
  }

  // User Management
  async getCompanyUsers(companyId: number): Promise<(User & { role: string })[]> {
    const result = await db
      .select({
        user: users,
        role: companyUsers.role
      })
      .from(companyUsers)
      .innerJoin(users, eq(companyUsers.userId, users.id))
      .where(eq(companyUsers.companyId, companyId));

    return result.map(({ user, role }) => ({ ...user, role: role || "member" }));
  }

  async addUserToCompany(userId: string, companyId: number, role: string): Promise<void> {
    await db.insert(companyUsers).values({
      userId,
      companyId,
      role
    });
  }

  async updateUserRole(userId: string, companyId: number, role: string): Promise<void> {
    await db
      .update(companyUsers)
      .set({ role })
      .where(and(eq(companyUsers.userId, userId), eq(companyUsers.companyId, companyId)));
  }

  async removeUserFromCompany(userId: string, companyId: number): Promise<void> {
    await db
      .delete(companyUsers)
      .where(and(eq(companyUsers.userId, userId), eq(companyUsers.companyId, companyId)));
  }

  async getCompanyUserRole(userId: string, companyId: number): Promise<string | undefined> {
    const [result] = await db
      .select({ role: companyUsers.role })
      .from(companyUsers)
      .where(and(eq(companyUsers.userId, userId), eq(companyUsers.companyId, companyId)));
    return result?.role || undefined;
  }

  // Analytics
  async getCompanyStats(companyId: number) {
    const companyInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
    const companyCustomers = await db.select().from(customers).where(eq(customers.companyId, companyId));

    const totalRevenue = companyInvoices
      .filter(i => (i.status === 'paid' || i.status === 'issued') && i.transactionType !== 'CreditNote')
      .reduce((sum, inv) => {
        // Normalize to base (USD) using the exchange rate at the time of invoice
        const amount = Number(inv.total) / Number(inv.exchangeRate || 1);
        return sum + amount;
      }, 0);

    const pendingAmount = companyInvoices
      .filter(i => i.status === 'issued' && i.transactionType !== 'CreditNote')
      .reduce((sum, inv) => {
        const amount = Number(inv.total) / Number(inv.exchangeRate || 1);
        return sum + amount;
      }, 0);

    // Subtract Credit Notes if any (though usually CNs are separate, let's be safe)
    const totalCNs = companyInvoices
      .filter(i => (i.status === 'paid' || i.status === 'issued') && i.transactionType === 'CreditNote')
      .reduce((sum, inv) => {
        const amount = Number(inv.total) / Number(inv.exchangeRate || 1);
        return sum + amount;
      }, 0);

    // Calculate Pending Credit Notes (Issued but not paid/cancelled) to subtract from Pending Amount
    const pendingCNs = companyInvoices
      .filter(i => i.status === 'issued' && i.transactionType === 'CreditNote')
      .reduce((sum, inv) => {
        const amount = Number(inv.total) / Number(inv.exchangeRate || 1);
        return sum + amount;
      }, 0);

    const finalRevenue = totalRevenue - totalCNs;
    const finalPending = pendingAmount - pendingCNs;

    return {
      totalRevenue: Math.round(finalRevenue * 100) / 100,
      pendingAmount: Math.round(finalPending * 100) / 100,
      invoicesCount: companyInvoices.filter(i => i.status !== 'cancelled' && i.status !== 'draft' && i.transactionType !== 'CreditNote').length,
      customersCount: companyCustomers.length
    };
  }

  async getRevenueOverTime(companyId: number, days: number = 30) {
    const companyInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const dailyMap = new Map<string, number>();

    companyInvoices.forEach(inv => {
      if ((inv.status === 'paid' || inv.status === 'issued') && inv.issueDate && new Date(inv.issueDate) >= cutoff) {
        const dateKey = new Date(inv.issueDate).toISOString().split('T')[0];
        // Normalize to base (USD)
        const amount = Number(inv.total) / Number(inv.exchangeRate || 1);
        const current = dailyMap.get(dateKey) || 0;

        if (inv.transactionType === 'CreditNote') {
          dailyMap.set(dateKey, current - amount);
        } else {
          dailyMap.set(dateKey, current + amount);
        }
      }
    });

    const result = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    return result;
  }

  async calculateFiscalCounters(companyId: number, fiscalDayNo: number): Promise<FiscalDayCounter[]> {
    const dayInvoicesInfo = await db
      .select({
        invoice: invoices,
        item: invoiceItems
      })
      .from(invoices)
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(and(
        eq(invoices.companyId, companyId),
        eq(invoices.fiscalDayNo, fiscalDayNo),
        eq(invoices.syncedWithFdms, true) // ONLY COUNT SYNCED INVOICES!
      ));

    const countersMap = new Map<string, any>();

    const getCounter = (key: string, type: string, currency: string, taxPercent: number, taxID: number, moneyType: string | null = null) => {
      // Determine distinct "Exempt" status via DB lookup or fallback
      const isExempt = taxID === 1;

      if (!countersMap.has(key)) {
        const isBalanceCounter = type === 'BalanceByMoneyType';
        countersMap.set(key, {
          fiscalCounterType: type,
          fiscalCounterCurrency: currency,
          // Only include tax percent/ID for non-balance counters
          //RCPT016: "In case of exempt which does not send tax percent value"
          ...(!isExempt && !isBalanceCounter ? { fiscalCounterTaxPercent: taxPercent } : {}),
          ...(!isBalanceCounter ? { fiscalCounterTaxID: taxID } : {}),
          ...(moneyType ? { fiscalCounterMoneyType: moneyType } : {}),
          fiscalCounterValue: 0
        });
      }
      return countersMap.get(key);
    };

    // Pre-fetch tax types for the company once
    const dbTaxTypes = await this.getTaxTypes(companyId);

    for (const row of dayInvoicesInfo) {
      if (!row.invoice || !row.item) continue;

      const inv = row.invoice;
      const item = row.item;
      const currency = inv.currency || "USD";
      const taxPercent = Number(item.taxRate);

      // Look up taxID from database taxTypes using strict ID match first
      let matchingTax: TaxType | undefined;

      if (item.taxTypeId) {
        matchingTax = dbTaxTypes.find(t => t.id === item.taxTypeId);
      }

      // Fallback to rate matching if not found by ID
      if (!matchingTax) {
        matchingTax = dbTaxTypes.find(t =>
          Math.abs(Number(t.rate) - taxPercent) < 0.01
        );
      }

      // ZIMRA Tax ID Mapping - Dynamic Lookup
      let taxID = 0;

      if (matchingTax?.zimraTaxId) {
        taxID = parseInt(matchingTax.zimraTaxId);

        // Refined check for 0% ambiguity (if matchedTax is not ID 1 but item might be exempt)
        if (taxPercent === 0 && taxID !== 1) {
          const isExemptIntent = (item.description || '').toLowerCase().includes('exempt');
          if (isExemptIntent) {
            const realExempt = dbTaxTypes.find(t => t.zimraTaxId === "1" || t.name.toLowerCase().includes('exempt'));
            if (realExempt && realExempt.zimraTaxId) {
              taxID = parseInt(realExempt.zimraTaxId);
            }
          }
        }
      } else {
        // Fallback by Name if ID is missing from matchingTax or matchingTax itself is missing
        const name = matchingTax?.name?.toLowerCase() || '';
        const desc = (item.description || '').toLowerCase();

        if (name.includes('exempt') || desc.includes('exempt')) {
          const exemptTax = dbTaxTypes.find(t => t.name.toLowerCase().includes('exempt') && t.zimraTaxId);
          if (exemptTax) taxID = parseInt(exemptTax.zimraTaxId!);
          else taxID = 1; // Direct fallback to ID 1 for Exempt
        } else if (name.includes('zero') || name.includes('0%') || taxPercent === 0) {
          const zeroTax = dbTaxTypes.find(t => (t.name.toLowerCase().includes('zero') || t.name.includes('0%')) && t.zimraTaxId);
          if (zeroTax) taxID = parseInt(zeroTax.zimraTaxId!);
          else taxID = 2; // Direct fallback to ID 2 for Zero Rated
        } else {
          // Standard matches
          const stdTax = dbTaxTypes.find(t => (t.name.toLowerCase().includes('standard') || t.name.toLowerCase().includes('vat')) && t.zimraTaxId);
          if (stdTax) taxID = parseInt(stdTax.zimraTaxId!);
          else taxID = 3; // Direct fallback to ID 3 for Standard
        }
      }

      // Final safety fallback
      if (taxID === 0) {
        if (taxPercent === 0) taxID = 2;
        else taxID = 3;
      }

      const type = inv.transactionType || "FiscalInvoice";
      const valLineTotal = Number(item.lineTotal);
      let amountWithTax = valLineTotal;
      let taxAmt = 0;

      if (!inv.taxInclusive) {
        // net + tax
        taxAmt = valLineTotal * (taxPercent / 100);
        amountWithTax = valLineTotal + taxAmt;
      } else {
        // total - net
        taxAmt = valLineTotal - (valLineTotal / (1 + taxPercent / 100));
        amountWithTax = valLineTotal;
      }

      // Round taxAmt and amountWithTax to 2 decimals for accuracy
      taxAmt = Math.round(taxAmt * 100) / 100;
      amountWithTax = Math.round(amountWithTax * 100) / 100;

      // Handle sign based on transaction type
      // ZIMRA counters should ALWAYS BE POSITIVE ACCUMULATORS!
      // Even Credit/Debit notes are reported as positive quantities of those types.
      amountWithTax = Math.abs(amountWithTax);
      taxAmt = Math.abs(taxAmt);

      if (type === 'FiscalInvoice' || type === 'Invoice') {
        const keySale = `SaleByTax-${currency}-${taxPercent}-${taxID}`;
        const cSale = getCounter(keySale, 'SaleByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `SaleTaxByTax-${currency}-${taxPercent}-${taxID}`;
        const cTax = getCounter(keyTax, 'SaleTaxByTax', currency, taxPercent, taxID);
        cTax.fiscalCounterValue += taxAmt;
      } else if (type === 'CreditNote') {
        const keySale = `CreditNoteByTax-${currency}-${taxPercent}-${taxID}`;
        const cSale = getCounter(keySale, 'CreditNoteByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `CreditNoteTaxByTax-${currency}-${taxPercent}-${taxID}`;
        const cTax = getCounter(keyTax, 'CreditNoteTaxByTax', currency, taxPercent, taxID);
        cTax.fiscalCounterValue += taxAmt;
      } else if (type === 'DebitNote') {
        const keySale = `DebitNoteByTax-${currency}-${taxPercent}-${taxID}`;
        const cSale = getCounter(keySale, 'DebitNoteByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `DebitNoteTaxByTax-${currency}-${taxPercent}-${taxID}`;
        const cTax = getCounter(keyTax, 'DebitNoteTaxByTax', currency, taxPercent, taxID);
        cTax.fiscalCounterValue += taxAmt;
      }
    }

    const uniqueInvoices = new Map();
    dayInvoicesInfo.forEach(r => {
      if (r.invoice) uniqueInvoices.set(r.invoice.id, r.invoice);
    });

    for (const inv of uniqueInvoices.values()) {
      const currency = inv.currency || "USD";
      const method = (inv.paymentMethod || "CASH").toUpperCase();
      let moneyType = "Other"; // Default to Other

      if (['CARD', 'SWIPE', 'POS'].includes(method)) moneyType = "Card";
      else if (['ECOCASH', 'MOBILE', 'MOBILEWALLET', 'ONE_MONEY', 'TELE_CASH', 'INNBUCKS'].includes(method)) moneyType = "MobileWallet";
      else if (['EFT', 'RTGS', 'TRANSFER', 'ZIPIT', 'BANKTRANSFER'].includes(method)) moneyType = "BankTransfer";
      else if (method === 'CASH') moneyType = "Cash";
      const keyBal = `BalanceByMoneyType-${currency}-${moneyType}`;
      // Fix: Ensure we correctly create the counter for this money type
      const cBal = getCounter(keyBal, 'BalanceByMoneyType', currency, 0, 0, moneyType);

      let amount = Number(inv.total);
      if (inv.transactionType === 'CreditNote') {
        amount = -Math.abs(amount);
      } else {
        amount = Math.abs(amount);
      }
      cBal.fiscalCounterValue += amount;
    }

    return Array.from(countersMap.values()).map(c => ({
      ...c,
      fiscalCounterValue: Math.round(c.fiscalCounterValue * 100) / 100
    }));
  }

  async getZReportData(companyId: number, fiscalDayNo: number) {
    const company = await this.getCompany(companyId);
    if (!company) throw new Error("Company not found");

    const invoicesInDay = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.fiscalDayNo, fiscalDayNo)));

    const counters = await this.calculateFiscalCounters(companyId, fiscalDayNo);

    // Group document quantities by currency and type
    const docStatsByCurrency = new Map<string, any>();

    const getDocStat = (currency: string) => {
      if (!docStatsByCurrency.has(currency)) {
        docStatsByCurrency.set(currency, {
          currency,
          invoices: { quantity: 0, total: 0 },
          creditNotes: { quantity: 0, total: 0 },
          debitNotes: { quantity: 0, total: 0 },
          totalDocuments: { quantity: 0, total: 0 }
        });
      }
      return docStatsByCurrency.get(currency);
    };

    invoicesInDay.forEach(inv => {
      const currency = inv.currency || "USD";
      const stats = getDocStat(currency);
      const type = inv.transactionType || "FiscalInvoice";
      const amount = Number(inv.total);

      if (type === 'FiscalInvoice' || type === 'Invoice') {
        stats.invoices.quantity++;
        stats.invoices.total += amount;
      } else if (type === 'CreditNote') {
        stats.creditNotes.quantity++;
        stats.creditNotes.total += amount; // Amount is expected to be negative for CN
      } else if (type === 'DebitNote') {
        stats.debitNotes.quantity++;
        stats.debitNotes.total += amount;
      }

      stats.totalDocuments.quantity++;
      stats.totalDocuments.total += amount;
    });

    // Round stats
    for (const stats of docStatsByCurrency.values()) {
      stats.invoices.total = Math.round(stats.invoices.total * 100) / 100;
      stats.creditNotes.total = Math.round(stats.creditNotes.total * 100) / 100;
      stats.debitNotes.total = Math.round(stats.debitNotes.total * 100) / 100;
      stats.totalDocuments.total = Math.round(stats.totalDocuments.total * 100) / 100;
    }

    return {
      company,
      fiscalDayNo,
      openedAt: company.fiscalDayOpenedAt,
      closedAt: new Date(), // If this is called during close, it's roughly now
      counters,
      docStats: Array.from(docStatsByCurrency.values()).sort((a, b) => a.currency.localeCompare(b.currency))
    };
  }

  async getNextInvoiceNumber(companyId: number, prefix: string = 'INV'): Promise<string> {
    // We strictly use client-side filtering for simplicity and safety against mixed formats
    // Get all invoice numbers for the company
    const allInvoices = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.companyId, companyId));

    // Filter and parse
    const relevant = allInvoices
      .filter(i => i.invoiceNumber.startsWith(`${prefix}-`))
      .map(i => {
        const parts = i.invoiceNumber.split('-');
        // handle cases like INV-123, INV-001
        const numPart = parts[1];
        return numPart ? parseInt(numPart) : 0;
      })
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);

    const nextNum = relevant.length > 0 ? relevant[0] + 1 : 1;

    // Pad with leading zeros, e.g., 001
    return `${prefix}-${nextNum.toString().padStart(3, '0')}`;
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayments(invoiceId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.paymentDate));
  }

  async getReceivablesAging(companyId: number, currency: string = 'USD'): Promise<{
    total: number;
    current: number;
    days1_15: number;
    days16_30: number;
    days31_45: number;
    above45: number;
  }> {
    const allInvoices = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        eq(invoices.currency, currency),
        ne(invoices.status, "draft"),
        ne(invoices.status, "cancelled")
      ));

    const now = new Date();
    const result = {
      total: 0,
      current: 0,
      days1_15: 0,
      days16_30: 0,
      days31_45: 0,
      above45: 0,
    };

    for (const inv of allInvoices) {
      const total = Number(inv.total);
      
      // Calculate paid amount from payments for this invoice
      const invoicePayments = await db.select({ amount: payments.amount })
        .from(payments)
        .where(eq(payments.invoiceId, inv.id));
      const paid = invoicePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      const balance = total - paid;

      if (balance <= 0) continue;

      result.total += balance;

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate || now);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        result.current += balance;
      } else if (diffDays <= 15) {
        result.days1_15 += balance;
      } else if (diffDays <= 30) {
        result.days16_30 += balance;
      } else if (diffDays <= 45) {
        result.days31_45 += balance;
      } else {
        result.above45 += balance;
      }
    }

    return result;
  }

  async getFiscalYearStats(companyId: number, currency: string = 'USD'): Promise<{
    totalSales: number;
    totalReceipts: number;
    totalExpenses: number;
    monthlyData: { month: string; sales: number; expenses: number }[];
  }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const yearInvoices = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        eq(invoices.currency, currency),
        gte(invoices.issueDate, startOfYear),
        lte(invoices.issueDate, endOfYear),
        ne(invoices.status, "draft"),
        ne(invoices.status, "cancelled")
      ));

    const yearPayments = await db.select()
      .from(payments)
      .where(and(
        eq(payments.companyId, companyId),
        eq(payments.currency, currency),
        gte(payments.paymentDate, startOfYear),
        lte(payments.paymentDate, endOfYear)
      ));

    const yearExpenses = await db.select()
      .from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        eq(expenses.currency, currency),
        gte(expenses.expenseDate, startOfYear),
        lte(expenses.expenseDate, endOfYear)
      ));

    let totalSales = 0;
    let totalReceipts = 0;
    let totalExpenses = 0;

    const monthlyMap: Record<string, { sales: number; expenses: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach(m => {
      monthlyMap[`${m} ${currentYear}`] = { sales: 0, expenses: 0 };
    });

    for (const inv of yearInvoices) {
      const amount = Number(inv.total);
      totalSales += amount;
      const monthDate = inv.issueDate ? new Date(inv.issueDate) : now;
      const month = months[monthDate.getMonth()];
      const key = `${month} ${currentYear}`;
      if (monthlyMap[key]) monthlyMap[key].sales += amount;
    }

    for (const pay of yearPayments) {
      totalReceipts += Number(pay.amount);
    }

    for (const exp of yearExpenses) {
      const amount = Number(exp.amount);
      totalExpenses += amount;
      const monthDate = exp.expenseDate ? new Date(exp.expenseDate) : now;
      const month = months[monthDate.getMonth()];
      const key = `${month} ${currentYear}`;
      if (monthlyMap[key]) monthlyMap[key].expenses += amount;
    }

    const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      sales: data.sales,
      expenses: data.expenses,
    }));

    // Ensure chronological order
    monthlyData.sort((a, b) => {
      const monthA = months.indexOf(a.month.split(" ")[0]);
      const monthB = months.indexOf(b.month.split(" ")[0]);
      return monthA - monthB;
    });

    return {
      totalSales,
      totalReceipts,
      totalExpenses,
      monthlyData,
    };
  }

  async getPayment(id: number): Promise<(Payment & { invoice?: Invoice; customer?: Customer; company?: Company }) | undefined> {
    const [result] = await db.select({
      payment: payments,
      invoice: invoices,
      customer: customers,
      company: companies
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(companies, eq(payments.companyId, companies.id))
    .where(eq(payments.id, id));

    if (!result) return undefined;

    return {
      ...result.payment,
      invoice: result.invoice || undefined,
      customer: result.customer || undefined,
      company: result.company || undefined
    };
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // Reports - Customer Statement
  async getStatementData(customerId: number, startDate: Date, endDate: Date, currency?: string): Promise<{
    customer: Customer;
    openingBalance: number;
    closingBalance: number;
    transactions: any[];
  }> {
    const customer = (await db.select().from(customers).where(eq(customers.id, customerId)))[0];
    if (!customer) throw new Error("Customer not found");

    // Fetch all invoices (and CNs) for this customer
    let userInvoicesQuery = db.select().from(invoices).where(eq(invoices.customerId, customerId));
    const userInvoices = await userInvoicesQuery;

    // Fetch all payments for these invoices in a single query
    const invoiceIds = userInvoices.map(inv => inv.id);
    let userPayments: Payment[] = [];
    if (invoiceIds.length > 0) {
      userPayments = await db.select().from(payments).where(inArray(payments.invoiceId, invoiceIds));
      // Filter by currency if provided
      if (currency) {
        const currencyInvoiceIds = new Set(userInvoices.filter(inv => inv.currency === currency).map(inv => inv.id));
        userPayments = userPayments.filter(p => p.invoiceId && currencyInvoiceIds.has(p.invoiceId));
      }
    }

    // Filter invoices by currency if provided
    const filteredInvoices = currency
      ? userInvoices.filter(inv => inv.currency === currency)
      : userInvoices;

    // Sort all transactions by date
    // Normalize dates — end includes the full day
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Calculate Opening Balance (Transactions < start)
    let openingBalance = 0;

    // Process Invoices/CNs
    for (const inv of filteredInvoices) {
      if (!inv.issueDate) continue; // Skip if no issue date
      const date = new Date(inv.issueDate);
      // Only issued/paid/fiscalized count towards balance? 
      // Draft/Cancelled do not. 
      if (['draft', 'cancelled'].includes(inv.status || '')) continue;

      const amount = Number(inv.total);

      if (date < start) {
        if (inv.transactionType === 'CreditNote') {
          openingBalance -= amount;
        } else {
          openingBalance += amount;
        }
      }
    }

    // Process Payments
    for (const pay of userPayments) {
      const date = new Date(pay.paymentDate);
      if (date < start) {
        openingBalance -= Number(pay.amount);
      }
    }

    // Build Transaction List (start <= date <= end)
    const transactions: any[] = [];

    // 1. Invoices & CNs
    for (const inv of filteredInvoices) {
      if (!inv.issueDate) continue; // Skip if no issue date
      const date = new Date(inv.issueDate);
      if (['draft', 'cancelled'].includes(inv.status || '')) continue;

      if (date >= start && date <= end) {
        transactions.push({
          date: date,
          type: inv.transactionType === 'CreditNote' ? 'Credit Note' : 'Invoice',
          reference: inv.invoiceNumber,
          description: inv.transactionType === 'CreditNote' ? 'Credit Note Issued' : 'Invoice Issued',
          debit: inv.transactionType !== 'CreditNote' ? Number(inv.total) : 0,
          credit: inv.transactionType === 'CreditNote' ? Number(inv.total) : 0,
          id: inv.id
        });
      }
    }

    // 2. Payments
    for (const pay of userPayments) {
      const date = new Date(pay.paymentDate);
      if (date >= start && date <= end) {
        transactions.push({
          date: date,
          type: 'Payment',
          reference: pay.reference || 'PAYMENT',
          description: `Payment for ${userInvoices.find(i => i.id === pay.invoiceId)?.invoiceNumber || 'Invoice'}`,
          debit: 0,
          credit: Number(pay.amount),
          id: pay.id
        });
      }
    }

    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate Running Balance
    let runningBalance = openingBalance;
    const finalTransactions = transactions.map(t => {
      runningBalance += (t.debit - t.credit);
      return { ...t, balance: runningBalance };
    });

    return {
      customer,
      openingBalance,
      closingBalance: runningBalance,
      transactions: finalTransactions
    };
  }

  async getPaymentsReport(companyId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const results = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        reference: payments.reference,
        notes: payments.notes,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceTotal: invoices.total,
        invoicePaidAmount: sql<string>`(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ${invoices.id})`,
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(payments.companyId, companyId))
      .orderBy(desc(payments.paymentDate));

    // Filter by date range in JS to avoid timezone/type casting issues
    const filtered = results.filter(r => {
      if (!r.paymentDate) return true;
      const d = new Date(r.paymentDate);
      return d >= startDate && d <= endDate;
    });

    console.log(`[getPaymentsReport] companyId=${companyId} → ${results.length} total, ${filtered.length} in range (${startDate.toISOString()} – ${endDate.toISOString()})`);
    return filtered;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(companyId: number, limit: number = 50): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Recurring Invoices
  async getRecurringInvoices(companyId: number): Promise<RecurringInvoice[]> {
    return await db.select().from(recurringInvoices).where(eq(recurringInvoices.companyId, companyId));
  }

  async getDueRecurringInvoices(): Promise<RecurringInvoice[]> {
    const now = new Date();
    return await db.select().from(recurringInvoices).where(
      and(
        eq(recurringInvoices.status, "active"),
        lte(recurringInvoices.nextRunDate, now)
      )
    );
  }

  async createRecurringInvoice(data: InsertRecurringInvoice): Promise<RecurringInvoice> {
    const [recurring] = await db.insert(recurringInvoices).values(data).returning();
    return recurring;
  }

  async updateRecurringInvoice(id: number, data: Partial<InsertRecurringInvoice>): Promise<RecurringInvoice> {
    const [updated] = await db.update(recurringInvoices).set(data).where(eq(recurringInvoices.id, id)).returning();
    return updated;
  }

  async deleteRecurringInvoice(id: number): Promise<void> {
    await db.delete(recurringInvoices).where(eq(recurringInvoices.id, id));
  }

  // Quotations
  async getQuotations(companyId: number): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.companyId, companyId)).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: number): Promise<(Quotation & { items: QuotationItem[]; customer?: Customer }) | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    if (!quotation) return undefined;

    const [customer] = await db.select().from(customers).where(eq(customers.id, quotation.customerId));
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id));

    return { ...quotation, items, customer };
  }

  async createQuotation(data: InsertQuotation & { items: InsertQuotationItem[] }): Promise<Quotation> {
    return await db.transaction(async (tx) => {
      const { items, ...quotationData } = data;
      const [quotation] = await tx.insert(quotations).values({
        ...quotationData,
        quotationNumber: await this.getNextQuotationNumber(quotationData.companyId),
      }).returning();

      if (items.length > 0) {
        await tx.insert(quotationItems).values(
          items.map(item => ({ ...item, quotationId: quotation.id }))
        );
      }

      return quotation;
    });
  }

  async updateQuotation(id: number, data: Partial<InsertQuotation> & { items?: InsertQuotationItem[] }): Promise<Quotation> {
    return await db.transaction(async (tx) => {
      const { items, ...quotationData } = data;
      const [updated] = await tx
        .update(quotations)
        .set(quotationData)
        .where(eq(quotations.id, id))
        .returning();

      if (!updated) throw new Error("Quotation not found");

      if (items) {
        await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
        if (items.length > 0) {
          await tx.insert(quotationItems).values(
            items.map(item => ({ ...item, quotationId: id }))
          );
        }
      }

      return updated;
    });
  }

  async deleteQuotation(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
      await tx.delete(quotations).where(eq(quotations.id, id));
    });
  }

  async getNextQuotationNumber(companyId: number): Promise<string> {
    const allQuotes = await db
      .select({ quotationNumber: quotations.quotationNumber })
      .from(quotations)
      .where(eq(quotations.companyId, companyId));

    const relevant = allQuotes
      .filter(q => q.quotationNumber.startsWith("QT-"))
      .map(q => {
        const parts = q.quotationNumber.split("-");
        const numPart = parts[1];
        return numPart ? parseInt(numPart) : 0;
      })
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);

    const nextNum = relevant.length > 0 ? relevant[0] + 1 : 1;
    return `QT-${nextNum.toString().padStart(3, "0")}`;
  }

  async createZimraLog(log: InsertZimraLog): Promise<ZimraLog> {
    const [newL] = await db.insert(zimraLogs).values(log).returning();
    return newL;
  }

  async getZimraLogs(invoiceId: number): Promise<ZimraLog[]> {
    return await db.select().from(zimraLogs).where(eq(zimraLogs.invoiceId, invoiceId)).orderBy(desc(zimraLogs.createdAt));
  }

  async getCompanyZimraLogs(companyId: number, limit: number = 100): Promise<ZimraLog[]> {
    return await db.select()
      .from(zimraLogs)
      .where(eq(zimraLogs.companyId, companyId))
      .orderBy(desc(zimraLogs.createdAt))
      .limit(limit);
  }

  async resolveGreyErrors(companyId: number, fiscalDayNo: number, skipInvoiceId?: number): Promise<void> {
    const dayInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.fiscalDayNo, fiscalDayNo)))
      .orderBy(invoices.receiptCounter);

    // Find the end of the continuous synced chain (starting from 1)
    let chainCompleteUntil = 0;
    let expectedCounter = 1;
    for (const inv of dayInvoices) {
      if (inv.syncedWithFdms && inv.receiptCounter === expectedCounter) {
        chainCompleteUntil = inv.receiptCounter;
        expectedCounter++;
      } else {
        break; // Gap found (not synced or skip in sequence)
      }
    }

    if (chainCompleteUntil === 0) return;

    // "Heal" invoices that were "Grey" but are now preceding the broken part of the chain
    // Per ZIMRA Spec: "With each of the next received receipt, such 'Grey' receipt will be revalidated"
    for (const inv of dayInvoices) {
      // SKIP the invoice that was just submitted - we want to keep ZIMRA's explicit feedback for it
      if (skipInvoiceId && inv.id === skipInvoiceId) continue;

      // If it's within the completed part of the chain and has a validation status that needs re-checking
      if (inv.receiptCounter && inv.receiptCounter <= chainCompleteUntil &&
        (inv.validationStatus === 'grey' || inv.validationStatus === 'invalid' || inv.validationStatus === 'red')) {

        // Fetch current validation errors
        const errors = await db.select().from(validationErrors).where(eq(validationErrors.invoiceId, inv.id));
        const hasChainError = errors.some(e => e.requiresPreviousReceipt);

        if (hasChainError) {
          // Remove the chain-related errors locally (they are now resolved by the complete chain)
          await db.delete(validationErrors).where(and(
            eq(validationErrors.invoiceId, inv.id),
            eq(validationErrors.requiresPreviousReceipt, true)
          ));

          // Recalculate overall status from remaining errors (if any)
          const remainingErrors = await db.select().from(validationErrors)
            .where(eq(validationErrors.invoiceId, inv.id));

          let newStatus = 'valid';
          if (remainingErrors.length > 0) {
            // Priority: Red > Grey > Yellow
            if (remainingErrors.some(e => e.errorColor === 'Red')) newStatus = 'red';
            else if (remainingErrors.some(e => e.errorColor === 'Grey')) newStatus = 'grey';
            else if (remainingErrors.some(e => e.errorColor === 'Yellow')) newStatus = 'yellow';
          }

          await db.update(invoices).set({ validationStatus: newStatus }).where(eq(invoices.id, inv.id));
          console.log(`[ZIMRA] Auto-resolved Grey errors for Invoice #${inv.id} (${inv.invoiceNumber})`);
        }
      }
    }
  }

  async getInvoicesByFiscalDay(companyId: number, fiscalDayNo: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.fiscalDayNo, fiscalDayNo)));
  }

  // Subscriptions implementation
  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(data).returning();
    return subscription;
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getSubscriptionByReference(reference: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.paynowReference, reference));
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription> {
    const [updated] = await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async getActiveSubscriptionByDevice(companyId: number, deviceSerialNo: string, macAddress: string): Promise<Subscription | undefined> {
    const now = new Date();
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.deviceSerialNo, deviceSerialNo),
          eq(subscriptions.deviceMacAddress, macAddress),
          eq(subscriptions.status, "paid"),
          lte(subscriptions.startDate, now),
          sql`${subscriptions.endDate} >= ${now}`
        )
      )
      .limit(1);
    return subscription;
  }

  async getSubscriptionsByCompany(companyId: number): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.companyId, companyId))
      .orderBy(sql`${subscriptions.createdAt} desc`);
  }

  async hasActiveSubscriptionByMac(companyId: number, macAddress: string): Promise<boolean> {
    const now = new Date();
    const [subscription] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.deviceMacAddress, macAddress),
          eq(subscriptions.status, "paid"),
          lte(subscriptions.startDate, now),
          sql`${subscriptions.endDate} >= ${now}`
        )
      )
      .limit(1);
    return !!subscription;
  }

  // POS Shifting & Parking
  async getPosHolds(companyId: number, userId: string): Promise<PosHold[]> {
    return await db
      .select()
      .from(posHolds)
      .where(and(eq(posHolds.companyId, companyId), eq(posHolds.userId, userId)))
      .orderBy(desc(posHolds.createdAt));
  }

  async createPosHold(data: InsertPosHold): Promise<PosHold> {
    const [hold] = await db.insert(posHolds).values(data).returning();
    return hold;
  }

  async deletePosHold(id: number, userId: string): Promise<void> {
    await db.delete(posHolds).where(and(eq(posHolds.id, id), eq(posHolds.userId, userId)));
  }

  async getPosShifts(companyId: number, userId: string): Promise<PosShift[]> {
    return await db
      .select()
      .from(posShifts)
      .where(and(eq(posShifts.companyId, companyId), eq(posShifts.userId, userId)))
      .orderBy(desc(posShifts.startTime));
  }

  async getActivePosShift(companyId: number, userId: string): Promise<PosShift | undefined> {
    const [shift] = await db
      .select()
      .from(posShifts)
      .where(
        and(
          eq(posShifts.companyId, companyId),
          eq(posShifts.userId, userId),
          eq(posShifts.status, "open")
        )
      )
      .limit(1);
    return shift;
  }

  async createPosShift(data: InsertPosShift): Promise<PosShift> {
    const [shift] = await db.insert(posShifts).values(data).returning();
    return shift;
  }

  async updatePosShift(id: number, userId: string, data: Partial<PosShift>): Promise<PosShift> {
    const [updated] = await db
      .update(posShifts)
      .set(data)
      .where(and(eq(posShifts.id, id), eq(posShifts.userId, userId)))
      .returning();
    return updated;
  }


  async addCompanyUser(userId: string, companyId: number, role: string): Promise<void> {
    await db.insert(companyUsers).values({
      userId,
      companyId,
      role
    });
  }

  async removeCompanyUser(userId: string, companyId: number): Promise<void> {
    await db.delete(companyUsers)
      .where(and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.companyId, companyId)
      ));
  }

  // Reporting Implementations
  async getReportSummary(companyId: number, startDate: Date, endDate: Date): Promise<any> {
    const revenueResult = await db
      .select({
        total: sql<number>`sum(${invoices.total})`,
        count: count(invoices.id)
      })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate),
        ne(invoices.status, 'cancelled'),
        ne(invoices.status, 'draft')
      ));

    const pendingResult = await db
      .select({
        total: sql<number>`sum(${invoices.total})`
      })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        eq(invoices.status, 'pending'),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate)
      ));

    const customersResult = await db
      .select({
        count: count(customers.id)
      })
      .from(customers)
      .where(eq(customers.companyId, companyId));

    return {
      totalRevenue: Number(revenueResult[0]?.total || 0),
      invoicesCount: Number(revenueResult[0]?.count || 0),
      pendingAmount: Number(pendingResult[0]?.total || 0),
      customersCount: Number(customersResult[0]?.count || 0)
    };
  }

  async getRevenueChart(companyId: number, startDate: Date, endDate: Date): Promise<{ name: string; total: number }[]> {
    const result = await db
      .select({
        date: sql`date_trunc('day', ${invoices.issueDate})`,
        total: sql<number>`sum(${invoices.total})`
      })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate),
        ne(invoices.status, 'cancelled'),
        ne(invoices.status, 'draft')
      ))
      .groupBy(sql`date_trunc('day', ${invoices.issueDate})`)
      .orderBy(sql`date_trunc('day', ${invoices.issueDate})`);

    return result.map(r => ({
      name: format(new Date(r.date as string), 'MMM dd'),
      total: Number(r.total || 0)
    }));
  }

  async getSalesByPaymentMethod(companyId: number, startDate: Date, endDate: Date): Promise<{ method: string; total: number; count: number }[]> {
    const result = await db
      .select({
        method: invoices.paymentMethod,
        total: sql<number>`sum(${invoices.total})`,
        count: count(invoices.id)
      })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate),
        ne(invoices.status, 'cancelled'),
        ne(invoices.status, 'draft')
      ))
      .groupBy(invoices.paymentMethod);

    return result.map(r => ({
      method: r.method || "CASH",
      total: Number(r.total || 0),
      count: Number(r.count || 0)
    }));
  }

  async getSalesReport(companyId: number, startDate: Date, endDate: Date, cashierId?: string): Promise<any[]> {
    const filters = [
      eq(invoices.companyId, companyId),
      gte(invoices.issueDate, startDate),
      lte(invoices.issueDate, endDate)
    ];

    if (cashierId && cashierId !== 'all') {
      filters.push(eq(invoices.createdBy, cashierId));
    }

    const result = await db
      .select({
        invoice: invoices,
        customerName: customers.name,
        cashierName: users.username
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.createdBy, users.id))
      .where(and(...filters))
      .orderBy(desc(invoices.createdAt));

    return result.map(r => ({
      ...r.invoice,
      customerName: r.customerName,
      cashierName: r.cashierName || "System"
    }));
  }


  // Reporting Implementations
  async getSalesByCategory(companyId: number, startDate: Date, endDate: Date): Promise<{ category: string; totalSales: number; count: number }[]> {
    const result = await db
      .select({
        category: products.category,
        totalSales: sql<number>`sum(${invoiceItems.lineTotal})`,
        count: count(invoiceItems.id)
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate),
        ne(invoices.status, 'cancelled'),
        ne(invoices.status, 'draft')
      ))
      .groupBy(products.category)
      .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`));

    return result.map(r => ({
      category: r.category || "Uncategorized",
      totalSales: Number(r.totalSales || 0),
      count: Number(r.count || 0)
    }));
  }

  async getSalesByUser(companyId: number, startDate: Date, endDate: Date): Promise<{ userId: string; userName: string; totalSales: number; count: number }[]> {
    const result = await db
      .select({
        userId: invoices.createdBy,
        userName: users.username,
        totalSales: sql<number>`sum(${invoices.total})`,
        count: count(invoices.id)
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.createdBy, users.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, startDate),
        lte(invoices.issueDate, endDate),
        ne(invoices.status, 'cancelled'),
        ne(invoices.status, 'draft')
      ))
      .groupBy(invoices.createdBy, users.username);

    // After grouping in SQL, we might still have multiple null entries if they don't join to a user.
    // However, groupBy(invoices.createdBy) should handle the nulls as one group.
    
    return result.map(r => ({
      userId: r.userId || "system",
      userName: r.userName || "System",
      totalSales: Number(r.totalSales || 0),
      count: Number(r.count || 0)
    }));
  }

  async getProductPerformance(companyId: number, startDate: Date, endDate: Date, isPosOnly?: boolean): Promise<{ productId: number; productName: string; quantity: number; revenue: number }[]> {
    const conditions = [
      eq(invoices.companyId, companyId),
      gte(invoices.issueDate, startDate),
      lte(invoices.issueDate, endDate),
      ne(invoices.status, 'cancelled'),
      ne(invoices.status, 'draft')
    ];

    if (isPosOnly) {
      // isPosOnly is ignored now as requested to show all sales
    }

    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        quantity: sql<number>`sum(${invoiceItems.quantity})`,
        revenue: sql<number>`sum(${invoiceItems.lineTotal})`
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`));

    return result.map(r => ({
      productId: r.productId,
      productName: r.productName,
      quantity: Number(r.quantity || 0),
      revenue: Number(r.revenue || 0)
    }));
  }

  async getPosSales(
    companyId: number,
    startDate: Date,
    endDate: Date,
    cashierId?: string,
    paymentMethod?: string,
    status?: string,
    search?: string
  ): Promise<any[]> {
    const conditions = [
      eq(invoices.companyId, companyId),
      gte(invoices.issueDate, startDate),
      lte(invoices.issueDate, endDate)
    ] as any[];

    if (cashierId && cashierId !== 'all') {
      // Show sales created by this cashier, OR sales where createdBy is null 
      // (to support historical data visibility for the primary user/admin)
      conditions.push(or(eq(invoices.createdBy, cashierId), isNull(invoices.createdBy)) as any);
    }

    if (status && status !== 'all') {
      if (status === 'fiscalized') {
        conditions.push(eq(invoices.syncedWithFdms, true));
      } else if (status === 'pending') {
        conditions.push(eq(invoices.syncedWithFdms, false));
      } else {
        conditions.push(eq(invoices.status, status));
      }
    }

    if (search) {
      conditions.push(or(
        ilike(invoices.invoiceNumber, `%${search}%`),
        ilike(customers.name, `%${search}%`)
      ) as any);
    }

    const query = db
      .select({
        invoice: invoices,
        cashierName: users.username,
        customerName: customers.name
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.createdBy, users.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt));

    const results = await query;
    return results.map(r => ({
      ...r.invoice,
      cashierName: r.cashierName,
      customerName: r.customerName
    }));
  }

  // Product Categories Implementation
  async getProductCategories(companyId: number): Promise<ProductCategory[]> {
    return await db.select().from(productCategories).where(eq(productCategories.companyId, companyId)).orderBy(productCategories.name);
  }

  async createProductCategory(data: InsertProductCategory & { companyId: number }): Promise<ProductCategory> {
    const [category] = await db.insert(productCategories).values(data).returning();
    return category;
  }

  async deleteProductCategory(id: number, companyId: number): Promise<void> {
    await db.delete(productCategories).where(and(eq(productCategories.id, id), eq(productCategories.companyId, companyId)));
  }

  async clearTestInvoices(companyId: number): Promise<number> {
    return await db.transaction(async (tx) => {
      // 1. Identify IDs of invoices to be deleted
      // We look for qrCodeData containing 'fdmstest.zimra.co.zw'
      const invoicesToDelete = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            ilike(invoices.qrCodeData, '%fdmstest.zimra.co.zw%')
          )
        );

      if (invoicesToDelete.length === 0) return 0;

      const ids = invoicesToDelete.map(inv => inv.id);

      // 2. Delete from related tables
      await tx.delete(invoiceItems).where(sql`${invoiceItems.invoiceId} IN (${sql.join(ids, sql`, `)})`);
      await tx.delete(validationErrors).where(sql`${validationErrors.invoiceId} IN (${sql.join(ids, sql`, `)})`);
      await tx.delete(payments).where(sql`${payments.invoiceId} IN (${sql.join(ids, sql`, `)})`);
      await tx.delete(zimraLogs).where(sql`${zimraLogs.invoiceId} IN (${sql.join(ids, sql`, `)})`);

      // 3. Nullify self-references (related_invoice_id)
      await tx
        .update(invoices)
        .set({ relatedInvoiceId: null })
        .where(sql`${invoices.relatedInvoiceId} IN (${sql.join(ids, sql`, `)})`);

      // 4. Delete the invoices
      const result = await tx
        .delete(invoices)
        .where(sql`${invoices.id} IN (${sql.join(ids, sql`, `)})`)
        .returning({ id: invoices.id });

      return result.length;
    });
  }

  // Suppliers
  async getSuppliers(companyId: number): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(data: InsertSupplier & { companyId: number }): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  // Inventory Transactions
  async getInventoryTransactions(companyId: number, productId?: number): Promise<InventoryTransaction[]> {
    const filters = [eq(inventoryTransactions.companyId, companyId)];
    if (productId) filters.push(eq(inventoryTransactions.productId, productId));
    return await db.select().from(inventoryTransactions).where(and(...filters)).orderBy(desc(inventoryTransactions.createdAt));
  }

  async createInventoryTransaction(data: InsertInventoryTransaction & { companyId: number }): Promise<InventoryTransaction> {
    const [transaction] = await db.insert(inventoryTransactions).values(data).returning();
    return transaction;
  }

  // Expenses
  async getExpenses(companyId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.companyId, companyId)).orderBy(desc(expenses.expenseDate));
  }

  async createExpense(data: InsertExpense & { companyId: number }): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(data).returning();
    return expense;
  }

  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return updated;
  }

  // Reports
  async getStockValuationReport(companyId: number) {
    const trackedProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.isTracked, true)));

    return trackedProducts.map(p => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      stockLevel: p.stockLevel || "0",
      unitCost: p.costPrice || "0",
      totalValuation: Number(p.stockLevel || 0) * Number(p.costPrice || 0)
    }));
  }

  async getFinancialSummary(companyId: number, dateFrom?: Date, dateTo?: Date, cashierId?: string, drillDown?: boolean) {
    // 1. Revenue (Sum of Invoices - Sum of Credit Notes)
    const invoiceFilters = [eq(invoices.companyId, companyId)];
    if (dateFrom) invoiceFilters.push(gte(invoices.createdAt, dateFrom));
    if (dateTo) invoiceFilters.push(lte(invoices.createdAt, dateTo));
    if (cashierId) invoiceFilters.push(eq(invoices.createdBy, cashierId));

    const companyInvoices = await db
      .select()
      .from(invoices)
      .where(and(...invoiceFilters));

    let revenue = 0;
    const revenueItems: any[] = [];
    
    companyInvoices.forEach(inv => {
      const amount = Number(inv.total);
      if (inv.transactionType === 'CreditNote') {
        revenue -= amount;
        if (drillDown) revenueItems.push({ ...inv, total: -amount });
      } else {
        revenue += amount;
        if (drillDown) revenueItems.push(inv);
      }
    });

    // 2. COGS (Sum of totalCost in inventory_transactions for 'STOCK_OUT')
    let txFilters = [
      eq(inventoryTransactions.companyId, companyId),
      eq(inventoryTransactions.type, 'STOCK_OUT')
    ];
    if (dateFrom) txFilters.push(gte(inventoryTransactions.createdAt, dateFrom));
    if (dateTo) txFilters.push(lte(inventoryTransactions.createdAt, dateTo));

    let salesTransactions;
    if (cashierId) {
      salesTransactions = await db
        .select({ tx: inventoryTransactions })
        .from(inventoryTransactions)
        .innerJoin(invoices, eq(inventoryTransactions.referenceId, invoices.id.toString()))
        .where(and(
          ...txFilters,
          eq(invoices.createdBy, cashierId),
          eq(inventoryTransactions.referenceType, 'INVOICE')
        ));
      salesTransactions = salesTransactions.map(r => r.tx);
    } else {
      salesTransactions = await db
        .select()
        .from(inventoryTransactions)
        .where(and(...txFilters));
    }

    const cogs = salesTransactions.reduce((acc, curr) => acc + Number(curr.totalCost || 0), 0);

    // 3. Expenses
    const expenseFilters = [eq(expenses.companyId, companyId)];
    if (dateFrom) expenseFilters.push(gte(expenses.expenseDate, dateFrom));
    if (dateTo) expenseFilters.push(lte(expenses.expenseDate, dateTo));

    const companyExpenses = await db
      .select()
      .from(expenses)
      .where(and(...expenseFilters));

    const totalExpenses = companyExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

    // 4. Expense Breakdown
    const breakdownMap = new Map<string, number>();
    companyExpenses.forEach(e => {
      const current = breakdownMap.get(e.category) || 0;
      breakdownMap.set(e.category, current + Number(e.amount));
    });

    const expenseBreakdown = Array.from(breakdownMap.entries()).map(([category, amount]) => ({
      category,
      amount
    })).sort((a, b) => b.amount - a.amount);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      expenseBreakdown,
      drillDown: drillDown ? {
        revenueItems,
        cogsItems: salesTransactions,
        expenseItems: companyExpenses
      } : undefined
    };
  }
  // ── Report Module Methods ──────────────────────────────────────────────────

  async getReportSalesSummary(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const byDate = new Map<string, { invoiceCount: number; subtotal: number; taxAmount: number; total: number }>();
    for (const { invoices: inv } of rows) {
      const dateKey = inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : 'unknown';
      const existing = byDate.get(dateKey) ?? { invoiceCount: 0, subtotal: 0, taxAmount: 0, total: 0 };
      existing.invoiceCount += 1;
      existing.subtotal += Number(inv.subtotal);
      existing.taxAmount += Number(inv.taxAmount);
      existing.total += Number(inv.total);
      byDate.set(dateKey, existing);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        invoiceCount: v.invoiceCount,
        subtotal: v.subtotal.toFixed(2),
        taxAmount: v.taxAmount.toFixed(2),
        total: v.total.toFixed(2),
      }));
  }

  async getReportSalesByCustomer(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const byCustomer = new Map<number, { customerName: string; invoiceCount: number; total: number }>();
    for (const { invoices: inv, customers: cust } of rows) {
      const custId = inv.customerId;
      const existing = byCustomer.get(custId) ?? { customerName: cust?.name ?? 'Unknown', invoiceCount: 0, total: 0 };
      existing.invoiceCount += 1;
      existing.total += Number(inv.total);
      byCustomer.set(custId, existing);
    }

    return Array.from(byCustomer.entries()).map(([customerId, v]) => ({
      customerId,
      customerName: v.customerName,
      invoiceCount: v.invoiceCount,
      total: v.total.toFixed(2),
    }));
  }

  async getReportSalesByItem(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const byItem = new Map<string, { productId: number | null; quantitySold: number; revenue: number }>();
    for (const { invoice_items: item } of rows) {
      const key = item.description;
      const existing = byItem.get(key) ?? { productId: item.productId ?? null, quantitySold: 0, revenue: 0 };
      existing.quantitySold += Number(item.quantity);
      existing.revenue += Number(item.lineTotal);
      byItem.set(key, existing);
    }

    return Array.from(byItem.entries()).map(([description, v]) => ({
      productId: v.productId,
      description,
      quantitySold: v.quantitySold.toFixed(2),
      revenue: v.revenue.toFixed(2),
    }));
  }

  async getReportSalesBySalesperson(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(users, eq(invoices.createdBy, users.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const byUser = new Map<string, { userName: string; invoiceCount: number; total: number }>();
    for (const { invoices: inv, users: u } of rows) {
      const userId = inv.createdBy ?? 'unknown';
      const existing = byUser.get(userId) ?? { userName: u?.name ?? u?.email ?? userId, invoiceCount: 0, total: 0 };
      existing.invoiceCount += 1;
      existing.total += Number(inv.total);
      byUser.set(userId, existing);
    }

    return Array.from(byUser.entries()).map(([userId, v]) => ({
      userId,
      userName: v.userName,
      invoiceCount: v.invoiceCount,
      total: v.total.toFixed(2),
    }));
  }

  async getReportArAgingSummary(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const today = new Date();
    const byCustomer = new Map<number, { customerName: string; current: number; days31_60: number; days61_90: number; days90plus: number }>();
    const paidByInvoice = new Map<number, number>();

    for (const { invoices: inv, payments: pmt } of rows) {
      if (pmt) {
        paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
      }
    }

    const seen = new Set<number>();
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);

      const paid = paidByInvoice.get(inv.id) ?? 0;
      const balance = Number(inv.total) - paid;
      if (balance <= 0) continue;

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const custId = inv.customerId;
      const existing = byCustomer.get(custId) ?? { customerName: cust?.name ?? 'Unknown', current: 0, days31_60: 0, days61_90: 0, days90plus: 0 };

      if (daysOverdue <= 30) existing.current += balance;
      else if (daysOverdue <= 60) existing.days31_60 += balance;
      else if (daysOverdue <= 90) existing.days61_90 += balance;
      else existing.days90plus += balance;

      byCustomer.set(custId, existing);
    }

    return Array.from(byCustomer.entries()).map(([customerId, v]) => ({
      customerId,
      customerName: v.customerName,
      current: v.current.toFixed(2),
      days31_60: v.days31_60.toFixed(2),
      days61_90: v.days61_90.toFixed(2),
      days90plus: v.days90plus.toFixed(2),
      total: (v.current + v.days31_60 + v.days61_90 + v.days90plus).toFixed(2),
    }));
  }

  async getReportArAgingDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const today = new Date();
    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    const seen = new Set<number>();
    const result: any[] = [];
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);

      const paid = paidByInvoice.get(inv.id) ?? 0;
      const balance = Number(inv.total) - paid;
      if (balance <= 0) continue;

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      let bucket: "current" | "31-60" | "61-90" | "90+";
      if (daysOverdue <= 30) bucket = "current";
      else if (daysOverdue <= 60) bucket = "31-60";
      else if (daysOverdue <= 90) bucket = "61-90";
      else bucket = "90+";

      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.name ?? 'Unknown',
        dueDate: dueDate.toISOString().slice(0, 10),
        daysOverdue,
        balanceDue: balance.toFixed(2),
        bucket,
      });
    }
    return result;
  }

  async getReportInvoiceDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end)
      ));

    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    const seen = new Set<number>();
    const result: any[] = [];
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      const paid = paidByInvoice.get(inv.id) ?? 0;
      const balance = Math.max(0, Number(inv.total) - paid);
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.name ?? 'Unknown',
        issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : '',
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
        status: inv.status ?? 'draft',
        total: Number(inv.total).toFixed(2),
        paidAmount: paid.toFixed(2),
        balanceDue: balance.toFixed(2),
      });
    }
    return result;
  }

  async getReportQuoteDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .where(and(
        eq(quotations.companyId, companyId),
        gte(quotations.issueDate, start),
        lte(quotations.issueDate, end)
      ));

    return rows.map(({ quotations: q, customers: cust }) => ({
      quotationId: q.id,
      quotationNumber: q.quotationNumber,
      customerName: cust?.name ?? 'Unknown',
      issueDate: q.issueDate ? q.issueDate.toISOString().slice(0, 10) : '',
      expiryDate: q.expiryDate ? q.expiryDate.toISOString().slice(0, 10) : null,
      status: q.status ?? 'draft',
      total: Number(q.total).toFixed(2),
    }));
  }

  async getReportCustomerBalanceSummary(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    const byCustomer = new Map<number, { customerName: string; totalInvoiced: number; totalPaid: number }>();
    const seen = new Set<number>();
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      const custId = inv.customerId;
      const paid = paidByInvoice.get(inv.id) ?? 0;
      const existing = byCustomer.get(custId) ?? { customerName: cust?.name ?? 'Unknown', totalInvoiced: 0, totalPaid: 0 };
      existing.totalInvoiced += Number(inv.total);
      existing.totalPaid += paid;
      byCustomer.set(custId, existing);
    }

    return Array.from(byCustomer.entries()).map(([customerId, v]) => ({
      customerId,
      customerName: v.customerName,
      totalInvoiced: v.totalInvoiced.toFixed(2),
      totalPaid: v.totalPaid.toFixed(2),
      balance: (v.totalInvoiced - v.totalPaid).toFixed(2),
    }));
  }

  async getReportReceivableSummary(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    let totalInvoiced = 0;
    let totalCollected = 0;
    const seen = new Set<number>();
    for (const { invoices: inv } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      totalInvoiced += Number(inv.total);
      totalCollected += paidByInvoice.get(inv.id) ?? 0;
    }

    return {
      totalInvoiced: totalInvoiced.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalOutstanding: Math.max(0, totalInvoiced - totalCollected).toFixed(2),
    };
  }

  async getReportReceivableDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    const seen = new Set<number>();
    const result: any[] = [];
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      const paid = paidByInvoice.get(inv.id) ?? 0;
      const balance = Math.max(0, Number(inv.total) - paid);
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.name ?? 'Unknown',
        issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : '',
        total: Number(inv.total).toFixed(2),
        paidAmount: paid.toFixed(2),
        balanceDue: balance.toFixed(2),
        status: inv.status ?? 'draft',
      });
    }
    return result;
  }

  async getReportBadDebts(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    const today = new Date();
    const paidByInvoice = new Map<number, number>();
    for (const { payments: pmt, invoices: inv } of rows) {
      if (pmt) paidByInvoice.set(inv.id, (paidByInvoice.get(inv.id) ?? 0) + Number(pmt.amount));
    }

    const seen = new Set<number>();
    const result: any[] = [];
    for (const { invoices: inv, customers: cust } of rows) {
      if (seen.has(inv.id)) continue;
      seen.add(inv.id);
      const paid = paidByInvoice.get(inv.id) ?? 0;
      const balance = Number(inv.total) - paid;
      if (balance <= 0) continue;
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      if (daysOverdue <= 90) continue;
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.name ?? 'Unknown',
        dueDate: dueDate.toISOString().slice(0, 10),
        daysOverdue,
        balanceDue: balance.toFixed(2),
      });
    }
    return result;
  }

  async getReportBankCharges(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(payments.companyId, companyId),
        gte(payments.paymentDate, start),
        lte(payments.paymentDate, end),
        eq(payments.paymentMethod, 'BANK_TRANSFER')
      ));

    return rows.map(({ payments: pmt, invoices: inv, customers: cust }) => ({
      paymentId: pmt.id,
      invoiceNumber: inv?.invoiceNumber ?? '',
      customerName: cust?.name ?? 'Unknown',
      paymentDate: pmt.paymentDate.toISOString().slice(0, 10),
      reference: pmt.reference ?? '',
      amount: Number(pmt.amount).toFixed(2),
    }));
  }

  async getReportTimeToGetPaid(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(payments.companyId, companyId),
        gte(payments.paymentDate, start),
        lte(payments.paymentDate, end)
      ));

    return rows.map(({ payments: pmt, invoices: inv, customers: cust }) => {
      const issueDate = inv?.issueDate ? new Date(inv.issueDate) : new Date();
      const paymentDate = new Date(pmt.paymentDate);
      const daysToPayment = Math.max(0, Math.floor((paymentDate.getTime() - issueDate.getTime()) / 86400000));
      return {
        invoiceId: inv?.id ?? 0,
        invoiceNumber: inv?.invoiceNumber ?? '',
        customerName: cust?.name ?? 'Unknown',
        issueDate: issueDate.toISOString().slice(0, 10),
        paymentDate: paymentDate.toISOString().slice(0, 10),
        daysToPayment,
        amount: Number(pmt.amount).toFixed(2),
      };
    });
  }

  async getReportRefundHistory(companyId: number, start: Date, end: Date) {
    const creditNotes = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        eq(invoices.transactionType, 'CreditNote')
      ));

    const relatedIds = creditNotes
      .map(r => r.invoices.relatedInvoiceId)
      .filter((id): id is number => id != null);

    const relatedInvoices = relatedIds.length > 0
      ? await db.select().from(invoices).where(inArray(invoices.id, relatedIds))
      : [];

    const relatedMap = new Map(relatedInvoices.map(inv => [inv.id, inv.invoiceNumber]));

    return creditNotes.map(({ invoices: inv, customers: cust }) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: cust?.name ?? 'Unknown',
      issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : '',
      amount: Number(inv.total).toFixed(2),
      relatedInvoiceNumber: inv.relatedInvoiceId ? (relatedMap.get(inv.relatedInvoiceId) ?? null) : null,
    }));
  }

  async getReportWithholdingTax(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .innerJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    // Group by invoice, sum withheld amounts from items with negative tax (withholding)
    const byInvoice = new Map<number, { invoiceNumber: string; customerName: string; issueDate: string; withheldAmount: number; total: number }>();
    for (const { invoices: inv, customers: cust, invoice_items: item } of rows) {
      const taxRate = Number(item.taxRate);
      if (taxRate >= 0) continue; // Only negative tax rates represent withholding
      const withheld = Math.abs(Number(item.lineTotal));
      const existing = byInvoice.get(inv.id) ?? {
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.name ?? 'Unknown',
        issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : '',
        withheldAmount: 0,
        total: Number(inv.total),
      };
      existing.withheldAmount += withheld;
      byInvoice.set(inv.id, existing);
    }

    return Array.from(byInvoice.entries()).map(([invoiceId, v]) => ({
      invoiceId,
      invoiceNumber: v.invoiceNumber,
      customerName: v.customerName,
      issueDate: v.issueDate,
      withheldAmount: v.withheldAmount.toFixed(2),
      total: v.total.toFixed(2),
    }));
  }

  async getReportExpenseDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(expenses)
      .leftJoin(suppliers, eq(expenses.supplierId, suppliers.id))
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      ));

    return rows.map(({ expenses: exp, suppliers: sup }) => ({
      expenseId: exp.id,
      expenseDate: exp.expenseDate.toISOString().slice(0, 10),
      category: exp.category,
      description: exp.description,
      supplierName: sup?.name ?? null,
      paymentMethod: exp.paymentMethod ?? null,
      reference: exp.reference ?? null,
      amount: Number(exp.amount).toFixed(2),
      currency: exp.currency,
    }));
  }

  async getReportExpensesByCategory(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      ));

    const byCategory = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;
    for (const exp of rows) {
      const amt = Number(exp.amount);
      grandTotal += amt;
      const existing = byCategory.get(exp.category) ?? { total: 0, count: 0 };
      existing.total += amt;
      existing.count += 1;
      byCategory.set(exp.category, existing);
    }

    return Array.from(byCategory.entries()).map(([category, v]) => ({
      category,
      total: v.total.toFixed(2),
      percentage: grandTotal > 0 ? ((v.total / grandTotal) * 100).toFixed(2) : '0.00',
      count: v.count,
    }));
  }

  async getReportExpensesByCustomer(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(expenses)
      .leftJoin(suppliers, eq(expenses.supplierId, suppliers.id))
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      ));

    const bySupplier = new Map<string, { supplierId: number | null; supplierName: string; total: number; count: number }>();
    for (const { expenses: exp, suppliers: sup } of rows) {
      const key = sup ? String(sup.id) : 'no-supplier';
      const existing = bySupplier.get(key) ?? { supplierId: sup?.id ?? null, supplierName: sup?.name ?? 'No Supplier', total: 0, count: 0 };
      existing.total += Number(exp.amount);
      existing.count += 1;
      bySupplier.set(key, existing);
    }

    return Array.from(bySupplier.values()).map(v => ({
      supplierId: v.supplierId,
      supplierName: v.supplierName,
      total: v.total.toFixed(2),
      count: v.count,
    }));
  }

  async getReportExpensesByProject(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      ));

    const byProject = new Map<string, { total: number; count: number }>();
    for (const exp of rows) {
      const project = exp.notes ?? 'Unassigned';
      const existing = byProject.get(project) ?? { total: 0, count: 0 };
      existing.total += Number(exp.amount);
      existing.count += 1;
      byProject.set(project, existing);
    }

    return Array.from(byProject.entries()).map(([project, v]) => ({
      project,
      total: v.total.toFixed(2),
      count: v.count,
    }));
  }

  async getReportBillableExpenseDetails(companyId: number, start: Date, end: Date) {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end),
        eq(expenses.status, 'pending')
      ));

    return rows.map(exp => ({
      expenseId: exp.id,
      expenseDate: exp.expenseDate.toISOString().slice(0, 10),
      category: exp.category,
      description: exp.description,
      amount: Number(exp.amount).toFixed(2),
      status: exp.status ?? 'pending',
    }));
  }

  async getReportTaxSummary(companyId: number, start: Date, end: Date) {
    // Output tax from invoices grouped by tax type
    const invoiceRows = await db
      .select()
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(taxTypes, eq(invoiceItems.taxTypeId, taxTypes.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
        ne(invoices.transactionType, 'CreditNote')
      ));

    // Input tax from expenses grouped by category (using category as tax code proxy)
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        gte(expenses.expenseDate, start),
        lte(expenses.expenseDate, end)
      ));

    type TaxEntry = { taxName: string; taxRate: string; taxableAmount: number; outputTax: number; inputTax: number };
    const taxMap = new Map<string, TaxEntry>();

    for (const { invoice_items: item, tax_types: tt } of invoiceRows) {
      const taxCode = tt?.code ?? 'UNKNOWN';
      const taxRate = Number(item.taxRate);
      const lineTotal = Number(item.lineTotal);
      const taxAmt = lineTotal * (taxRate / (100 + taxRate)); // back-calculate tax from inclusive total
      const taxable = lineTotal - taxAmt;

      const existing = taxMap.get(taxCode) ?? {
        taxName: tt?.name ?? taxCode,
        taxRate: Number(tt?.rate ?? item.taxRate).toFixed(2),
        taxableAmount: 0,
        outputTax: 0,
        inputTax: 0,
      };
      existing.taxableAmount += taxable;
      existing.outputTax += taxAmt;
      taxMap.set(taxCode, existing);
    }

    // Estimate input tax from expenses: assume a standard VAT rate of 15% on expenses
    const VAT_RATE = 0.15;
    for (const exp of expenseRows) {
      const amt = Number(exp.amount);
      const inputTax = amt * VAT_RATE;
      const taxCode = 'VAT-STD';
      const existing = taxMap.get(taxCode) ?? {
        taxName: 'Standard VAT',
        taxRate: '15.00',
        taxableAmount: 0,
        outputTax: 0,
        inputTax: 0,
      };
      existing.inputTax += inputTax;
      taxMap.set(taxCode, existing);
    }

    return Array.from(taxMap.entries()).map(([taxCode, v]) => ({
      taxCode,
      taxName: v.taxName,
      taxRate: v.taxRate,
      taxableAmount: v.taxableAmount.toFixed(2),
      outputTax: v.outputTax.toFixed(2),
      inputTax: v.inputTax.toFixed(2),
      netVat: (v.outputTax - v.inputTax).toFixed(2),
    }));
  }


}

export const storage = new DatabaseStorage();
