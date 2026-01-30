
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
  validationErrors, type ValidationError, type InsertValidationError
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, lte, or, isNull } from "drizzle-orm";
import { type FiscalDayCounter } from "./zimra.js";

export interface IStorage {
  // User & Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;

  // Companies
  createCompany(company: InsertCompany, userId: string): Promise<Company>;
  getCompanies(userId: string): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;

  // Customers
  getCustomers(companyId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;

  // Products
  getProducts(companyId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;

  // Invoices
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
  addUserToCompany(userId: string, companyId: number, role: string): Promise<void>;
  updateUserRole(userId: string, companyId: number, role: string): Promise<void>;
  removeUserFromCompany(userId: string, companyId: number): Promise<void>;

  // Analytics
  getCompanyStats(companyId: number): Promise<{ totalRevenue: number; pendingAmount: number; invoicesCount: number; customersCount: number }>;
  getRevenueOverTime(companyId: number, days?: number): Promise<{ date: string; amount: number }[]>;
  calculateFiscalCounters(companyId: number, fiscalDayNo: number): Promise<FiscalDayCounter[]>;

  // Locking
  lockInvoice(id: number, userId: string): Promise<boolean>;
  unlockInvoice(id: number, userId: string): Promise<void>;

  // Utils
  getNextInvoiceNumber(companyId: number, prefix: string): Promise<string>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayments(invoiceId: number): Promise<Payment[]>;
  deletePayment(id: number): Promise<void>;

  // Reports
  getStatementData(customerId: number, startDate: Date, endDate: Date, currency?: string): Promise<{
    customer: Customer;
    openingBalance: number;
    closingBalance: number;
    transactions: any[];
  }>;
  getSalesReport(companyId: number, startDate: Date, endDate: Date): Promise<Invoice[]>;
  getPaymentsReport(companyId: number, startDate: Date, endDate: Date): Promise<Payment[]>;

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

  async createCompany(company: InsertCompany, userId: string): Promise<Company> {
    return await db.transaction(async (tx) => {
      const [newCompany] = await tx.insert(companies).values(company).returning();
      await tx.insert(companyUsers).values({
        userId,
        companyId: newCompany.id,
        role: "owner"
      });
      return newCompany;
    });
  }

  async getCompanies(userId: string): Promise<Company[]> {
    const user = await this.getUser(userId);
    if (user?.isSuperAdmin) {
      return await db.select().from(companies);
    }

    const result = await db
      .select({ company: companies })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(eq(companyUsers.userId, userId));

    return result.map(r => r.company);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCustomers(companyId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.companyId, companyId));
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
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

  async getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer; validationErrors?: any[]; relatedInvoiceNumber?: string; relatedInvoiceDate?: Date | null }) | undefined> {
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
      // Delete items first due to foreign key constraint
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.delete(invoices).where(eq(invoices.id, id));
    });
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    return await db.transaction(async (tx) => {
      const { items, ...invoiceData } = data;
      const [invoice] = await tx.insert(invoices).values({
        ...invoiceData,
        ...invoiceData,
        invoiceNumber: await this.getNextInvoiceNumber(invoiceData.companyId, invoiceData.transactionType === 'CreditNote' ? 'CN' : (invoiceData.transactionType === 'DebitNote' ? 'DN' : 'INV')),
        dueDate: new Date(invoiceData.dueDate), // Ensure Date object
      }).returning();

      if (items.length > 0) {
        await tx.insert(invoiceItems).values(
          items.map(item => ({ ...item, invoiceId: invoice.id }))
        );
      }

      return invoice;
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
    const [updated] = await db
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
      .where(eq(invoices.id, id))
      .returning();
    return updated;
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

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
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

  // Currencies
  async getCurrencies(companyId: number): Promise<Currency[]> {
    return await db.select().from(currencies).where(eq(currencies.companyId, companyId));
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const [newCurrency] = await db.insert(currencies).values({
      ...currency,
      exchangeRate: currency.exchangeRate?.toString()
    }).returning();
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

    const finalRevenue = totalRevenue - totalCNs;

    return {
      totalRevenue: Math.round(finalRevenue * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
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
      .where(and(eq(invoices.companyId, companyId), eq(invoices.fiscalDayNo, fiscalDayNo)));

    const countersMap = new Map<string, any>();

    const getCounter = (key: string, type: string, currency: string, taxPercent: number, taxID: number, moneyType: string | null = null) => {
      if (!countersMap.has(key)) {
        countersMap.set(key, {
          fiscalCounterType: type,
          fiscalCounterCurrency: currency,
          fiscalCounterTaxPercent: taxPercent,
          fiscalCounterTaxID: taxID,
          fiscalCounterMoneyType: moneyType,
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

      // Look up taxID from database taxTypes
      const matchingTax = dbTaxTypes.find(t =>
        Math.abs(Number(t.rate) - taxPercent) < 0.01
      );

      // ZIMRA Tax ID Mapping
      let taxID = 3; // Default to Standard
      if (matchingTax?.zimraTaxId) {
        taxID = parseInt(matchingTax.zimraTaxId);
      } else if (taxPercent === 0) {
        // Fallback or explicit check for "Exempt" name
        if (matchingTax?.name?.toLowerCase().includes('exempt')) {
          taxID = 1;
        } else {
          taxID = 2; // Zero Rated
        }
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
      if (type === 'CreditNote') {
        amountWithTax = -Math.abs(amountWithTax);
        taxAmt = -Math.abs(taxAmt);
      } else {
        amountWithTax = Math.abs(amountWithTax);
        taxAmt = Math.abs(taxAmt);
      }

      if (type === 'FiscalInvoice' || type === 'Invoice') {
        const keySale = `SaleByTax-${currency}-${taxPercent}`;
        const cSale = getCounter(keySale, 'SaleByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `SaleTaxByTax-${currency}-${taxPercent}`;
        const cTax = getCounter(keyTax, 'SaleTaxByTax', currency, taxPercent, taxID);
        cTax.fiscalCounterValue += taxAmt;
      } else if (type === 'CreditNote') {
        const keySale = `CreditNoteByTax-${currency}-${taxPercent}`;
        const cSale = getCounter(keySale, 'CreditNoteByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `CreditNoteTaxByTax-${currency}-${taxPercent}`;
        const cTax = getCounter(keyTax, 'CreditNoteTaxByTax', currency, taxPercent, taxID);
        cTax.fiscalCounterValue += taxAmt;
      } else if (type === 'DebitNote') {
        const keySale = `DebitNoteByTax-${currency}-${taxPercent}`;
        const cSale = getCounter(keySale, 'DebitNoteByTax', currency, taxPercent, taxID);
        cSale.fiscalCounterValue += amountWithTax;

        const keyTax = `DebitNoteTaxByTax-${currency}-${taxPercent}`;
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
      let moneyType = "Cash";
      if (['CARD', 'SWIPE', 'POS'].includes(method)) moneyType = "Card";
      else if (['ECOCASH', 'MOBILE', 'MOBILEWALLET', 'ONE_MONEY', 'TELE_CASH'].includes(method)) moneyType = "MobileWallet";
      else if (['EFT', 'RTGS', 'TRANSFER', 'ZIPIT', 'BANKTRANSFER'].includes(method)) moneyType = "BankTransfer";
      else moneyType = "Other";
      const keyBal = `BalanceByMoneyType-${currency}-${moneyType}`;
      // MoneyType counter should not have taxPercent/ID theoretically but schema might require structure.
      // Spec: fiscalCounterTaxPercent is nullable.
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

    // Fetch all payments for these invoices
    const invoiceIds = userInvoices.map(inv => inv.id);
    let userPayments: Payment[] = [];
    if (invoiceIds.length > 0) {
      for (const inv of userInvoices) {
        // Only include payments for the specified currency
        if (currency && inv.currency !== currency) continue;

        const invPayments = await db.select().from(payments).where(eq(payments.invoiceId, inv.id));
        userPayments.push(...invPayments);
      }
    }

    // Filter invoices by currency if provided
    const filteredInvoices = currency
      ? userInvoices.filter(inv => inv.currency === currency)
      : userInvoices;

    // Sort all transactions by date
    // Normalize dates
    const start = new Date(startDate);
    const end = new Date(endDate);

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

  async getSalesReport(companyId: number, startDate: Date, endDate: Date): Promise<Invoice[]> {
    const allInvoices = await this.getInvoices(companyId);
    return allInvoices.filter(inv => {
      if (!inv.issueDate) return false;
      const date = new Date(inv.issueDate);
      return date >= startDate && date <= endDate;
    });
  }

  async getPaymentsReport(companyId: number, startDate: Date, endDate: Date): Promise<Payment[]> {
    const results = await db
      .select()
      .from(payments)
      .where(eq(payments.companyId, companyId))
      .orderBy(desc(payments.paymentDate));

    return results.filter(p => {
      const date = new Date(p.paymentDate);
      return date >= startDate && date <= endDate;
    });
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

}

export const storage = new DatabaseStorage();
