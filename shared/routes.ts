
import { z } from 'zod';
import {
  insertUserSchema,
  insertCompanySchema,
  insertCustomerSchema,
  insertProductSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  companies,
  customers,
  products,
  invoices,
  taxTypes,
  taxCategories,
  invoiceItems,
  insertTaxCategorySchema,
  insertTaxTypeSchema,
  currencies,
  insertCurrencySchema,
  payments,
  insertPaymentSchema,
  insertSupplierSchema,
  insertExpenseSchema,
  type Supplier,
  type InventoryTransaction,
  type Expense
} from './schema.js';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        201: z.object({ id: z.number(), email: z.string() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ id: z.number(), email: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      }
    },
    user: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.object({ id: z.string(), email: z.string(), name: z.string().nullable(), isSuperAdmin: z.boolean().optional() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies',
      responses: {
        200: z.array(z.custom<typeof companies.$inferSelect & { role: string }>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies',
      input: insertCompanySchema,
      responses: {
        201: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/companies/:id',
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/customers',
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/customers',
      input: insertCustomerSchema.omit({ companyId: true }),
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id',
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/products',
      input: insertProductSchema.omit({ companyId: true }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  invoices: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/invoices',
      responses: {
        200: z.array(z.custom<typeof invoices.$inferSelect & { customer?: typeof customers.$inferSelect }>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/invoices',
      input: insertInvoiceSchema.omit({ companyId: true }).extend({
        items: z.array(insertInvoiceItemSchema),
        exchangeRate: z.string().optional(), // Explicitly allow if not picked up
      }),
      responses: {
        201: z.custom<typeof invoices.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/invoices/:id',
      responses: {
        200: z.custom<typeof invoices.$inferSelect & { items: any[]; customer?: typeof customers.$inferSelect }>(),
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/invoices/:id',
      input: insertInvoiceSchema.partial().extend({
        items: z.array(insertInvoiceItemSchema).optional(),
        exchangeRate: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof invoices.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    fiscalize: {
      method: 'POST' as const,
      path: '/api/invoices/:id/fiscalize',
      responses: {
        200: z.custom<typeof invoices.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  tax: {
    types: {
      method: 'GET' as const,
      path: '/api/tax/types',
      responses: {
        200: z.array(z.custom<typeof taxTypes.$inferSelect>()),
      }
    },
    createType: {
      method: 'POST' as const,
      path: '/api/tax/types',
      input: insertTaxTypeSchema,
      responses: {
        201: z.custom<typeof taxTypes.$inferSelect>(),
      }
    },
    updateType: {
      method: 'PATCH' as const,
      path: '/api/tax/types/:id',
      input: insertTaxTypeSchema.partial(),
      responses: {
        200: z.custom<typeof taxTypes.$inferSelect>(),
      }
    },
    categories: {
      method: 'GET' as const,
      path: '/api/tax/categories',
      responses: {
        200: z.array(z.custom<typeof taxCategories.$inferSelect>()),
      }
    },
    createCategory: {
      method: 'POST' as const,
      path: '/api/tax/categories',
      input: insertTaxCategorySchema,
      responses: {
        201: z.custom<typeof taxCategories.$inferSelect>(),
      }
    },
    updateCategory: {
      method: 'PATCH' as const,
      path: '/api/tax/categories/:id',
      input: insertTaxCategorySchema.partial(),
      responses: {
        200: z.custom<typeof taxCategories.$inferSelect>(),
      }
    }
  },
  currencies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/currencies',
      responses: {
        200: z.array(z.custom<typeof currencies.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/currencies',
      input: insertCurrencySchema.omit({ companyId: true }),
      responses: {
        201: z.custom<typeof currencies.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/currencies/:id',
      input: insertCurrencySchema.partial(),
      responses: {
        200: z.custom<typeof currencies.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/currencies/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  payments: {
    list: {
      method: 'GET' as const,
      path: '/api/invoices/:invoiceId/payments',
      responses: {
        200: z.array(z.custom<typeof payments.$inferSelect>()),
      }
    },
    getOne: {
      method: 'GET' as const,
      path: '/api/payments/:id',
      responses: {
        200: z.any(), // Returning payment + invoice + customer
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/invoices/:invoiceId/payments',
      input: insertPaymentSchema.omit({ invoiceId: true, companyId: true, createdBy: true }),
      responses: {
        201: z.custom<typeof payments.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/payments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  suppliers: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/suppliers',
      responses: {
        200: z.array(z.custom<Supplier>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/suppliers',
      input: insertSupplierSchema,
      responses: {
        201: z.custom<Supplier>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/suppliers/:id',
      input: insertSupplierSchema.partial(),
      responses: {
        200: z.custom<Supplier>(),
        404: errorSchemas.notFound,
      }
    }
  },
  inventory: {
    transactions: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/inventory/transactions',
      responses: {
        200: z.array(z.custom<InventoryTransaction>()),
      }
    },
    stockIn: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/inventory/stock-in',
      input: z.object({
        productId: z.number(),
        quantity: z.number().or(z.string()),
        unitCost: z.number().or(z.string()),
        supplierId: z.number().optional(),
        notes: z.string().optional()
      }),
      responses: {
        201: z.object({ message: z.string() }),
      }
    },
    batchStockIn: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/inventory/batch-stock-in',
      input: z.object({
        supplierId: z.number().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number().or(z.string()),
          unitCost: z.number().or(z.string()),
        }))
      }),
      responses: {
        201: z.object({ message: z.string() }),
      }
    }
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/companies/:companyId/expenses',
      responses: {
        200: z.array(z.custom<Expense>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies/:companyId/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<Expense>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/expenses/:id',
      input: insertExpenseSchema.partial(),
      responses: {
        200: z.custom<Expense>(),
        404: errorSchemas.notFound,
      }
    }
  },
  reports: {
    stockValuation: {
      method: "GET" as const,
      path: "/api/companies/:companyId/reports/stock-valuation",
      responses: {
        200: z.array(z.object({
          productId: z.number(),
          name: z.string(),
          sku: z.string().nullable(),
          stockLevel: z.string(),
          unitCost: z.string(),
          totalValuation: z.number()
        }))
      }
    },
    financialSummary: {
      method: "GET" as const,
      path: "/api/companies/:companyId/reports/financial-summary",
      responses: {
        200: z.object({
          revenue: z.number(),
          cogs: z.number(),
          grossProfit: z.number(),
          expenses: z.number(),
          netProfit: z.number(),
          expenseBreakdown: z.array(z.object({
            category: z.string(),
            amount: z.number()
          })),
          drillDown: z.object({
            revenueItems: z.array(z.any()),
            cogsItems: z.array(z.any()),
            expenseItems: z.array(z.any())
          }).optional()
        })
      }
    },
    receivablesAging: {
      method: "GET" as const,
      path: "/api/companies/:companyId/reports/receivables-aging",
      responses: {
        200: z.object({
          total: z.number(),
          current: z.number(),
          days1_15: z.number(),
          days16_30: z.number(),
          days31_45: z.number(),
          above45: z.number(),
        })
      }
    },
    fiscalYearStats: {
      method: "GET" as const,
      path: "/api/companies/:companyId/reports/fiscal-year-stats",
      responses: {
        200: z.object({
          totalSales: z.number(),
          totalReceipts: z.number(),
          totalExpenses: z.number(),
          monthlyData: z.array(z.object({
            month: z.string(),
            sales: z.number(),
            expenses: z.number(),
          }))
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  let url = path;
  const queryParams: Record<string, string> = {};

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      const placeholder = `:${key}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, encodeURIComponent(String(value)));
      } else {
        queryParams[key] = String(value);
      }
    });
  }

  const queryString = new URLSearchParams(queryParams).toString();
  return queryString ? `${url}?${queryString}` : url;
}
