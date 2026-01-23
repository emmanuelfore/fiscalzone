
import express, { type Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createServer, type Server } from "http";
// Path resolution helper
const rootDir = process.cwd();
import { storage } from "./storage.js";
import { setupAuth } from "./auth.js";
import { api } from "../shared/routes.js";
import { z } from "zod";
import { ZimraDevice, type ReceiptData, ZimraApiError, getZimraBaseUrl, type ZimraConfigResponse, type ZimraTax } from "./zimra.js";
import { sendInvoiceEmail } from './email.js';
import { supabaseAdmin } from "./supabase.js";
import { parse } from "csv-parse/sync";
import { logAction } from "./audit.js";
import {
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertRecurringInvoiceSchema,
  type InsertQuotation,
  type InsertRecurringInvoice
} from "../shared/schema.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // CSV Upload Configuration
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only CSV files are allowed."));
      }
    }
  });

  // Middleware to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    const isAuth = req.isAuthenticated();
    console.log(`[requireAuth] Path: ${req.path}, isAuthenticated: ${isAuth}, user: ${req.user?.id}`);
    if (!isAuth) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireOwner = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    // Resolve companyId strictly
    let companyId = parseInt(req.params.companyId);
    if (!companyId && req.params.id && req.path.startsWith('/api/companies/')) {
      companyId = parseInt(req.params.id);
    }
    if (!companyId && req.body.companyId) {
      companyId = parseInt(req.body.companyId);
    }

    if (!companyId) return next();

    const users = await storage.getCompanyUsers(companyId);
    const me = users.find(u => u.id === req.user.id);



    if (!me || me.role !== 'owner') {
      return res.status(403).json({ message: "Owner permission required" });
    }
    next();
  };

  const requireStaff = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    // Resolve companyId strictly
    let companyId = parseInt(req.params.companyId);
    if (!companyId && req.params.id && req.path.startsWith('/api/companies/')) {
      companyId = parseInt(req.params.id);
    }
    if (!companyId && req.body.companyId) {
      companyId = parseInt(req.body.companyId);
    }

    if (!companyId) return next();

    const users = await storage.getCompanyUsers(companyId);
    const me = users.find(u => u.id === req.user.id);

    if (!me || (me.role !== 'owner' && me.role !== 'staff' && me.role !== 'admin')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  const getZimraLogger = (companyId: number) => ({
    log: async (invoiceId: number | null, endpoint: string, request: any, response: any, statusCode?: number, errorMessage?: string) => {
      console.log(`[ZIMRA LOGGER] Attempting to log for Company ${companyId}, Endpoint: ${endpoint}`);
      try {
        await storage.createZimraLog({
          companyId,
          invoiceId: invoiceId || undefined,
          endpoint,
          requestPayload: request,
          responsePayload: response,
          statusCode,
          errorMessage
        });
      } catch (e: any) {
        console.error("Critical: Failed to save ZIMRA log:", e.message);
        if (e.code) console.error("SQL Error Code:", e.code);
        console.error("Failed Payload:", { companyId, invoiceId, endpoint, statusCode });
      }
    }
  });



  // TEMPORARY DEBUG ENDPOINT
  app.get("/api/debug/logs", async (_req, res) => {
    try {
      const { db } = await import("./db.js");
      const { zimraLogs } = await import("../shared/schema.js");

      const logs = await db.select().from(zimraLogs).limit(20);
      res.json({ count: logs.length, logs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Health Check (Public)
  app.get("/api/health", async (_req, res) => {
    try {
      const { pool } = await import("./db.js");
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (err) {
      console.error("Health Check Failed:", err);
      res.status(503).json({ status: "error", database: "disconnected" });
    }
  });

  // Logo Upload Configuration (Supabase Storage)
  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (_req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
      }
    }
  });

  // Serve uploaded files locally if needed
  app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

  app.post("/api/companies/:id/logo", requireAuth, logoUpload.single("logo"), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileExt = path.extname(file.originalname);
      const fileName = `company-${companyId}-logo-${Date.now()}${fileExt}`;
      let publicUrl = "";

      if (supabaseAdmin) {
        // Upload to Supabase Storage
        const filePath = `logos/${fileName}`;
        const { error } = await supabaseAdmin.storage
          .from('logos')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (error) throw error;

        const { data } = supabaseAdmin.storage
          .from('logos')
          .getPublicUrl(filePath);

        publicUrl = data.publicUrl;
      } else {
        // Local File Storage Fallback
        const uploadDir = path.join(rootDir, 'uploads', 'logos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const localPath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(localPath, file.buffer);

        // Construct local URL
        const protocol = req.protocol;
        publicUrl = `${protocol}://${req.get('host')}/uploads/logos/${fileName}`;
      }

      // Update Company Logo URL in DB
      await storage.updateCompany(companyId, { logoUrl: publicUrl });

      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("Logo Upload Error:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
    }
  });

  // --- CSV Import Endpoints ---

  // --- Quotations ---
  app.get("/api/companies/:companyId/quotations", requireAuth, async (req, res) => {
    const companyId = parseInt(req.params.companyId);
    try {
      const results = await storage.getQuotations(companyId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quotations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const result = await storage.getQuotation(id);
      if (!result) return res.status(404).json({ message: "Quotation not found" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotations", requireAuth, async (req, res) => {
    try {
      const data = insertQuotationSchema.extend({ items: z.array(insertQuotationItemSchema) }).parse(req.body);
      const result = await storage.createQuotation(data);
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/quotations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const data = insertQuotationSchema.extend({ items: z.array(insertQuotationItemSchema) }).partial().parse(req.body);
      const result = await storage.updateQuotation(id, data);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/quotations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      await storage.deleteQuotation(id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/quotations/:id/convert", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const quote = await storage.getQuotation(id);
      if (!quote) return res.status(404).json({ message: "Quotation not found" });
      if (quote.status === "invoiced") return res.status(400).json({ message: "Quotation already converted to invoice" });

      // Convert Quote to Invoice Data
      const invoiceData = {
        companyId: quote.companyId,
        customerId: quote.customerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        currency: quote.currency || "USD",
        exchangeRate: "1.00", // Default
        taxInclusive: quote.taxInclusive || false,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        status: "draft",
        transactionType: "FiscalInvoice",
        notes: `Converted from Quotation ${quote.quotationNumber}. ${quote.notes || ""}`,
        items: quote.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal
        }))
      };

      const invoice = await storage.createInvoice(invoiceData as any);

      // Update quote status
      await storage.updateQuotation(id, { status: "invoiced" });

      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Recurring Invoices ---
  app.get("/api/companies/:companyId/recurring-invoices", requireAuth, async (req, res) => {
    const companyId = parseInt(req.params.companyId);
    try {
      const results = await storage.getRecurringInvoices(companyId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recurring-invoices", requireAuth, async (req, res) => {
    try {
      const data = insertRecurringInvoiceSchema.parse(req.body);
      const result = await storage.createRecurringInvoice(data);
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/recurring-invoices/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const data = insertRecurringInvoiceSchema.partial().parse(req.body);
      const result = await storage.updateRecurringInvoice(id, data);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/recurring-invoices/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      await storage.deleteRecurringInvoice(id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import Customers
  app.post("/api/import/customers", requireAuth, csvUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });

      const targetCompanyId = parseInt(req.body.companyId) || (req as any).user?.companyId;
      if (!targetCompanyId) return res.status(400).json({ message: "Target Company ID required" });

      const fileContent = req.file.buffer.toString("utf-8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };


      const findHeader = (row: any, options: string[]) => {
        const keys = Object.keys(row);
        for (const opt of options) {
          const match = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === opt.toLowerCase().replace(/[\s_-]/g, ''));
          if (match) return match;
        }
        return null;
      };

      for (const [index, row] of records.entries()) {
        try {
          // Expected Columns: Name, Email, Phone, Address, TIN, VAT Number
          const nameHeader = findHeader(row, ['Name', 'Customer Name', 'Client Name', 'Business Name']);
          const emailHeader = findHeader(row, ['Email', 'Email Address']);
          const phoneHeader = findHeader(row, ['Phone', 'Telephone', 'Mobile', 'Phone Number']);
          const addressHeader = findHeader(row, ['Address', 'Billing Address', 'Location']);
          const tinHeader = findHeader(row, ['TIN', 'Tax ID', 'Tax Number']);
          const vatHeader = findHeader(row, ['VAT Number', 'VAT NO', 'VAT']);
          const typeHeader = findHeader(row, ['Type', 'Customer Type', 'Client Type']);

          const name = nameHeader ? (row as any)[nameHeader] : null;
          if (!name) throw new Error("Missing 'Name' column");

          const customerData = {
            companyId: targetCompanyId,
            name: name,
            email: emailHeader ? (row as any)[emailHeader] : undefined,
            phone: phoneHeader ? (row as any)[phoneHeader] : undefined,
            address: addressHeader ? (row as any)[addressHeader] : undefined,
            tin: tinHeader ? (row as any)[tinHeader] : undefined,
            vatNumber: vatHeader ? (row as any)[vatHeader] : undefined,
            customerType: typeHeader ? ((row as any)[typeHeader] || 'individual').toLowerCase() : 'individual',
            isActive: true
          };

          // Validate via Zod
          const validated = api.customers.create.input.parse(customerData);

          await storage.createCustomer({
            ...validated,
            companyId: targetCompanyId
          });
          results.success++;
        } catch (err: any) {
          results.failed++;
          let msg = err.message;
          if (err instanceof z.ZodError) {
            msg = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          }
          results.errors.push(`Row ${index + 2}: ${msg}`);
        }
      }

      res.json({ message: "Import completed", ...results });

    } catch (error: any) {
      console.error("Import Customers Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Import Products
  app.post("/api/import/products", requireAuth, csvUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });

      const targetCompanyId = parseInt(req.body.companyId) || (req.user as any).companyId;
      if (!targetCompanyId) return res.status(400).json({ message: "Target Company ID required" });

      const fileContent = req.file.buffer.toString("utf-8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      const cleanNum = (val: any) => {
        if (val === undefined || val === null || val === "") return 0;
        return parseFloat(val.toString().replace(/[^0-9.]/g, '')) || 0;
      };

      const findHeader = (row: any, options: string[]) => {
        const keys = Object.keys(row);
        for (const opt of options) {
          const match = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === opt.toLowerCase().replace(/[\s_-]/g, ''));
          if (match) return match;
        }
        return null;
      };

      for (const [index, row] of records.entries()) {
        try {
          const nameHeader = findHeader(row, ['Name', 'Product Name', 'Item Name', 'Title']);
          const descHeader = findHeader(row, ['Description', 'Notes', 'Details']);
          const skuHeader = findHeader(row, ['Code', 'SKU', 'Item Code', 'ID']);
          const priceHeader = findHeader(row, ['Price', 'Unit Price', 'Rate']);
          const taxHeader = findHeader(row, ['Tax Rate', 'VAT', 'TaxPercent', 'Tax']);
          const typeHeader = findHeader(row, ['Type', 'Product Type', 'Item Type']);
          const stockHeader = findHeader(row, ['Stock', 'Quantity', 'Qty', 'Inventory']);
          const hsHeader = findHeader(row, ['HS Code', 'HSCode', 'Harmonized Code']);

          const name = nameHeader ? (row as any)[nameHeader] : null;
          if (!name) throw new Error("Missing 'Name' column");

          const typeValue = typeHeader ? (row as any)[typeHeader].toLowerCase() : 'good';
          const type = typeValue.includes('service') ? 'service' : 'good';

          const productData = {
            companyId: targetCompanyId,
            name: name,
            description: descHeader ? (row as any)[descHeader] : "",
            sku: skuHeader ? (row as any)[skuHeader] : `IMP-${Date.now()}-${index}`,
            price: priceHeader ? cleanNum((row as any)[priceHeader]).toString() : "0.00",
            taxRate: taxHeader ? cleanNum((row as any)[taxHeader]).toString() : "15.00",
            productType: type,
            hsCode: hsHeader ? (row as any)[hsHeader] : "0000.00.00",
            isActive: true,
            stockLevel: stockHeader ? cleanNum((row as any)[stockHeader]).toString() : "0.00",
            isTracked: !!stockHeader && type === 'good'
          };

          // Validate via Zod
          const validated = api.products.create.input.parse(productData);

          await storage.createProduct({
            ...validated,
            companyId: targetCompanyId
          });
          results.success++;
        } catch (err: any) {
          results.failed++;
          let msg = err.message;
          if (err instanceof z.ZodError) {
            msg = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          }
          results.errors.push(`Row ${index + 2}: ${msg}`);
        }
      }

      res.json({ message: "Import completed", ...results });

    } catch (error: any) {
      console.error("Import Products Error:", error);
      res.status(500).json({ message: error.message });
    }
  });


  // Company Routes
  app.get(api.companies.list.path, requireAuth, async (req, res) => {
    const companies = await storage.getCompanies((req as any).user?.id);
    res.json(companies);
  });

  app.post(api.companies.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input, (req as any).user?.id);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create Company Error:", err);
      res.status(500).json({ message: "Failed to create company: " + (err instanceof Error ? err.message : "Internal Error") });
    }
  });

  app.get(api.companies.get.path, requireAuth, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  });

  app.patch("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      // Ideally verify user owns this company
      const updated = await storage.updateCompany(companyId, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update Company Error:", err);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // ZIMRA Environment Switching
  app.post("/api/companies/:id/zimra/environment", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { environment } = req.body;

      // Validate environment value
      if (!environment || !['test', 'production'].includes(environment)) {
        return res.status(400).json({
          message: "Invalid environment. Must be 'test' or 'production'"
        });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Safety check: Don't allow switching if fiscal day is open
      if (company.fiscalDayOpen) {
        return res.status(400).json({
          message: "Cannot switch environment while fiscal day is open",
          suggestion: "Close the current fiscal day before switching environments",
          currentEnvironment: company.zimraEnvironment,
          fiscalDayNo: company.currentFiscalDayNo
        });
      }

      // Warning if switching to production
      if (environment === 'production' && company.zimraEnvironment !== 'production') {
        console.warn(`[ZIMRA] Company ${companyId} switching to PRODUCTION environment`);
      }

      // Update environment
      await storage.updateCompany(companyId, {
        zimraEnvironment: environment
      });

      console.log(`[ZIMRA] Company ${companyId} environment changed: ${company.zimraEnvironment} → ${environment}`);

      res.json({
        success: true,
        message: `ZIMRA environment switched to ${environment}`,
        previousEnvironment: company.zimraEnvironment,
        currentEnvironment: environment,
        baseUrl: environment === 'production'
          ? 'https://fdmsapi.zimra.co.zw'
          : 'https://fdmsapitest.zimra.co.zw',
        warning: environment === 'production'
          ? 'You are now using the PRODUCTION ZIMRA environment. All transactions will be real and reported to ZIMRA.'
          : null
      });

    } catch (err: any) {
      console.error("Switch Environment Error:", err);
      res.status(500).json({ message: "Failed to switch environment: " + err.message });
    }
  });


  // Audit Logs
  app.get("/api/companies/:id/audit-logs", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      // Verify user has access to company (owner/admin)
      // For now, we assume requireAuth + company scoping is sufficient for MVP
      // In production, add strict role check here

      const logs = await storage.getAuditLogs(companyId, limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ZIMRA Transaction Logs (TEMP: Auth disabled for debugging)
  app.get("/api/companies/:id/zimra/logs", async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const logs = await storage.getCompanyZimraLogs(companyId, limit);
      res.json(logs);
    } catch (err: any) {
      console.error("Get ZIMRA Logs Error:", err);
      res.status(500).json({ message: "Failed to fetch ZIMRA logs" });
    }
  });

  // Get current ZIMRA environment status
  app.get("/api/companies/:id/zimra/environment", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const environment = company.zimraEnvironment || 'test';

      res.json({
        environment,
        baseUrl: environment === 'production'
          ? 'https://fdmsapi.zimra.co.zw'
          : 'https://fdmsapitest.zimra.co.zw',
        isProduction: environment === 'production',
        canSwitch: !company.fiscalDayOpen,
        fiscalDayOpen: company.fiscalDayOpen,
        currentFiscalDayNo: company.currentFiscalDayNo
      });

    } catch (err: any) {
      console.error("Get Environment Error:", err);
      res.status(500).json({ message: "Failed to get environment: " + err.message });
    }
  });

  // Company Zimra Registration
  app.post("/api/companies/:id/zimra/register", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { deviceId, activationKey, deviceSerialNo } = req.body;

      if (!deviceId || !activationKey || !deviceSerialNo) {
        return res.status(400).json({ message: "Missing required ZIMRA fields" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });

      // Instantiate device just for registration (no keys yet)
      const device = new ZimraDevice({
        deviceId,
        deviceSerialNo,
        activationKey,
        baseUrl: 'https://fdmsapitest.zimra.co.zw' // Default to test for now
      }, getZimraLogger(companyId));

      const keys = await device.registerDevice();

      // Save keys and device info to DB
      await storage.updateCompany(companyId, {
        fdmsDeviceId: deviceId,
        fdmsDeviceSerialNo: deviceSerialNo, // ZIMRA Field [21]
        fdmsApiKey: activationKey,
        zimraPrivateKey: keys.privateKey,
        zimraCertificate: keys.certificate
      });

      res.json({ message: "Device registered successfully", certificate: keys.certificate });
    } catch (err: any) {
      console.error("Zimra Registration Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  // Verify Taxpayer Information Route
  app.post("/api/companies/:id/zimra/verify-taxpayer", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { deviceId, activationKey, deviceSerialNo } = req.body;

      if (!deviceId || !activationKey || !deviceSerialNo) {
        return res.status(400).json({ message: "Missing required ZIMRA fields: deviceId, activationKey, deviceSerialNo" });
      }

      // Instantiate device with provided credentials (not yet saved)
      const device = new ZimraDevice({
        deviceId,
        deviceSerialNo,
        activationKey,
        baseUrl: 'https://fdmsapitest.zimra.co.zw' // Default to test
      }, getZimraLogger(companyId));

      const taxpayerInfo = await device.verifyTaxpayerInformation();
      res.json(taxpayerInfo);

    } catch (err: any) {
      console.error("Zimra Verification Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: err.message || "Verification failed" });
    }
  });

  // Certificate Management
  app.post("/api/companies/:id/zimra/issue-certificate", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) return res.status(400).json({ message: "Not registered" });

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
      }, getZimraLogger(companyId));

      const keys = await device.issueCertificate();

      // Update DB with new keys
      await storage.updateCompany(companyId, {
        zimraPrivateKey: keys.privateKey,
        zimraCertificate: keys.certificate
      });

      res.json({ message: "Certificate issued successfully", certificate: keys.certificate });
    } catch (err: any) {
      console.error("Issue Certificate Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: err.message || "Certificate issuance failed" });
    }
  });

  app.get("/api/companies/:id/zimra/server-certificate", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const thumbprint = req.query.thumbprint as string;

      // We don't strictly need auth company for public endpoint, 
      // but we use it to construct a device instance if we want to reuse logic, 
      // or just make a generic call. 
      // Let's use the company config to be safe if we need to fall back to authenticated calls later.
      const company = await storage.getCompany(companyId);

      // Even if company not found, we can try generic access, but we need deviceId to init class.
      // Let's assume we need a valid company context.
      if (!company) return res.status(404).json({ message: "Company not found" });

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId || "0",
        deviceSerialNo: "UNKNOWN",
        activationKey: "",
      }, getZimraLogger(companyId));

      const certs = await device.getServerCertificate(thumbprint);
      res.json(certs);
    } catch (err: any) {
      console.error("Get Server Certificate Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // User Management
  // 1. List Users
  app.get("/api/companies/:companyId/users", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const userId = (req as any).user.id;

      const args = await storage.getCompanyUsers(companyId);
      // Check if current user belongs to company
      if (!args.find(u => u.id === userId)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(args);
    } catch (err: any) {
      console.error("List Users Error:", err);
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  // 2. Add User
  app.post("/api/companies/:companyId/users", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const userId = (req as any).user.id;
      const { email, role } = req.body;

      if (!email) return res.status(400).json({ message: "Email is required" });

      // Permission check
      const users = await storage.getCompanyUsers(companyId);
      const me = users.find(u => u.id === userId);
      if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Check if user exists in system
      const userToAdd = await storage.getUserByEmail(email);
      if (!userToAdd) {
        // Option: Create a placeholder user or error. schema requires valid user_id foreign key.
        // For simplicity: Limit to adding existing users for now.
        return res.status(404).json({ message: "User not found. They must register first." });
      }

      // Check if already in company
      if (users.find(u => u.id === userToAdd.id)) {
        return res.status(409).json({ message: "User already in company" });
      }

      await storage.addUserToCompany(userToAdd.id, companyId, role || 'member');
      res.status(201).json({ message: "User added successfully", user: userToAdd });

    } catch (err: any) {
      console.error("Add User Error:", err);
      res.status(500).json({ message: "Failed to add user" });
    }
  });

  // 3. Update User Role
  app.patch("/api/companies/:companyId/users/:userId", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const targetUserId = req.params.userId;
      const userId = (req as any).user.id;
      const { role } = req.body;

      const users = await storage.getCompanyUsers(companyId);
      const me = users.find(u => u.id === userId);

      if (!me || me.role !== 'owner') {
        // Only owners can change roles? Or admins too? Let's say Owner only for safety or Admin
        if (me?.role !== 'admin') return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.updateUserRole(targetUserId, companyId, role);
      res.json({ message: "Role updated" });
    } catch (err: any) {
      console.error("Update Role Error:", err);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // 4. Remove User
  app.delete("/api/companies/:companyId/users/:userId", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const targetUserId = req.params.userId;
      const userId = (req as any).user.id;

      const users = await storage.getCompanyUsers(companyId);
      const me = users.find(u => u.id === userId);

      if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }

      await storage.removeUserFromCompany(targetUserId, companyId);
      res.json({ message: "User removed" });
    } catch (err: any) {
      console.error("Remove User Error:", err);
      res.status(500).json({ message: "Failed to remove user" });
    }
  });




  // Analytics Routes
  app.get("/api/companies/:companyId/stats/summary", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      // Check permission if needed
      const stats = await storage.getCompanyStats(companyId);
      res.json(stats);
    } catch (err: any) {
      console.error("Stats Error:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/companies/:companyId/stats/revenue-over-time", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const days = req.query.days ? Number(req.query.days) : 30;
      const data = await storage.getRevenueOverTime(companyId, days);
      res.json(data);
    } catch (err: any) {
      console.error("Revenue Stats Error:", err);
      res.status(500).json({ message: "Failed to fetch revenue stats" });
    }
  });

  // ZIMRA Fiscal Day Management
  app.get("/api/companies/:id/zimra/status", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId || !company.zimraPrivateKey) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: "UNKNOWN", // Should be stored?
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey,
        certificate: company.zimraCertificate || "",
      }, getZimraLogger(companyId));

      const status = await device.getStatus();

      // Update local state
      await storage.updateCompany(companyId, {
        currentFiscalDayNo: status.lastFiscalDayNo,
        lastFiscalDayStatus: status.fiscalDayStatus,
        lastReceiptGlobalNo: status.lastReceiptGlobalNo,
        fiscalDayOpen: status.fiscalDayStatus === 'FiscalDayOpened'
      });

      res.json(status);
    } catch (err: any) {
      console.error("Zimra Status Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/companies/:id/zimra/config/sync", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || undefined,
        certificate: company.zimraCertificate || undefined,
        baseUrl: 'https://fdmsapitest.zimra.co.zw' // TODO: Config
      }, getZimraLogger(companyId));

      // Get Config from ZIMRA
      const config = await device.getConfig();

      // Use applicableTaxes (spec-compliant) or fallback to taxLevels (legacy)
      const taxes = config.applicableTaxes || config.taxLevels || [];

      if (!config || taxes.length === 0) {
        throw new Error("Invalid config response from ZIMRA: Missing tax information");
      }

      // Sync with DB
      const syncedTaxes = await storage.syncTaxTypes(taxes);

      // Update company with qrUrl from config
      if (config.qrUrl) {
        await storage.updateCompany(companyId, { qrUrl: config.qrUrl });
      }

      res.json({
        message: "Configuration synced successfully",
        taxLevels: syncedTaxes,
        config: {
          operationID: config.operationID,
          taxPayerName: config.taxPayerName,
          taxPayerTIN: config.taxPayerTIN,
          vatNumber: config.vatNumber,
          deviceSerialNo: config.deviceSerialNo,
          deviceBranchName: config.deviceBranchName,
          deviceOperatingMode: config.deviceOperatingMode,
          certificateValidTill: config.certificateValidTill,
          qrUrl: config.qrUrl,
          taxPayerDayMaxHrs: config.taxPayerDayMaxHrs
        }
      });

    } catch (err: any) {
      console.error("ZIMRA Config Sync Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: "Failed to sync configuration: " + err.message });
    }
  });

  app.post("/api/companies/:id/zimra/ping", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
      }, getZimraLogger(companyId));

      const response = await device.ping();

      // Update ping time and frequency
      await storage.updateCompany(companyId, {
        lastPing: new Date(),
        deviceReportingFrequency: response.reportingFrequency
      });

      res.json(response);

    } catch (err: any) {
      console.error("ZIMRA Ping Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: "Failed to ping ZIMRA: " + err.message });
    }
  });

  app.post("/api/companies/:id/zimra/connectivity-test", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
      }, getZimraLogger(companyId));

      const checks: any[] = [];
      let overallStatus = "Online";

      // 1. Ping Test
      try {
        const pingRes = await device.ping();
        checks.push({
          name: "Server Reachability",
          status: "success",
          message: `Ping successful (Frequency: ${pingRes.reportingFrequency}m)`
        });
      } catch (e: any) {
        console.error("Connectivity Test - Ping Failed", e);
        overallStatus = "Offline";
        checks.push({
          name: "Server Reachability",
          status: "error",
          message: e.message || "Failed to reach ZIMRA server"
        });
      }

      // 2. Status Check
      if (overallStatus !== "Offline") {
        try {
          const statusRes = await device.getStatus();
          checks.push({
            name: "Device Status",
            status: "success",
            message: `Status: ${statusRes.fiscalDayStatus}`
          });

          // Update DB with latest status while we are at it
          await storage.updateCompany(companyId, {
            currentFiscalDayNo: statusRes.lastFiscalDayNo,
            lastFiscalDayStatus: statusRes.fiscalDayStatus,
            fiscalDayOpen: statusRes.fiscalDayStatus === 'FiscalDayOpened'
          });

        } catch (e: any) {
          console.error("Connectivity Test - Status Failed", e);
          overallStatus = "Degraded";
          checks.push({
            name: "Device Status",
            status: "error",
            message: e.message || "Failed to retrieve device status"
          });
        }
      }

      // 3. Certificate Check (Local)
      if (company.zimraCertificate) {
        checks.push({
          name: "Certificate",
          status: "success",
          message: "Valid certificate present"
        });
      } else {
        overallStatus = "Offline";
        checks.push({
          name: "Certificate",
          status: "error",
          message: "No certificate found"
        });
      }

      res.json({
        overallStatus,
        checks,
        timestamp: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Connectivity Test Error:", err);
      res.status(500).json({ message: "Failed to run connectivity test: " + err.message });
    }
  });

  app.post("/api/companies/:id/zimra/day/open", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
      }, getZimraLogger(companyId));

      // Check current status first
      const status = await device.getStatus() as any;
      if (status.fiscalDayStatus === 'FiscalDayOpened') {
        const fiscalDayNo = status.lastFiscalDayNo;
        // Sync local state if needed
        if (!company.fiscalDayOpen) {
          await storage.updateCompany(companyId, {
            currentFiscalDayNo: fiscalDayNo,
            fiscalDayOpen: true,
            lastFiscalDayStatus: 'FiscalDayOpened'
          });
        }
        return res.json({ message: "Fiscal day is already open", fiscalDayNo });
      }

      const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
      const result = await device.openDay(nextDayNo) as any;

      await storage.updateCompany(companyId, {
        currentFiscalDayNo: result.fiscalDayNo || nextDayNo,
        fiscalDayOpen: true,
        lastFiscalDayStatus: 'FiscalDayOpened',
        dailyReceiptCount: 0 // Reset daily counter
      });

      res.json(result);
    } catch (err: any) {
      console.error("Open Day Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: "Failed to open fiscal day: " + err.message });
    }
  });

  app.post("/api/companies/:id/zimra/day/close", requireAuth, async (req, res) => {
    const companyId = Number(req.params.id);
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries

    try {
      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company not registered with ZIMRA" });
      }

      // Check if fiscal day is actually open
      if (!company.fiscalDayOpen) {
        return res.status(400).json({
          message: "No fiscal day is currently open",
          suggestion: "Open a fiscal day before attempting to close it"
        });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
        baseUrl: 'https://fdmsapitest.zimra.co.zw' // TODO: Config
      }, getZimraLogger(companyId));

      const fiscalDayNo = company.currentFiscalDayNo || 0;
      const receiptCounter = company.dailyReceiptCount || 0;

      console.log(`[CloseDay] Starting closure for Fiscal Day ${fiscalDayNo}, Company ${companyId}`);
      console.log(`[CloseDay] Receipt Counter: ${receiptCounter}`);

      // Calculate Counters from DB transactions for this day
      const counters = await storage.calculateFiscalCounters(companyId, fiscalDayNo);
      console.log(`[CloseDay] Calculated ${counters.length} fiscal counters`);

      const todayStr = new Date().toISOString().slice(0, 19);

      // Retry mechanism for fiscal day closure
      let lastError: any = null;
      let result: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[CloseDay] Attempt ${attempt}/${maxRetries} to close fiscal day ${fiscalDayNo}`);

          result = await device.closeDay(
            fiscalDayNo,
            todayStr,
            receiptCounter,
            counters
          );

          // Success! Break out of retry loop
          console.log(`[CloseDay] ✓ Successfully closed fiscal day ${fiscalDayNo} on attempt ${attempt}`);
          lastError = null;
          break;

        } catch (err: any) {
          lastError = err;
          console.error(`[CloseDay] ✗ Attempt ${attempt}/${maxRetries} failed:`, {
            error: err.message,
            statusCode: err.statusCode,
            endpoint: err.endpoint,
            details: err.details
          });

          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            console.log(`[CloseDay] Waiting ${retryDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // If all retries failed, handle the error
      if (lastError) {
        console.error(`[CloseDay] ✗ All ${maxRetries} attempts failed for fiscal day ${fiscalDayNo}`);

        // Update company state to reflect failed closure
        await storage.updateCompany(companyId, {
          lastFiscalDayStatus: 'FiscalDayCloseFailed'
        });

        // Provide detailed error response with recovery instructions
        const errorResponse: any = {
          message: "Failed to close fiscal day after multiple attempts",
          fiscalDayNo,
          attempts: maxRetries,
          lastError: lastError.message,
          recovery: {
            options: [
              "Review and correct the fiscal counters data",
              "Verify all receipts for the day are properly recorded",
              "Try closing the day again via this endpoint",
              "If issue persists, manually close via ZIMRA Public Portal",
              "Contact ZIMRA support if manual closure is also failing"
            ],
            manualClosureUrl: "https://portal.zimra.co.zw"
          }
        };

        if (lastError instanceof ZimraApiError) {
          errorResponse.statusCode = lastError.statusCode;
          errorResponse.endpoint = lastError.endpoint;
          errorResponse.details = lastError.details;

          // Check if ZIMRA returned specific error code
          if (lastError.details?.fiscalDayClosingErrorCode) {
            errorResponse.zimraErrorCode = lastError.details.fiscalDayClosingErrorCode;
          }
        }

        return res.status(errorResponse.statusCode || 500).json(errorResponse);
      }

      // Success! Update company state
      console.log(`[CloseDay] Updating company state after successful closure`);

      await storage.updateCompany(companyId, {
        fiscalDayOpen: false,
        lastFiscalDayStatus: 'FiscalDayClosed',
        dailyReceiptCount: 0 // Explicitly reset on success too
      });

      // Log successful closure
      console.log(`[CloseDay] ✓ Fiscal Day ${fiscalDayNo} closed successfully`, {
        companyId,
        fiscalDayNo,
        receiptCounter,
        countersCount: counters.length,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Fiscal day ${fiscalDayNo} closed successfully`,
        fiscalDayNo,
        receiptCounter,
        countersSubmitted: counters.length,
        result
      });

    } catch (err: any) {
      console.error("[CloseDay] Unexpected error:", err);

      // Try to update status even if there's an unexpected error
      try {
        await storage.updateCompany(companyId, {
          lastFiscalDayStatus: 'FiscalDayCloseFailed'
        });
      } catch (updateErr) {
        console.error("[CloseDay] Failed to update company status:", updateErr);
      }

      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({
          message: err.message,
          details: err.details,
          endpoint: err.endpoint
        });
      }

      res.status(500).json({
        message: "Failed to close fiscal day: " + err.message,
        error: err.toString()
      });
    }
  });

  // Customer Routes
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const customers = await storage.getCustomers(Number(req.params.companyId));
    res.json(customers);
  });

  app.post(api.customers.create.path, requireAuth, async (req, res) => {
    const input = api.customers.create.input.parse(req.body);
    const customer = await storage.createCustomer({
      ...input,
      companyId: Number(req.params.companyId)
    });
    res.status(201).json(customer);
  });

  app.patch(api.customers.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.customers.update.input.parse(req.body);
      const updated = await storage.updateCustomer(id, input);
      if (!updated) return res.status(404).json({ message: "Customer not found" });
      res.json(updated);
    } catch (err) {
      console.error("Update Customer Error:", err);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Product Routes
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const products = await storage.getProducts(Number(req.params.companyId));
    res.json(products);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    const input = api.products.create.input.parse(req.body);
    const product = await storage.createProduct({
      ...input,
      companyId: Number(req.params.companyId)
    });
    res.status(201).json(product);
  });

  app.patch(api.products.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.products.update.input.parse(req.body);
      const updated = await storage.updateProduct(id, input);
      if (!updated) return res.status(404).json({ message: "Product not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Tax Routes
  app.get(api.tax.types.path, requireAuth, async (req, res) => {
    const types = await storage.getTaxTypes();
    res.json(types);
  });

  app.post(api.tax.createType.path, requireAuth, async (req, res) => {
    try {
      // Date parsing happens in Zod schema refinement if needed, but for now we expect string YYYY-MM-DD which postgres handles or we fix schema
      const input = api.tax.createType.input.parse(req.body);
      const type = await storage.createTaxType(input);
      res.status(201).json(type);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create tax type" });
    }
  });

  app.patch(api.tax.updateType.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.tax.updateType.input.parse(req.body);
      const updated = await storage.updateTaxType(id, input);
      if (!updated) return res.status(404).json({ message: "Tax Type not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update tax type" });
    }
  });

  app.get(api.tax.categories.path, requireAuth, async (req, res) => {
    const categories = await storage.getTaxCategories();
    res.json(categories);
  });

  app.post(api.tax.createCategory.path, requireAuth, async (req, res) => {
    try {
      const input = api.tax.createCategory.input.parse(req.body);
      const category = await storage.createTaxCategory(input);
      res.status(201).json(category);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create tax category" });
    }
  });

  app.patch(api.tax.updateCategory.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.tax.updateCategory.input.parse(req.body);
      const updated = await storage.updateTaxCategory(id, input);
      if (!updated) return res.status(404).json({ message: "Category not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update tax category" });
    }
  });

  // Invoice Routes
  app.get(api.invoices.list.path, requireAuth, async (req, res) => {
    const invoices = await storage.getInvoices(Number(req.params.companyId));
    res.json(invoices);
  });

  app.post(api.invoices.create.path, requireStaff, async (req, res) => {
    try {
      // Preprocess dates: convert ISO strings to Date objects
      const body = {
        ...req.body,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };

      const input = api.invoices.create.input.parse(body);
      const invoice = await storage.createInvoice({
        ...input,
        items: input.items as any,
        companyId: Number(req.params.companyId)
      });
      res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.invoices.get.path, requireAuth, async (req, res) => {
    const invoice = await storage.getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.put(api.invoices.update.path, requireStaff, async (req, res) => {
    try {
      // Preprocess dates
      const body = {
        ...req.body,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };

      const input = api.invoices.update.input.parse(body);
      const invoice = await storage.updateInvoice(Number(req.params.id), {
        ...input,
        items: input.items as any
      });
      res.json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Fiscalize invoice using ZIMRA Fiscal Device Gateway
  // Fiscalize invoice using ZIMRA Fiscal Device Gateway
  app.post(api.invoices.fiscalize.path, requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      // Retrieve full invoice with line items
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check permissions: User must belong to the company
      const users = await storage.getCompanyUsers(invoice.companyId);
      const isMember = users.some(u => u.id === req.user?.id);
      if (!isMember) {
        return res.status(403).json({ message: "You do not have permission to fiscalize for this company" });
      }

      const company = await storage.getCompany(invoice.companyId);
      if (!company || !company.zimraPrivateKey || !company.zimraCertificate || !company.fdmsDeviceId) {
        return res.status(400).json({ message: "Company has not registered a ZIMRA device" });
      }

      // Initialize Device with Logger
      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey,
        certificate: company.zimraCertificate,
        baseUrl: company.zimraEnvironment === 'production' ? 'https://fdmsapi.zimra.co.zw' : 'https://fdmsapitest.zimra.co.zw'
      }, getZimraLogger(company.id));

      // Set invoice ID for logging
      device.setInvoiceId(invoiceId);

      // 1. AUTO-OPEN DAY CHECK
      try {
        const status = await device.getStatus() as any;
        if (status.fiscalDayStatus !== 'FiscalDayOpened') {
          console.log("Fiscal Day Closed. Auto-opening...");
          const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
          const openResult = await device.openDay(nextDayNo) as any;

          // Update company state
          await storage.updateCompany(company.id, {
            currentFiscalDayNo: openResult.fiscalDayNo || nextDayNo,
            fiscalDayOpen: true,
            lastFiscalDayStatus: 'FiscalDayOpened'
          });
          console.log(`Fiscal Day Opened: ${openResult.fiscalDayNo}`);
        } else {
          // Ensure local state is synced if it was somehow out
          if (!company.fiscalDayOpen) {
            await storage.updateCompany(company.id, {
              fiscalDayOpen: true,
              currentFiscalDayNo: status.lastFiscalDayNo,
              lastFiscalDayStatus: 'FiscalDayOpened'
            });
          }
        }
      } catch (e: any) {
        console.error("Auto-Open Day Failed:", e.message);
        return res.status(500).json({ message: `Failed to auto-open fiscal day: ${e.message}` });
      }

      // 1. Get ZIMRA Config for correct Tax IDs
      let zimraConfig: ZimraConfigResponse | undefined;
      try {
        zimraConfig = await device.getConfig();
      } catch (e) {
        console.warn("Failed to fetch ZIMRA config, falling back to defaults for tax mapping");
      }

      // Map Invoice to ReceiptData
      const receiptLines = invoice.items.map((item, index) => {
        const taxPercent = parseFloat(item.taxRate as any);
        let taxID = 0;

        // Try to find matching tax ID from ZIMRA configuration
        if (zimraConfig?.applicableTaxes) {
          const matchingTax = zimraConfig.applicableTaxes.find((t: ZimraTax) =>
            t.taxPercent !== undefined && Math.abs(t.taxPercent - taxPercent) < 0.01
          );
          if (matchingTax) taxID = matchingTax.taxID;
        }

        // Fallback or auto-detect in device class if still 0
        return {
          receiptLineType: 'Sale',
          receiptLineNo: index + 1,
          receiptLineHSCode: item.product?.hsCode || '04021099',
          receiptLineName: item.description,
          receiptLinePrice: parseFloat(Number(item.unitPrice).toFixed(2)),
          receiptLineQuantity: parseFloat(Number(item.quantity).toFixed(2)),
          receiptLineTotal: parseFloat(Number(item.lineTotal).toFixed(2)),
          taxPercent: taxPercent,
          taxID: taxID
        };
      });

      let moneyTypeCode: 'CASH' | 'CARD' | 'OTHER' | 'EFT' | 'MOBILE' = 'CASH';
      const method = invoice.paymentMethod?.toUpperCase() || 'CASH';
      if (['CASH'].includes(method)) moneyTypeCode = 'CASH';
      else if (['CARD', 'SWIPE', 'POS'].includes(method)) moneyTypeCode = 'CARD';
      else if (['MOBILE', 'ECOCASH', 'ONE_MONEY', 'TELE_CASH'].includes(method)) moneyTypeCode = 'MOBILE';
      else if (['EFT', 'RTGS', 'TRANSFER', 'ZIPIT'].includes(method)) moneyTypeCode = 'EFT';
      else moneyTypeCode = 'OTHER';

      const totalAmount = parseFloat(Number(invoice.total).toFixed(2));
      const payments = [{
        moneyTypeCode,
        paymentAmount: totalAmount
      }];

      let buyerData = undefined;
      let creditDebitNote = undefined;
      const transactionType = invoice.transactionType || "FiscalInvoice";
      let receiptType: any = "FiscalInvoice";

      if (transactionType === "CreditNote") receiptType = "CreditNote";
      if (transactionType === "DebitNote") receiptType = "DebitNote";

      // If CN/DN, we need original invoice details
      if (receiptType !== "FiscalInvoice" && invoice.relatedInvoiceId) {
        const original = await storage.getInvoice(invoice.relatedInvoiceId);
        if (original && original.fiscalCode) {
          // Spec 4.7: creditDebitNote: deviceID, receiptGlobalNo, fiscalDayNo
          creditDebitNote = {
            deviceID: parseInt(company.fdmsDeviceId),
            receiptGlobalNo: original.receiptGlobalNo || original.id,
            fiscalDayNo: original.fiscalDayNo || 1
          };
        }
      }

      // Construct Buyer Data
      buyerData = invoice.customer ? {
        buyerRegisterName: invoice.customer.name,
        buyerTradeName: invoice.customer.name,
        vatNumber: invoice.customer.vatNumber || "",
        buyerTIN: invoice.customer.tin || "",
        buyerContacts: {
          phoneNo: invoice.customer.phone || "",
          email: invoice.customer.email || ""
        },
        buyerAddress: {
          province: invoice.customer.city || "",
          city: invoice.customer.city || "",
          street: invoice.customer.address || "",
          houseNo: "",
          district: ""
        }
      } : undefined;

      const nextGlobalNo = invoice.receiptGlobalNo || ((company.lastReceiptGlobalNo || 0) + 1);
      const nextReceiptCounter = invoice.receiptCounter || ((company.dailyReceiptCount || 0) + 1);

      const receiptData: ReceiptData = {
        receiptType: receiptType,
        receiptCurrency: invoice.currency || 'USD',
        receiptCounter: nextReceiptCounter,
        receiptGlobalNo: nextGlobalNo,
        invoiceNo: invoice.invoiceNumber,
        receiptDate: new Date().toISOString().split('.')[0],
        receiptLines: receiptLines as any,
        receiptTaxes: [],
        receiptPayments: payments as any,
        receiptTotal: totalAmount,
        receiptLinesTaxInclusive: invoice.taxInclusive || false,
        buyerData: buyerData,
        creditDebitNote: creditDebitNote,
        receiptNotes: invoice.notes || (receiptType !== 'FiscalInvoice' ? 'Credit Note reversal' : undefined)
      };

      console.log(`[Fiscalize] Prepared Receipt Data for Invoice ${invoiceId}:`, JSON.stringify(receiptData, null, 2));

      // Submit with previous hash for chaining (allow offline fallback)
      const result = await device.submitReceipt(receiptData, company.lastFiscalHash || null, true);

      console.log(`[Fiscalize] Result for Invoice ${invoiceId}:`, JSON.stringify(result, null, 2));

      // Handle validation errors
      const validationResult = result.validationResult;
      let validationStatus = 'valid';
      let validationErrors: any[] = [];

      if (validationResult && !validationResult.valid) {
        validationStatus = validationResult.errors.some(e => e.errorColor === 'Red') ? 'invalid' :
                          validationResult.errors.some(e => e.errorColor === 'Grey') ? 'grey' : 'invalid';

        // Store validation errors
        validationErrors = validationResult.errors.map(error => ({
          invoiceId,
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          errorColor: error.errorColor,
          requiresPreviousReceipt: error.requiresPreviousReceipt
        }));

        // Save validation errors to database
        if (validationErrors.length > 0) {
          await storage.createValidationErrors(validationErrors);
        }
      }

      // Generate QR Code (only if successful and synced)
      let qrCode = '';
      if (result.synced && validationStatus === 'valid') {
        qrCode = device.generateQrCode(result.signature, receiptData.receiptGlobalNo, receiptData.receiptDate);
      }

      const updatedInvoice = await storage.fiscalizeInvoice(invoiceId, {
        fiscalCode: result.hash,
        fiscalSignature: result.signature,
        qrCodeData: qrCode,
        fiscalDayNo: company.currentFiscalDayNo ?? undefined,
        receiptCounter: nextReceiptCounter,
        receiptGlobalNo: nextGlobalNo,
        syncedWithFdms: result.synced,
        fdmsStatus: result.synced ? 'issued' : 'pending',
        validationStatus,
        lastValidationAttempt: new Date()
      });

      // Update Company Counters and Hash ONLY for successful fiscalizations
      if (!invoice.receiptGlobalNo && result.synced && validationStatus === 'valid') {
        await storage.updateCompany(company.id, {
          lastReceiptGlobalNo: nextGlobalNo,
          dailyReceiptCount: nextReceiptCounter,
          lastFiscalHash: result.hash
        });
      }

      // Return invoice with validation errors if any
      const response = {
        ...updatedInvoice,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

      res.json(response);
    } catch (err: any) {
      console.error(err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json({ message: err.message, details: err.details });
      }
      res.status(500).json({ message: "Fiscalization failed", error: err.message });
    }
  });

  // Currency Routes
  app.get(api.currencies.list.path, requireAuth, async (req, res) => {
    const currencies = await storage.getCurrencies(Number(req.params.companyId));
    res.json(currencies);
  });

  app.post(api.currencies.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.currencies.create.input.parse(req.body);
      const currency = await storage.createCurrency({
        ...input,
        companyId: Number(req.params.companyId)
      });
      res.status(201).json(currency);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Failed to create currency" });
    }
  });

  app.patch(api.currencies.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.currencies.update.input.parse(req.body);
      const updated = await storage.updateCurrency(id, input);
      if (!updated) return res.status(404).json({ message: "Currency not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  app.delete(api.currencies.delete.path, requireAuth, async (req, res) => {
    try {
      await storage.deleteCurrency(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete currency" });
    }
  });
  // Convert Quote to Invoice
  app.post("/api/invoices/:id/convert", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const invoice = await storage.getInvoice(id);

      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status !== "quote") {
        return res.status(400).json({ message: "Only quotations can be converted to invoices" });
      }

      // Generate new Invoice Number
      const invoiceNumber = await storage.getNextInvoiceNumber(invoice.companyId, 'INV');

      // Update the invoice
      const converted = await storage.updateInvoice(id, {
        status: "draft",
        invoiceNumber: invoiceNumber,
        issueDate: new Date(),
        fiscalCode: null,
        fiscalSignature: null,
        qrCodeData: null,
        syncedWithFdms: false
      } as any);

      res.json(converted);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: "Failed to convert quotation" });
    }
  });

  // Create Credit Note
  app.post("/api/invoices/:id/credit-note", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const originalInvoice = await storage.getInvoice(id);

      if (!originalInvoice) return res.status(404).json({ message: "Invoice not found" });
      if (originalInvoice.status !== "issued" && originalInvoice.status !== "paid") {
        // Should we allow CN on non-fiscalized? Probably not necessary, just edit/delete.
        // But for consistency let's require it to be issued/fiscalized to warrant a credit note.
        return res.status(400).json({ message: "Credit notes can only be created for issued invoices." });
      }

      // Create new invoice as Credit Note
      // Invoice number will be auto-generated by storage.createInvoice using getNextInvoiceNumber
      const cn = await storage.createInvoice({
        companyId: originalInvoice.companyId,
        customerId: originalInvoice.customerId,
        issueDate: new Date(),
        dueDate: new Date(), // Due immediately?
        subtotal: originalInvoice.subtotal, // Default to full reversal
        taxAmount: originalInvoice.taxAmount,
        total: originalInvoice.total,
        status: "draft",
        taxInclusive: originalInvoice.taxInclusive,
        transactionType: "CreditNote",
        relatedInvoiceId: originalInvoice.id,
        items: originalInvoice.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity, // Positive quantity, logic handles it as credit
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal
        }))
      });

      res.status(201).json(cn);
    } catch (err: any) {
      console.error("Create Credit Note Error:", err);
      res.status(500).json({ message: "Failed to create credit note" });
    }
  });

  // Create Debit Note
  app.post("/api/invoices/:id/debit-note", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const originalInvoice = await storage.getInvoice(id);

      if (!originalInvoice) return res.status(404).json({ message: "Invoice not found" });
      if (originalInvoice.status !== "issued" && originalInvoice.status !== "paid") {
        return res.status(400).json({ message: "Debit notes can only be created for issued invoices." });
      }

      // Create new invoice as Debit Note
      const dn = await storage.createInvoice({
        companyId: originalInvoice.companyId,
        customerId: originalInvoice.customerId,
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: originalInvoice.subtotal,
        taxAmount: originalInvoice.taxAmount,
        total: originalInvoice.total,
        status: "draft",
        taxInclusive: originalInvoice.taxInclusive,
        transactionType: "DebitNote",
        relatedInvoiceId: originalInvoice.id,
        items: originalInvoice.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal
        }))
      });

      res.status(201).json(dn);
    } catch (err: any) {
      console.error("Create Debit Note Error:", err);
      res.status(500).json({ message: "Failed to create debit note" });
    }
  });


  // Email Invoice
  app.post("/api/invoices/:id/email", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const { email, pdfBase64 } = req.body;
      if (!email || !pdfBase64) return res.status(400).json({ message: "Email and PDF content are required" });

      // Convert Base64 (data:application/pdf;base64,...) to Buffer
      const matches = pdfBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ message: "Invalid PDF base64 string" });
      }
      const pdfBuffer = Buffer.from(matches[2], 'base64');

      // Get Company Settings for API Key
      const company = await storage.getCompany(invoice.companyId);
      const emailSettings = company?.emailSettings as any; // Cast jsonb to any or specific interface

      await sendInvoiceEmail(email, invoice.invoiceNumber, pdfBuffer, emailSettings);

      res.json({ message: "Email sent successfully" });
    } catch (err: any) {
      console.error("Email Invoice Error:", err);
      res.status(500).json({ message: "Failed to send email: " + err.message });
    }
  });

  // Invoice Locking
  app.post("/api/invoices/:id/lock", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const success = await storage.lockInvoice(Number(req.params.id), req.user.id);
      if (!success) {
        return res.status(409).json({ message: "Invoice is currently being edited by another user." });
      }
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to lock invoice" });
    }
  });

  app.post("/api/invoices/:id/unlock", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      await storage.unlockInvoice(Number(req.params.id), req.user.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to unlock invoice" });
    }
  });



  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      if (invoice.status !== "draft") {
        return res.status(400).json({ message: "Only draft invoices can be deleted" });
      }

      await storage.deleteInvoice(Number(req.params.id));

      // LOG ACTION
      await logAction(
        invoice.companyId,
        (req as any).user.id,
        "INVOICE_DELETE",
        "invoice",
        String(invoice.id),
        { invoiceNumber: invoice.invoiceNumber }
      );

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });


  // Payments
  app.get("/api/invoices/:invoiceId/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPayments(Number(req.params.invoiceId));
      res.json(payments);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/invoices/:invoiceId/payments", requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.invoiceId);
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      // Validate input
      const input = api.payments.create.input.parse(req.body);

      // Create Payment
      const paymentData = {
        ...input,
        invoiceId,
        companyId: invoice.companyId,
        createdBy: (req as any).user.id,
        // Ensure exchangeRate is string/decimal as per schema
        exchangeRate: input.exchangeRate ? String(input.exchangeRate) : "1.000000",
        // Ensure amount is string/decimal
        amount: String(input.amount)
      };

      const payment = await storage.createPayment(paymentData as any);

      // Check if invoice is fully paid
      const allPayments = await storage.getPayments(invoiceId);
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // If fully paid, update status
      // We only update if it's currently 'issued' or 'partially_paid' (if exists)
      // Note: We don't revert 'paid' status here if overpaid, but we definitely set it if reached.
      if (totalPaid >= Number(invoice.total) && invoice.status !== 'paid') {
        await storage.updateInvoice(invoiceId, { status: "paid" });
      }

      res.status(201).json(payment);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create Payment Error:", err);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.delete("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePayment(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });



  // Create Uploads Dir
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    console.log("Creating uploads directory at:", uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Customer Statement Route
  app.get("/api/customers/:id/statement", requireAuth, async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      const { startDate, endDate, currency } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const data = await storage.getStatementData(customerId, start, end, currency as string);
      res.json(data);
    } catch (err: any) {
      console.error("Statement Error:", err);
      res.status(500).json({ message: err.message || "Failed to generate statement" });
    }
  });

  // Sales Report
  app.get("/api/companies/:id/reports/sales", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ message: "Dates required" });

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await storage.getSalesReport(companyId, start, end);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Payments Report
  app.get("/api/companies/:id/reports/payments", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ message: "Dates required" });

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await storage.getPaymentsReport(companyId, start, end);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });


  // Multer config for generic uploads (Supabase)
  const mainUpload = multer({ storage: multer.memoryStorage() });

  // Upload Route
  app.post("/api/upload", (req, res, next) => {
    // Wrapper to handle multer errors
    mainUpload.single("file")(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer Error:", err);
        return res.status(400).json({ message: "File upload error: " + err.message });
      } else if (err) {
        console.error("Unknown Upload Error:", err);
        return res.status(500).json({ message: "Internal upload error: " + err.message });
      }

      // Success
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded. key 'file' missing?" });
      }

      try {
        if (!supabaseAdmin) throw new Error("Supabase Admin client not configured");

        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { data, error } = await supabaseAdmin.storage
          .from('logos')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('logos')
          .getPublicUrl(filePath);

        console.log("File uploaded successfully to Supabase:", publicUrl);
        res.json({ url: publicUrl });
      } catch (uploadErr: any) {
        console.error("Supabase General Upload Error:", uploadErr);
        res.status(500).json({ message: "Failed to upload file to storage" });
      }
    });
  });

  return httpServer;
}

// Helper to seed database if empty
async function seedDatabase() {
  const testUserEmail = "demo@zimra.com";
  const user = await storage.getUserByEmail(testUserEmail);

  if (!user) {
    console.log("Seeding database...");
    // Create seed logic here if needed
  }
}
