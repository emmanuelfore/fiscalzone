
import {
  users, companies, customers, products, invoices, invoiceItems, companyUsers,
  type User, type InsertUser, type Company, type InsertCompany,
  type Customer, type Product, type Invoice, type InvoiceItem,
  type InsertCustomer, type InsertProduct, type CreateInvoiceRequest, type InsertInvoice,
  taxTypes, taxCategories, type TaxType, type TaxCategory, type InsertTaxCategory, type InsertTaxType,
  currencies, type Currency, type InsertCurrency
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer }) | undefined>;
  createInvoice(invoice: CreateInvoiceRequest): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  fiscalizeInvoice(id: number, fiscalData: { fiscalCode: string; qrCodeData: string; fiscalSignature?: string; fiscalDayNo?: number }): Promise<Invoice>;

  // Tax Config
  getTaxTypes(): Promise<TaxType[]>;
  createTaxType(taxType: InsertTaxType): Promise<TaxType>;
  updateTaxType(id: number, taxType: Partial<InsertTaxType>): Promise<TaxType>;
  getTaxCategories(): Promise<TaxCategory[]>;
  createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory>;
  updateTaxCategory(id: number, category: Partial<InsertTaxCategory>): Promise<TaxCategory>;
  syncTaxTypes(zimraTaxes: any[]): Promise<TaxType[]>;

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
  calculateFiscalCounters(companyId: number, fiscalDayNo: number): Promise<any[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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

  async getInvoice(id: number): Promise<(Invoice & { items: (InvoiceItem & { product?: Product })[]; customer?: Customer }) | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId));

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

    return { ...invoice, items, customer };
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
        invoiceNumber: `INV-${Date.now()}`, // Simple generation for now
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

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async fiscalizeInvoice(id: number, fiscalData: { fiscalCode: string; qrCodeData: string; fiscalSignature?: string; fiscalDayNo?: number }): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ ...fiscalData, syncedWithFdms: true, status: "issued" })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async getTaxTypes(): Promise<TaxType[]> {
    return await db.select().from(taxTypes);
  }

  async createTaxType(taxType: InsertTaxType): Promise<TaxType> {
    const [newTaxType] = await db.insert(taxTypes).values(taxType).returning();
    return newTaxType;
  }

  async updateTaxType(id: number, taxType: Partial<InsertTaxType>): Promise<TaxType> {
    const [updated] = await db.update(taxTypes).set(taxType).where(eq(taxTypes.id, id)).returning();
    return updated;
  }

  async getTaxCategories(): Promise<TaxCategory[]> {
    return await db.select().from(taxCategories);
  }

  async createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory> {
    const [newCategory] = await db.insert(taxCategories).values(category).returning();
    return newCategory;
  }

  async updateTaxCategory(id: number, category: Partial<InsertTaxCategory>): Promise<TaxCategory> {
    const [updated] = await db.update(taxCategories).set(category).where(eq(taxCategories.id, id)).returning();
    return updated;
  }

  // Currencies
  async getCurrencies(companyId: number): Promise<Currency[]> {
    return await db.select().from(currencies).where(eq(currencies.companyId, companyId));
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const [newCurrency] = await db.insert(currencies).values(currency).returning();
    return newCurrency;
  }

  async updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency> {
    const [updated] = await db.update(currencies).set(currency).where(eq(currencies.id, id)).returning();
    return updated;
  }

  async deleteCurrency(id: number): Promise<void> {
    await db.delete(currencies).where(eq(currencies.id, id));
  }
  // Tax Sync
  async syncTaxTypes(zimraTaxes: any[]): Promise<TaxType[]> {
    // ZIMRA taxes look like: { taxID: 1, taxPercent: 15.0, taxName: "Standard" } (Example)
    // We want to map them to our taxTypes table.
    // We will upsert based on 'zimraTaxId' or 'code' if we can determine it.

    const results: TaxType[] = [];

    // ZIMRA standard IDs: 1 (Standard), 2 (Zero), 3 (Exempt/None)?
    // From manual: 3=Standard(15%), 2=Zero(0%), 1=Exempt? No, strict mapping needed.
    // Actually in ZIMRA `GetConfig`:
    // "taxLevels": [ { "taxID": 1, "taxPercent": 15.0 }, ... ]

    for (const zTax of zimraTaxes) {
      if (!zTax.taxID) continue;

      const taxRate = zTax.taxPercent.toFixed(2);
      const code = `VAT-${zTax.taxID}`; // Generate a code e.g. VAT-3

      // Check if exists
      const [existing] = await db.select().from(taxTypes).where(eq(taxTypes.code, code));

      if (existing) {
        // Update
        const [updated] = await db.update(taxTypes).set({
          rate: taxRate,
          zimraTaxId: zTax.taxID.toString(),
          name: `VAT ${zTax.taxPercent}%`,
          effectiveFrom: new Date().toISOString() // Or keep original
        }).where(eq(taxTypes.id, existing.id)).returning();
        results.push(updated);
      } else {
        // Create
        const [created] = await db.insert(taxTypes).values({
          code: code,
          name: `VAT ${zTax.taxPercent}%`,
          rate: taxRate,
          description: `ZIMRA Tax Level ${zTax.taxID}`,
          zimraTaxId: zTax.taxID.toString(),
          effectiveFrom: new Date().toISOString()
        }).returning();
        results.push(created);
      }
    }
    return results;
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
      .filter(i => i.status === 'paid' || i.status === 'issued')
      .reduce((sum, inv) => {
        const amount = Number(inv.total);
        if (inv.transactionType === 'CreditNote') {
          return sum - amount;
        }
        return sum + amount;
      }, 0);

    const pendingAmount = companyInvoices
      .filter(i => i.status === 'issued') // Issued but not Paid or Cancelled
      .reduce((sum, inv) => {
        const amount = Number(inv.total);
        if (inv.transactionType === 'CreditNote') {
          return sum - amount;
        }
        return sum + amount;
      }, 0);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      invoicesCount: companyInvoices.filter(i => i.status !== 'cancelled' && i.status !== 'draft' && i.transactionType !== 'CreditNote').length,
      customersCount: companyCustomers.length
    };
  }

  async getRevenueOverTime(companyId: number, days: number = 30) {
    // Simple aggregation. For production use SQL 'date_trunc'.
    // Here we fetch all and aggregate in memory for compatibility/simplicity with current setup.
    const companyInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const dailyMap = new Map<string, number>();

    companyInvoices.forEach(inv => {
      if ((inv.status === 'paid' || inv.status === 'issued') && inv.issueDate && new Date(inv.issueDate) >= cutoff) {
        const dateKey = new Date(inv.issueDate).toISOString().split('T')[0];
        const amount = Number(inv.total);
        const current = dailyMap.get(dateKey) || 0;

        if (inv.transactionType === 'CreditNote') {
          dailyMap.set(dateKey, current - amount);
        } else {
          dailyMap.set(dateKey, current + amount);
        }
      }
    });

    // Fill gaps? Optional. Let's return just days with data or formatted sorted array.
    const result = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  async calculateFiscalCounters(companyId: number, fiscalDayNo: number): Promise<any[]> {
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

    for (const row of dayInvoicesInfo) {
      if (!row.invoice || !row.item) continue;

      const inv = row.invoice;
      const item = row.item;
      const currency = inv.currency || "USD";
      const taxPercent = Number(item.taxRate);

      let taxID = 3;
      if (taxPercent === 0) taxID = 2;
      else if (taxPercent === 15) taxID = 3;

      const type = inv.transactionType || "FiscalInvoice";
      const valLineTotal = Number(item.lineTotal);
      let amountWithTax = valLineTotal;
      let taxAmt = valLineTotal * (taxPercent / 100);

      if (!inv.taxInclusive) {
        amountWithTax = valLineTotal + taxAmt; // Approximation
      } else {
        taxAmt = valLineTotal - (valLineTotal / (1 + taxPercent / 100));
      }

      if (type === 'FiscalInvoice') {
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
      if (['CARD', 'SWIPE'].includes(method)) moneyType = "Card";
      else if (['ECOCASH', 'MOBILE'].includes(method)) moneyType = "MobileWallet";

      const keyBal = `BalanceByMoneyType-${currency}-${moneyType}`;
      // MoneyType counter should not have taxPercent/ID theoretically but schema might require structure.
      // Spec: fiscalCounterTaxPercent is nullable.
      const cBal = getCounter(keyBal, 'BalanceByMoneyType', currency, 0, 0, moneyType);
      cBal.fiscalCounterValue += Number(inv.total);
    }

    return Array.from(countersMap.values()).map(c => ({
      ...c,
      fiscalCounterValue: Math.round(c.fiscalCounterValue * 100) / 100
    }));
  }
}

export const storage = new DatabaseStorage();
