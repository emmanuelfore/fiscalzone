
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
  insertPaymentSchema
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
        200: z.object({ id: z.number(), email: z.string(), name: z.string().nullable() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies',
      responses: {
        200: z.array(z.custom<typeof companies.$inferSelect>()),
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
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
