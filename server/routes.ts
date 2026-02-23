
import express, { type Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
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
import { parseStringPromise } from "xml2js";
import crypto from "crypto";
import { logAction } from "./audit.js";
import { startPosShift, endPosShift, addPosTransaction, getOpenShift, getShiftTransactions } from "./lib/pos.js";
import { seedCompanyDefaults } from "./lib/seeding.js";
import { processInvoiceFiscalization, getZimraLogger } from "./lib/fiscalization.js";
import { db } from "./db";
import { eq, and, gte, lte, ne, desc, asc, sql } from "drizzle-orm";
import { format } from "date-fns";
import {
  invoices,
  posShifts,
  posShiftTransactions,
  companies,
  customers,
  products,
  inventoryTransactions,
  suppliers,
  expenses,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertRecurringInvoiceSchema,
  insertPosShiftSchema,
  insertPosHoldSchema,
  insertProductCategorySchema,
  insertSupplierSchema,
  insertExpenseSchema,
  insertTaxTypeSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertCustomerSchema,
  type InsertQuotation,
  type InsertRecurringInvoice
} from "@shared/schema";
import { paynowService } from "./paynow.js";

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



  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Authenticaton required" });
    }
    next();
  };

  const requireOwner = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }

    // If it's a superadmin, they have owner permissions globally
    if (req.user.isSuperAdmin) {
      return next();
    }

    // For specific company check, would need companyId from params or body
    // but at minimum check if they are logged in.
    // Refinement: If companyId is present, we should check their role in that company
    const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
    if (companyId) {
      const companies = await storage.getCompanies(req.user.id);
      const userCompany = companies.find(c => c.id === Number(companyId));
      if (!userCompany || userCompany.role !== 'owner') {
        return res.status(403).json({ message: "Forbidden: Owner access required for this company" });
      }
    }

    next();
  };

  const requireAuthOrApiKey = async (req: any, res: any, next: any) => {
    // API Key check logic
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const company = await db.query.companies.findFirst({
        where: eq(companies.apiKey, apiKey as string)
      });
      if (company) {
        req.company = company;
        return next();
      }
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireSuperAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.isSuperAdmin) return res.status(403).json({ message: "SuperAdmin access required" });
    next();
  };

  app.get("/api/system/mac-address", requireAuth, (req, res) => {
    try {
      const interfaces = os.networkInterfaces();
      const addresses: string[] = [];

      for (const name of Object.keys(interfaces)) {
        const networkInterface = interfaces[name];
        if (!networkInterface) continue;

        for (const iface of networkInterface) {
          // Skip internal (loopback) and non-ipv4/ipv6 addresses
          // We want physical MACs, which usually have a colon-separated format
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            addresses.push(iface.mac.toUpperCase());
          }
        }
      }

      // Return unique MAC addresses
      res.json({ macAddresses: [...new Set(addresses)] });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to detect MAC addresses: " + err.message });
    }
  });


  // Helper to ensure active subscription for production use
  const ensureSubscription = async (company: any, res: any) => {
    if (company.zimraEnvironment === 'production') {
      const activeSub = await storage.getActiveSubscriptionByDevice(
        company.id,
        company.fdmsDeviceSerialNo || "UNKNOWN",
        company.registeredMacAddress || ""
      );
      if (!activeSub) {
        res.status(402).json({
          message: "Active subscription required for PRODUCTION fiscalization",
          suggestion: "Please subscribe your device to enable production mode.",
          deviceSerialNo: company.fdmsDeviceSerialNo,
          macAddress: company.registeredMacAddress
        });
        return false;
      }
    }
    return true;
  };



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
          const categoryHeader = findHeader(row, ['Category', 'Cat', 'Tax Category', 'Group']);

          const trackHeader = findHeader(row, ['Track Inventory', 'Track', 'Inventory Tracking']);

          const name = nameHeader ? (row as any)[nameHeader] : null;
          if (!name) throw new Error("Missing 'Name' column");

          const typeValue = typeHeader ? (row as any)[typeHeader].toLowerCase() : 'good';
          const type = typeValue.includes('service') ? 'service' : 'good';

          // Parse Track Inventory: "Yes", "True", "1" -> true
          const trackValue = trackHeader ? (row as any)[trackHeader].toString().toLowerCase() : "";
          const isTracked = ["yes", "true", "1", "on"].includes(trackValue);

          const productData = {
            companyId: targetCompanyId,
            name: name,
            description: descHeader ? (row as any)[descHeader] : "",
            sku: skuHeader ? (row as any)[skuHeader] : `IMP-${Date.now()}-${index}`,
            price: priceHeader ? cleanNum((row as any)[priceHeader]).toString() : "0.00",
            taxRate: taxHeader ? cleanNum((row as any)[taxHeader]).toString() : "15.5",
            productType: type,
            hsCode: hsHeader ? (row as any)[hsHeader] : "0000.00.00",
            category: categoryHeader ? (row as any)[categoryHeader] : "General",
            isActive: true,
            stockLevel: stockHeader ? cleanNum((row as any)[stockHeader]).toString() : "0.00",
            isTracked: trackHeader ? isTracked : (!!stockHeader && type === 'good')
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


  // Product Categories
  app.get("/api/product-categories", requireAuth, async (req: any, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : req.user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Company ID required" });
      const categories = await storage.getProductCategories(companyId);
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/product-categories", requireAuth, async (req: any, res) => {
    try {
      const result = insertProductCategorySchema.safeParse(req.body);

      if (!result.success) {
        console.error(`[ROUTES] Category validation failed:`, result.error.format());
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.format()
        });
      }

      const category = await storage.createProductCategory({
        ...result.data,
        companyId: req.user?.companyId || result.data.companyId
      });

      res.status(201).json(category);
    } catch (err: any) {
      console.error(`[ROUTES] Category creation error: ${err.message}`, err);
      if (err.code === "23505") {
        return res.status(409).json({ message: "Category already exists" });
      }
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.delete("/api/product-categories/:id", requireAuth, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Authenticated session required" });
      await storage.deleteProductCategory(Number(req.params.id), companyId);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Company Routes
  app.get(api.companies.list.path, requireAuth, async (req, res) => {
    const companies = await storage.getCompanies((req as any).user?.id);
    res.json(companies);
  });

  app.post("/api/companies/:companyId/api-key", requireOwner, async (req, res) => {
    const companyId = parseInt(req.params.companyId);
    // Generate a secure random API key
    const apiKey = await import("crypto").then(c => c.randomBytes(32).toString("hex"));

    const updatedCompany = await storage.updateCompany(companyId, { apiKey });
    // Log the action for security audit
    await logAction(
      req.user!.id,
      companyId,
      "UPDATE_COMPANY_SETTINGS",
      "Using Settings",
      { action: "generated_api_key" }
    );

    res.json({ apiKey });
  });

  app.post(api.companies.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input, (req as any).user?.id);

      // Seed default data (Tax Types, Products, Customer, Draft Invoices)
      // We don't await this to keep response fast, but logging errors inside
      seedCompanyDefaults(company.id).catch(err => console.error("Seeding Failed:", err));

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
    let company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ZIMRA Auto-Repair: QR URL
    // If QR URL is missing but we have ZIMRA credentials, fetch it now.
    if (!company.qrUrl && company.fdmsDeviceId && company.zimraPrivateKey && company.zimraCertificate) {
      try {
        console.log(`[ZIMRA] Auto-fetching missing QR URL for Company ${company.id}`);
        const device = new ZimraDevice({
          deviceId: company.fdmsDeviceId,
          deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
          activationKey: company.fdmsApiKey || "",
          privateKey: company.zimraPrivateKey,
          certificate: company.zimraCertificate,
          baseUrl: company.zimraEnvironment === 'production' ? 'https://fdmsapi.zimra.co.zw' : 'https://fdmsapitest.zimra.co.zw'
        }, getZimraLogger(company.id));

        const config = await device.getConfig();
        if (config && config.qrUrl) {
          await storage.updateCompany(company.id, { qrUrl: config.qrUrl });
          company.qrUrl = config.qrUrl; // Update local instance
          console.log(`[ZIMRA] QR URL Updated: ${config.qrUrl}`);
        }
      } catch (e: any) {
        console.warn(`[ZIMRA] Auto-Repair Failed: ${e.message}`);
        // Non-fatal, return company as is
      }
    }

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
      if (environment === 'production') {
        const macAddress = company.registeredMacAddress || "";
        const hasSub = await storage.hasActiveSubscriptionByMac(companyId, macAddress);

        if (!hasSub) {
          return res.status(402).json({
            message: "Active subscription required for PRODUCTION environment",
            suggestion: "Please subscribe your device to enable production mode.",
            macAddress: macAddress
          });
        }
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




  app.put("/api/companies/:id/users/:userId/pin", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      // Verify admin/owner permission logic here if needed

      const { pin } = req.body;
      if (!pin || pin.length < 4) {
        return res.status(400).json({ message: "PIN must be at least 4 digits" });
      }

      const userId = req.params.userId;

      // Hash PIN
      await storage.setUserPin(userId, pin);

      // Log action
      await logAction(
        req.user!.id,
        companyId,
        "UPDATE_USER_PIN",
        "User Management",
        { targetUserId: userId }
      );

      res.json({ message: "PIN updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // ============================================================================
  // POS (SHIFTS & HOLDS)
  // ============================================================================

  app.get("/api/pos/holds", requireAuth, async (req, res) => {
    try {
      const companyId = (req.user as any).id ? (await storage.getCompanies((req.user as any).id))[0].id : req.body.companyId;
      // Simplified: usually companyId is taken from user context or request
      const targetCompanyId = req.query.companyId ? parseInt(req.query.companyId as string) : (req as any).user?.companyId;

      const holds = await storage.getPosHolds(targetCompanyId, (req.user as any).id);
      res.json(holds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pos/holds", requireAuth, async (req, res) => {
    try {
      const data = insertPosHoldSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      const hold = await storage.createPosHold(data);
      res.status(201).json(hold);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/pos/holds/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePosHold(parseInt(req.params.id), (req.user as any).id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pos/shifts/current", requireAuth, async (req, res) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : (req as any).user?.companyId;
      const shift = await storage.getActivePosShift(companyId, (req.user as any).id);
      res.json(shift || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pos/shifts/open", requireAuth, async (req, res) => {
    try {
      const data = insertPosShiftSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
        status: "open"
      });
      const shift = await storage.createPosShift(data);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/pos/shifts/:id/close", requireAuth, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const { actualCash, closingBalance, notes } = req.body;

      // Support both naming conventions for compatibility
      const cashAmount = actualCash !== undefined ? actualCash : closingBalance;

      if (cashAmount === undefined || cashAmount === null) {
        return res.status(400).json({ message: "Actual cash count is required to close shift." });
      }

      const shift = await endPosShift(shiftId, Number(cashAmount), notes);
      res.json(shift);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // API KEY MANAGEMENT ENDPOINTS
  // ============================================================================

  // Utility: Generate API Key
  const generateApiKey = (environment: 'test' | 'production'): string => {
    const prefix = environment === 'production' ? 'sk_live_' : 'sk_test_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  };

  // Utility: Get API Key Prefix (for display)
  const getApiKeyPrefix = (apiKey: string): string => {
    return apiKey.substring(0, 12) + '...';
  };

  // 1. POST /api/companies/:id/api-keys/generate - Generate New API Key
  app.post("/api/companies/:id/api-keys/generate", requireOwner, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Check if company already has an API key
      if (company.apiKey) {
        return res.status(400).json({
          message: "Company already has an API key. Use rotate endpoint to generate a new one.",
          hasExistingKey: true
        });
      }

      const environment = (company.zimraEnvironment || 'test') as 'test' | 'production';
      const apiKey = generateApiKey(environment);

      // Save API key to database
      await storage.updateCompany(companyId, {
        apiKey: apiKey,
        apiKeyCreatedAt: new Date()
      });

      // Log the action
      await logAction(
        companyId,
        (req.user as any)?.id || 'system',
        'api_key_generated',
        'company',
        companyId.toString(),
        { environment }
      );

      res.json({
        success: true,
        apiKey: apiKey, // ONLY time the full key is shown
        prefix: getApiKeyPrefix(apiKey),
        environment,
        createdAt: new Date(),
        warning: "Store this key securely. You won't be able to see it again."
      });

    } catch (err: any) {
      console.error("Generate API Key Error:", err);
      res.status(500).json({ message: "Failed to generate API key: " + err.message });
    }
  });

  // 2. POST /api/companies/:id/api-keys/rotate - Rotate API Key
  app.post("/api/companies/:id/api-keys/rotate", requireOwner, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!company.apiKey) {
        return res.status(400).json({
          message: "No existing API key to rotate. Use generate endpoint first."
        });
      }

      const environment = (company.zimraEnvironment || 'test') as 'test' | 'production';
      const newApiKey = generateApiKey(environment);

      // Update with new key
      await storage.updateCompany(companyId, {
        apiKey: newApiKey,
        apiKeyCreatedAt: new Date()
      });

      // Log the action
      await logAction(
        companyId,
        (req.user as any)?.id || 'system',
        'api_key_rotated',
        'company',
        companyId.toString(),
        { environment }
      );

      res.json({
        success: true,
        apiKey: newApiKey, // ONLY time the full key is shown
        prefix: getApiKeyPrefix(newApiKey),
        environment,
        createdAt: new Date(),
        warning: "Old API key has been invalidated. Update your integrations with the new key."
      });

    } catch (err: any) {
      console.error("Rotate API Key Error:", err);
      res.status(500).json({ message: "Failed to rotate API key: " + err.message });
    }
  });

  // 3. GET /api/companies/:id/api-keys - List API Keys (metadata only)
  app.get("/api/companies/:id/api-keys", requireOwner, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!company.apiKey) {
        return res.json({
          hasApiKey: false,
          message: "No API key generated yet"
        });
      }

      res.json({
        hasApiKey: true,
        prefix: getApiKeyPrefix(company.apiKey),
        environment: company.zimraEnvironment || 'test',
        createdAt: company.apiKeyCreatedAt,
        lastUsed: company.apiKeyLastUsed || null
      });

    } catch (err: any) {
      console.error("List API Keys Error:", err);
      res.status(500).json({ message: "Failed to list API keys: " + err.message });
    }
  });

  // 4. DELETE /api/companies/:id/api-keys - Revoke API Key
  app.delete("/api/companies/:id/api-keys", requireOwner, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!company.apiKey) {
        return res.status(400).json({
          message: "No API key to revoke"
        });
      }

      // Revoke the key
      await storage.updateCompany(companyId, {
        apiKey: null,
        apiKeyCreatedAt: null,
        apiKeyLastUsed: null
      });

      // Log the action
      await logAction(
        companyId,
        (req.user as any)?.id || 'system',
        'api_key_revoked',
        'company',
        companyId.toString(),
        {}
      );

      res.json({
        success: true,
        message: "API key has been revoked successfully"
      });

    } catch (err: any) {
      console.error("Revoke API Key Error:", err);
      res.status(500).json({ message: "Failed to revoke API key: " + err.message });
    }
  });

  // ============================================================================
  // END API KEY MANAGEMENT
  // ============================================================================

  // Company Zimra Registration
  app.post("/api/companies/:id/zimra/register", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { deviceId, activationKey, deviceSerialNo } = req.body;

      if (!deviceId || !activationKey || !deviceSerialNo) {
        return res.status(400).json({ message: "Missing required ZIMRA fields: deviceId, activationKey, deviceSerialNo" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });

      // Determine Base URL based on Company Environment
      const baseUrl = company.zimraEnvironment === 'production'
        ? 'https://fdmsapi.zimra.co.zw'
        : 'https://fdmsapitest.zimra.co.zw';

      // Instantiate device just for registration (no keys yet)
      const device = new ZimraDevice({
        deviceId,
        deviceSerialNo,
        activationKey,
        baseUrl: baseUrl
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

      // Auto-sync tax configuration
      try {
        // Initialize device with new credentials to fetch config
        const syncedDevice = new ZimraDevice({
          deviceId,
          deviceSerialNo,
          activationKey,
          privateKey: keys.privateKey,
          certificate: keys.certificate,
          baseUrl: baseUrl
        }, getZimraLogger(companyId));

        const config = await syncedDevice.getConfig();
        const taxes = config.applicableTaxes || config.taxLevels || [];

        if (taxes.length > 0) {
          await storage.syncTaxTypes(companyId, taxes);
          console.log(`[AutoSync] Synced ${taxes.length} tax types for company ${companyId}`);
        }
      } catch (syncErr: any) {
        console.warn(`[AutoSync] Failed to auto-sync taxes:`, syncErr.message);
        // Continue to return success for registration even if sync fails
      }

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

      const company = await storage.getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });

      const baseUrl = company.zimraEnvironment === 'production'
        ? 'https://fdmsapi.zimra.co.zw'
        : 'https://fdmsapitest.zimra.co.zw';

      // Instantiate device with provided credentials (not yet saved)
      const device = new ZimraDevice({
        deviceId,
        deviceSerialNo,
        activationKey,
        baseUrl: baseUrl
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
        baseUrl: getZimraBaseUrl(company.zimraEnvironment || 'test')
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
        baseUrl: getZimraBaseUrl(company.zimraEnvironment || 'test')
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
      // Check if current user belongs to company OR is SuperAdmin
      const user = (req as any).user;
      const isMember = args.find(u => u.id === user.id);

      if (!isMember && !user.isSuperAdmin) {
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
      const { email, role, name, username, password } = req.body;

      if (!email) return res.status(400).json({ message: "Email is required" });

      // Validate role
      const validRoles = ['owner', 'admin', 'member', 'cashier'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Permission check
      const companyUsersList = await storage.getCompanyUsers(companyId);
      const me = companyUsersList.find(u => u.id === userId);
      const isSuperAdmin = (req as any).user?.isSuperAdmin;

      if (!isSuperAdmin && (!me || (me.role !== 'owner' && me.role !== 'admin'))) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Check if user exists in system
      let userToAdd = await storage.getUserByEmail(email);

      if (!userToAdd) {
        // Create user in Supabase first
        if (!supabaseAdmin) {
          return res.status(500).json({ message: "Supabase Admin client not configured" });
        }

        const defaultPassword = password || "Zimra123!"; // Secure default or provided

        const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { name: name || email.split('@')[0], full_name: name }
        });

        if (sbError) {
          console.error("Supabase Admin Create User Error:", sbError);
          return res.status(400).json({ message: "Failed to create user in auth system: " + sbError.message });
        }

        if (!sbUser) return res.status(500).json({ message: "No user returned from Auth" });

        // Create in our DB
        userToAdd = await storage.createUser({
          id: sbUser.id,
          email: sbUser.email!,
          name: name || sbUser.user_metadata?.name || "New User",
          username: username || email.split('@')[0],
          password: "", // Handled by Supabase
          passwordChanged: false
        });
      }

      // Check if already in company
      if (companyUsersList.find(u => u.id === userToAdd.id)) {
        return res.status(409).json({ message: "User already in company" });
      }

      await storage.addUserToCompany(userToAdd.id, companyId, role || 'member');
      res.status(201).json({ message: "User added successfully", user: userToAdd });

    } catch (err: any) {
      console.error("Add User Error:", err);
      res.status(500).json({ message: "Failed to add user: " + err.message });
    }
  });

  // 2.1 Change Password (Local & Supabase sync)
  app.post("/api/user/password", requireAuth, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) return res.status(400).json({ message: "New password is required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const userId = (req as any).user.id;

      // Update in Supabase
      if (!supabaseAdmin) return res.status(500).json({ message: "Admin client not configured" });

      const { error: sbError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (sbError) {
        console.error("STpabase Update Password Error:", sbError);
        return res.status(400).json({ message: "Failed to update password in auth system: " + sbError.message });
      }

      // Update local flag
      await storage.updateUser(userId, { passwordChanged: true });

      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Change Password Error:", err);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // 3. Update User Role
  app.patch("/api/companies/:companyId/users/:userId", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const targetUserId = req.params.userId;
      const userId = (req as any).user.id;
      const { role } = req.body;

      // Validate role
      const validRoles = ['owner', 'admin', 'member', 'cashier'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const users = await storage.getCompanyUsers(companyId);
      const me = users.find(u => u.id === userId);
      const isSuperAdmin = (req as any).user?.isSuperAdmin;

      if (!isSuperAdmin) {
        if (!me || me.role !== 'owner') {
          if (me?.role !== 'admin') return res.status(403).json({ message: "Insufficient permissions" });
        }
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
      const isSuperAdmin = (req as any).user?.isSuperAdmin;

      if (!isSuperAdmin && (!me || (me.role !== 'owner' && me.role !== 'admin'))) {
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
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Provide more specific feedback about what's missing
      const missingFields = [];
      if (!company.fdmsDeviceId) missingFields.push("Device ID");
      if (!company.zimraPrivateKey) missingFields.push("Private Key");
      if (!company.zimraCertificate) missingFields.push("Certificate");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Company is not fully registered with ZIMRA",
          details: `Missing: ${missingFields.join(", ")}. Please complete registration in ZIMRA settings.`,
          isRegistered: false
        });
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: "UNKNOWN", // Should be stored?
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey,
        certificate: company.zimraCertificate || "",
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      const status = await device.getStatus();

      // Update local state
      await storage.updateCompany(companyId, {
        currentFiscalDayNo: status.lastFiscalDayNo,
        lastFiscalDayStatus: status.fiscalDayStatus,
        lastReceiptGlobalNo: status.lastReceiptGlobalNo,
        dailyReceiptCount: status.lastReceiptCounter, // Syncing daily receipt count
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
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      // Get Config from ZIMRA
      const config = await device.getConfig();

      // Use applicableTaxes (spec-compliant) or fallback to taxLevels (legacy)
      const taxes = config.applicableTaxes || config.taxLevels || [];

      if (!config || taxes.length === 0) {
        throw new Error("Invalid config response from ZIMRA: Missing tax information");
      }

      // Sync with DB
      const syncedTaxes = await storage.syncTaxTypes(companyId, taxes);

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
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
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
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
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
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      // 1. Subscription Check
      if (!await ensureSubscription(company, res)) return;

      // 2. Check current status first
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
        fiscalDayOpenedAt: new Date(), // Critical for RCPT014 validation
        dailyReceiptCount: 0, // Reset daily counter
        lastFiscalHash: null  // Clear hash chain for new day
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

      // Check if fiscal day is actually open or failed close
      if (!company.fiscalDayOpen && company.lastFiscalDayStatus !== 'FiscalDayCloseFailed') {
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
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      const fiscalDayNo = company.currentFiscalDayNo || 0;

      // Get all invoices for this fiscal day and find the max receipt counter
      // Note: We can't use company.dailyReceiptCount because it gets reset to 0 after closing the day
      const dayInvoices = await storage.getInvoicesByFiscalDay(companyId, fiscalDayNo);
      const maxReceiptCounter = dayInvoices.reduce((max, inv) => {
        return Math.max(max, inv.receiptCounter || 0);
      }, 0);
      const receiptCounter = maxReceiptCounter;

      console.log(`[CloseDay] Starting closure for Fiscal Day ${fiscalDayNo}, Company ${companyId}`);
      console.log(`[CloseDay] Receipt Counter: ${receiptCounter} (from ${dayInvoices.length} invoices)`);

      // Calculate Counters from DB transactions for this day
      const counters = await storage.calculateFiscalCounters(companyId, fiscalDayNo);
      console.log(`[CloseDay] Calculated ${counters.length} fiscal counters`);

      const formatHarareDateOnly = (date: Date) => {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Harare',
          year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(date);
        const p = (t: string) => parts.find(x => x.type === t)?.value;
        return `${p('year')}-${p('month')}-${p('day')}`;
      };

      // Spec 13.3.1: fiscalDayDate must be the "date when fiscal day was opened".
      let fiscalDayDate = formatHarareDateOnly(new Date());
      if (company.fiscalDayOpenedAt) {
        fiscalDayDate = formatHarareDateOnly(new Date(company.fiscalDayOpenedAt));
      }

      // Pre-check for Red or Grey receipts
      const invalidReceipts = dayInvoices.filter(inv =>
        inv.validationStatus === 'red' || inv.validationStatus === 'grey' || inv.validationStatus === 'invalid'
      );

      if (invalidReceipts.length > 0) {
        return res.status(400).json({
          message: `Cannot close fiscal day ${fiscalDayNo}. There are ${invalidReceipts.length} receipts with 'Red' or 'Grey' validation errors that must be resolved first.`,
          invalidReceipts: invalidReceipts.map(r => ({ id: r.id, number: r.invoiceNumber, status: r.validationStatus }))
        });
      }

      // Retry mechanism for fiscal day closure
      let lastError: any = null;
      let result: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[CloseDay] Attempt ${attempt}/${maxRetries} to close fiscal day ${fiscalDayNo}`);

          result = await device.closeDay(
            fiscalDayNo,
            fiscalDayDate, // Use the OPENING date
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
              "Verify there are no 'Red' or 'Grey' validation status receipts",
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


      // ------------------------------------------------------------------
      // CRITICAL VERIFICATION: Check if ZIMRA actually closed the day
      // ------------------------------------------------------------------
      console.log(`[CloseDay] Verifying closure status with ZIMRA...`);
      try {
        // Wait for ZIMRA to process the closure (5 seconds as per user request/best practice)
        await new Promise(resolve => setTimeout(resolve, 4000));
        const status = await device.getStatus() as any;
        console.log(`[CloseDay] Verification Status:`, JSON.stringify(status, null, 2));

        if (status.fiscalDayStatus === 'FiscalDayCloseFailed') {
          console.error(`[CloseDay] ✗ ZIMRA reported FiscalDayCloseFailed even after API returned success.`);

          // Update local state to reflect failure
          await storage.updateCompany(companyId, {
            lastFiscalDayStatus: 'FiscalDayCloseFailed'
          });

          // Map specific error codes to user-friendly messages
          const errorCode = status.fiscalDayClosingErrorCode || "UnknownError";
          const errorMessages: Record<string, string> = {
            "BadCertificateSignature": "Close day is not allowed. Invalid certificate signature detected.",
            "MissingReceipts": "Close day is not allowed. One or more receipts are missing form the sequence (Grey Error).",
            "ReceiptsWithValidationErrors": "Close day is not allowed. There are receipts with validation errors (Red Error).",
            "CountersMismatch": "Close day is not allowed. Internal device counters do not match submitted totals."
          };

          const userMessage = errorMessages[errorCode] || `Fiscal day closure failed with error: ${errorCode}`;
          const detailedDesc = "ZIMRA rejected the closure request during verification.";

          return res.status(400).json({
            message: userMessage,
            fiscalDayStatus: status.fiscalDayStatus,
            fiscalDayClosingErrorCode: errorCode,
            details: detailedDesc,
            recovery: "Please resolve the specific validation error above before retrying closure."
          });
        }
      } catch (verifyErr) {
        console.warn(`[CloseDay] ⚠️ Failed to verify status after closure (Network issue?):`, verifyErr);
        // Proceed with caution, assuming success from the first call if verification fails due to network
      }

      // Success! Update company state
      +console.log(`[CloseDay] Updating company state after successful verified closure`);

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

      // Pre-generate Z-Report data for the response
      const reportData = await storage.getZReportData(companyId, fiscalDayNo);

      res.json({
        success: true,
        message: `Fiscal day ${fiscalDayNo} closed successfully`,
        fiscalDayNo,
        receiptCounter,
        countersSubmitted: counters.length,
        result,
        reportData
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

  app.get("/api/companies/:id/zimra/day/x-report", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);
      if (!company || !company.fiscalDayOpen) {
        return res.status(400).json({ message: "No open fiscal day" });
      }
      const data = await storage.getZReportData(companyId, company.currentFiscalDayNo || 0);
      res.json(data);
    } catch (err: any) {
      console.error("X-Report Error:", err);
      res.status(500).json({ message: "Failed to generate X-Report: " + err.message });
    }
  });

  // Z-Report endpoint - fetch report data for any closed fiscal day
  app.get("/api/companies/:id/zimra/day/z-report", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!company.fdmsDeviceId || !company.zimraCertificate) {
        return res.status(400).json({
          message: "ZIMRA Reporting Unavailable",
          details: "This company is not registered with ZIMRA. Please configure your ZIMRA details in Settings first."
        });
      }

      // Get the fiscal day number from query params or use the last closed day
      const fiscalDayNo = req.query.fiscalDayNo
        ? Number(req.query.fiscalDayNo)
        : company.currentFiscalDayNo || 0;

      // Verify the day is closed (or allow if explicitly requested)
      if (company.fiscalDayOpen && fiscalDayNo === company.currentFiscalDayNo) {
        return res.status(400).json({
          message: "Cannot generate Z-Report for an open fiscal day. Close the day first or generate an X-Report instead."
        });
      }

      const data = await storage.getZReportData(companyId, fiscalDayNo);
      res.json(data);
    } catch (err: any) {
      console.error("Z-Report Error:", err);
      res.status(500).json({ message: "Failed to generate Z-Report: " + err.message });
    }
  });

  // Maintenance: Clear Test Invoices
  app.post("/api/companies/:id/invoices/clear-test", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // Permission Check: Only Owner or Admin can clear test data
      const role = await storage.getCompanyUserRole((req.user as any).id, companyId);
      const isSuperAdmin = (req.user as any).isSuperAdmin;

      if (!isSuperAdmin && role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Owner or Admin access required to clear data" });
      }

      const deletedCount = await storage.clearTestInvoices(companyId);

      // Log the action for audit
      await logAction(
        companyId,
        (req.user as any).id,
        'clear_test_invoices',
        'invoice',
        'all_test',
        { deletedCount }
      );

      res.json({
        success: true,
        message: `Successfully cleared ${deletedCount} test invoices and related records.`,
        deletedCount
      });
    } catch (err: any) {
      console.error("Clear Test Invoices Error:", err);
      res.status(500).json({ message: "Failed to clear test invoices: " + err.message });
    }
  });

  // ==========================================
  // RevMax/ZIMRA API Endpoints
  // ==========================================

  // Helper function to parse XML items
  async function parseItemsXML(itemsXML: string): Promise<any[]> {
    try {
      const parsed = await parseStringPromise(itemsXML, { explicitArray: false });
      const items = parsed.ITEMS.ITEM;
      return Array.isArray(items) ? items : [items];
    } catch (error: any) {
      throw new Error(`Invalid ITEMSXML format: ${error.message}`);
    }
  }

  // Helper function to parse XML currencies
  async function parseCurrenciesXML(currenciesXML: string): Promise<any[]> {
    try {
      const parsed = await parseStringPromise(currenciesXML, { explicitArray: false });
      const currencies = parsed.CurrenciesReceived.Currency;
      return Array.isArray(currencies) ? currencies : [currencies];
    } catch (error: any) {
      throw new Error(`Invalid CURRENCIES XML format: ${error.message}`);
    }
  }

  // Helper function to format RevMax response
  function formatRevMaxResponse(code: string, message: string, data: any = {}, company?: any) {
    return {
      Code: code,
      Message: message,
      DeviceID: company?.fdmsDeviceId || "",
      DeviceSerialNumber: company?.fdmsDeviceSerialNo || "",
      FiscalDay: company?.currentFiscalDayNo?.toString() || "",
      QRcode: data.qrCode || data.QRcode || "",
      VerificationCode: data.verificationCode || data.VerificationCode || "",
      Data: data.Data || data
    };
  }

  // 1. GET /api/zimra/device-details - GetCardDetails
  app.get("/api/zimra/device-details", requireAuthOrApiKey, async (req, res) => {
    try {
      // Get the companyId from query or session
      let companyId = parseInt(req.query.companyId as string);

      if (!companyId) {
        const user = req.user as any;
        companyId = user?.companyId;
      }

      // If still no companyId, fetch the first registered company (fallback for easy integration)
      if (!companyId) {
        const allCompanies = await db.select().from(companies).limit(1);
        if (allCompanies.length > 0) {
          companyId = allCompanies[0].id;
        }
      }

      if (!companyId) {
        return res.status(404).json(formatRevMaxResponse("0", "Device not found or not registered"));
      }

      const company = await storage.getCompany(companyId);
      if (!company || !company.fdmsDeviceId) {
        return res.status(404).json(formatRevMaxResponse("0", "Device not found or not registered"));
      }

      const response = formatRevMaxResponse("1", "Success", {
        TIN: company.tin || "",
        BPN: company.bpNumber || "",
        VAT: company.vatNumber || "",
        COMPANYNAME: company.name || "",
        ADDRESS: company.address || "",
        REGISTRATIONNUMBER: company.fdmsDeviceId || "",
        SERIALNUMBER: company.fdmsDeviceSerialNo || ""
      }, company);

      res.json(response);
    } catch (err: any) {
      console.error("GetCardDetails Error:", err);
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`));
    }
  });

  // 2. GET /api/companies/:id/zimra/device-status - GetDeviceStatus (RevMax format)
  app.get("/api/companies/:id/zimra/device-status", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company || !company.fdmsDeviceId || !company.zimraPrivateKey) {
        return res.status(400).json(formatRevMaxResponse("0", "Company not registered with ZIMRA"));
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey,
        certificate: company.zimraCertificate || "",
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      const status = await device.getStatus();

      // Update local state
      await storage.updateCompany(companyId, {
        currentFiscalDayNo: status.lastFiscalDayNo,
        lastFiscalDayStatus: status.fiscalDayStatus,
        lastReceiptGlobalNo: status.lastReceiptGlobalNo,
        dailyReceiptCount: status.lastReceiptCounter, // Syncing daily receipt count
        fiscalDayOpen: status.fiscalDayStatus === 'FiscalDayOpened'
      });

      const response = formatRevMaxResponse("1", "Success", {
        fiscalDayStatus: status.fiscalDayStatus,
        lastReceiptGlobalNo: status.lastReceiptGlobalNo,
        lastFiscalDayNo: status.lastFiscalDayNo,
        operationID: status.operationID || ""
      }, company);

      res.json(response);
    } catch (err: any) {
      console.error("GetDeviceStatus Error:", err);
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json(formatRevMaxResponse("0", err.message));
      }
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`));
    }
  });

  // 3. POST /api/companies/:id/zimra/transact - TransactM
  app.post("/api/companies/:id/zimra/transact", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json(formatRevMaxResponse("0", "Company not registered with ZIMRA", {}, company));
      }

      const {
        CURRENCY,
        CUSTOMEREMAIL,
        INVOICENUMBER,
        CUSTOMERNAME,
        CUSTOMERVATNUMBER,
        CUSTOMERADDRESS,
        CUSTOMERTELEPHONENUMBER,
        CUSTOMERTIN,
        INVOICEAMOUNT,
        INVOICETAXAMOUNT,
        INVOICEFLAG,
        ORIGINALINVOICENUMBER,
        INVOICECOMMENT,
        ITEMSXML,
        CURRENCIES
      } = req.body;

      // Validate required fields
      if (!CURRENCY || !INVOICENUMBER || !INVOICEAMOUNT || !INVOICETAXAMOUNT || !INVOICEFLAG || !ITEMSXML || !CURRENCIES) {
        return res.status(400).json(formatRevMaxResponse("0", "Missing required fields", {}, company));
      }

      // Parse XML
      const items = await parseItemsXML(ITEMSXML);
      const currencies = await parseCurrenciesXML(CURRENCIES);

      // Create invoice in database
      const invoiceData: any = {
        companyId,
        invoiceNumber: INVOICENUMBER,
        customerName: CUSTOMERNAME || "Walk-in Customer",
        customerEmail: CUSTOMEREMAIL || null,
        customerVatNumber: CUSTOMERVATNUMBER || null,
        customerAddress: CUSTOMERADDRESS || null,
        customerPhone: CUSTOMERTELEPHONENUMBER || null,
        issueDate: new Date(),
        dueDate: new Date(),
        currency: CURRENCY,
        total: parseFloat(INVOICEAMOUNT),
        taxAmount: parseFloat(INVOICETAXAMOUNT),
        status: INVOICEFLAG === "01" ? "draft" : "draft",
        notes: INVOICECOMMENT || null,
        originalInvoiceNumber: ORIGINALINVOICENUMBER || null
      };

      const invoice = await storage.createInvoice(invoiceData);

      // Fetch tax types for resolution
      const taxTypes = await storage.getTaxTypes(companyId);

      // Create line items
      for (const item of items) {
        const taxRate = parseFloat(item.TAXR || "0");
        const xmlTaxCode = item.TAXCODE;
        const xmlTaxId = item.TAXID;

        // Find matching tax type
        let matchedTax = taxTypes.find(t =>
          Math.abs(parseFloat(t.rate) - taxRate) < 0.01 &&
          (xmlTaxCode ? t.zimraCode === xmlTaxCode : true) &&
          (xmlTaxId ? t.zimraTaxId === xmlTaxId : true)
        );

        // Fallback for 0% ambiguity if multiple matches exist
        if (!matchedTax && taxRate === 0) {
          matchedTax = taxTypes.find(t =>
            Math.abs(parseFloat(t.rate) - taxRate) < 0.01 &&
            (xmlTaxCode === 'EXE' || (item.ITEMNAME1 || '').toLowerCase().includes('exempt') ? t.zimraTaxId === "1" : t.zimraTaxId === "2")
          );
        }

        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.ITEMNAME1 || item.ITEMNAME2 || "Item",
          quantity: parseFloat(item.QTY || "1"),
          unitPrice: parseFloat(item.PRICE || "0"),
          taxRate: taxRate.toString(),
          taxTypeId: matchedTax?.id,
          total: parseFloat(item.AMT || "0")
        });
      }

      // Fiscalize the invoice
      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      // Subscription Check
      if (!await ensureSubscription(company, res)) return;

      // Get invoice details for fiscalization
      const fullInvoice = await storage.getInvoice(invoice.id);
      if (!fullInvoice) {
        throw new Error("Failed to retrieve created invoice");
      }

      const receiptData = await device.fiscalizeInvoice(fullInvoice as any, company as any, taxTypes);

      // Update invoice with fiscal data
      await storage.updateInvoice(invoice.id, {
        fiscalCode: receiptData.hash,
        qrCodeData: receiptData.qrCode,
        status: "issued",
        syncedWithFdms: true,
        receiptGlobalNo: receiptData.receiptGlobalNo,
        receiptCounter: receiptData.receiptCounter,
        fiscalDayNo: company.currentFiscalDayNo ?? undefined,
        issueDate: fullInvoice.issueDate // Keep original issue date if needed, but signature uses receiptData.receiptDate
      });

      // CRITICAL: Update Company Counters to maintain chain
      await storage.updateCompany(companyId, {
        lastReceiptGlobalNo: receiptData.receiptGlobalNo,
        dailyReceiptCount: receiptData.receiptCounter,
        lastFiscalHash: receiptData.hash
      });

      const response = formatRevMaxResponse("1", "Upload Success - Transacted to Card", {
        receipt: receiptData,
        qrCode: receiptData.qrCode,
        verificationCode: receiptData.verificationCode
      }, company);

      res.json(response);
    } catch (err: any) {
      console.error("TransactM Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Transaction error: ${err.message}`, {}, company || undefined));
    }
  });

  // 4. POST /api/companies/:id/zimra/transact-ext - TransactMExt
  app.post("/api/companies/:id/zimra/transact-ext", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const company = await storage.getCompany(companyId);

      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json(formatRevMaxResponse("0", "Company not registered with ZIMRA", {}, company));
      }

      const {
        Currency,
        InvoiceNumber,
        InvoiceAmount,
        InvoiceTaxAmount,
        InvoiceFlag,
        InvoiceComment,
        OriginalInvoiceNumber,
        ItemsXML,
        Currencies,
        CustomerEmail,
        CustomerRegisteredName,
        CustomerTradeName,
        CustomerVATNumber,
        CustomerTIN,
        CustomerTelephoneNumber,
        CustomerFullAddress,
        buyerProvince,
        buyerStreet,
        buyerHouseNo,
        buyerCity,
        refDeviceId,
        refReceiptGlobalnumber,
        refFiscalDay
      } = req.body;

      // Validate required fields
      if (!Currency || !InvoiceNumber || !InvoiceAmount || !InvoiceTaxAmount || !InvoiceFlag || !ItemsXML || !Currencies) {
        return res.status(400).json(formatRevMaxResponse("0", "Missing required fields", {}, company));
      }

      // Parse XML
      const items = await parseItemsXML(ItemsXML);
      const currencies = await parseCurrenciesXML(Currencies);

      // Build full address from granular fields
      const fullAddress = [buyerHouseNo, buyerStreet, buyerCity, buyerProvince]
        .filter(Boolean)
        .join(", ") || CustomerFullAddress || "";

      // Create invoice with extended fields
      const invoiceData: any = {
        companyId,
        invoiceNumber: InvoiceNumber,
        customerName: CustomerRegisteredName || CustomerTradeName || "Walk-in Customer",
        customerEmail: CustomerEmail || null,
        customerVatNumber: CustomerVATNumber || null,
        customerAddress: fullAddress || null,
        customerPhone: CustomerTelephoneNumber || null,
        issueDate: new Date(),
        dueDate: new Date(),
        currency: Currency,
        total: parseFloat(InvoiceAmount),
        taxAmount: parseFloat(InvoiceTaxAmount),
        status: InvoiceFlag === "01" ? "draft" : "draft",
        notes: InvoiceComment || null,
        originalInvoiceNumber: OriginalInvoiceNumber || null
      };

      const invoice = await storage.createInvoice(invoiceData);

      // Fetch tax types for resolution
      const taxTypes = await storage.getTaxTypes(companyId);

      // Create line items
      for (const item of items) {
        const taxRate = parseFloat(item.TAXR || "0");
        const xmlTaxCode = item.TAXCODE;
        const xmlTaxId = item.TAXID;

        // Find matching tax type
        let matchedTax = taxTypes.find(t =>
          Math.abs(parseFloat(t.rate) - taxRate) < 0.01 &&
          (xmlTaxCode ? t.zimraCode === xmlTaxCode : true) &&
          (xmlTaxId ? t.zimraTaxId === xmlTaxId : true)
        );

        // Fallback for 0% ambiguity
        if (!matchedTax && taxRate === 0) {
          matchedTax = taxTypes.find(t =>
            Math.abs(parseFloat(t.rate) - taxRate) < 0.01 &&
            (xmlTaxCode === 'EXE' || (item.ITEMNAME1 || '').toLowerCase().includes('exempt') ? t.zimraTaxId === "1" : t.zimraTaxId === "2")
          );
        }

        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: item.ITEMNAME1 || item.ITEMNAME2 || "Item",
          quantity: parseFloat(item.QTY || "1"),
          unitPrice: parseFloat(item.PRICE || "0"),
          taxRate: taxRate.toString(),
          taxTypeId: matchedTax?.id,
          total: parseFloat(item.AMT || "0")
        });
      }

      // Fiscalize the invoice
      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      // 1. Subscription Check
      if (!await ensureSubscription(company, res)) return;

      const fullInvoice = await storage.getInvoiceWithItems(invoice.id);
      if (!fullInvoice) {
        throw new Error("Failed to retrieve created invoice");
      }

      const receiptData = await device.fiscalizeInvoice(fullInvoice as any, company as any, taxTypes);

      // Update invoice
      await storage.updateInvoice(invoice.id, {
        fiscalCode: receiptData.hash,
        qrCodeData: receiptData.qrCode,
        status: "issued",
        syncedWithFdms: true,
        receiptGlobalNo: receiptData.receiptGlobalNo,
        receiptCounter: receiptData.receiptCounter,
        fiscalDayNo: company.currentFiscalDayNo ?? undefined,
        issueDate: fullInvoice.issueDate
      });

      // CRITICAL: Update Company Counters to maintain chain
      await storage.updateCompany(companyId, {
        lastReceiptGlobalNo: receiptData.receiptGlobalNo,
        dailyReceiptCount: receiptData.receiptCounter,
        lastFiscalHash: receiptData.hash
      });

      const response = formatRevMaxResponse("1", "Upload Success - Transacted to Card", {
        receipt: receiptData,
        qrCode: receiptData.qrCode,
        verificationCode: receiptData.verificationCode
      }, company);

      res.json(response);
    } catch (err: any) {
      console.error("TransactMExt Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Transaction error: ${err.message}`, {}, company || undefined));
    }
  });

  // 5. POST /api/companies/:id/zimra/z-report - Unified Z-Report (open/close)
  app.post("/api/companies/:id/zimra/z-report", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const action = req.query.action as string;
      const company = await storage.getCompany(companyId);

      if (!company || !company.fdmsDeviceId) {
        return res.status(400).json(formatRevMaxResponse("0", "Company not registered with ZIMRA", {}, company));
      }

      if (!action || (action !== "open" && action !== "close")) {
        return res.status(400).json(formatRevMaxResponse("0", "Invalid action parameter. Use 'open' or 'close'", {}, company));
      }

      const device = new ZimraDevice({
        deviceId: company.fdmsDeviceId,
        deviceSerialNo: company.fdmsDeviceSerialNo || "UNKNOWN",
        activationKey: company.fdmsApiKey || "",
        privateKey: company.zimraPrivateKey || "",
        certificate: company.zimraCertificate || "",
        baseUrl: getZimraBaseUrl((company.zimraEnvironment as "test" | "production") || 'test')
      }, getZimraLogger(companyId));

      if (action === "open") {
        // Subscription Check
        if (!await ensureSubscription(company, res)) return;

        // Open fiscal day
        const status = await device.getStatus() as any;
        if (status.fiscalDayStatus === 'FiscalDayOpened') {
          return res.json(formatRevMaxResponse("1", "Fiscal day is already open", {
            fiscalDayNo: status.lastFiscalDayNo
          }, company));
        }

        const nextDayNo = (status.lastFiscalDayNo || 0) + 1;
        const result = await device.openDay(nextDayNo) as any;

        await storage.updateCompany(companyId, {
          currentFiscalDayNo: result.fiscalDayNo || nextDayNo,
          fiscalDayOpen: true,
          lastFiscalDayStatus: 'FiscalDayOpened',
          fiscalDayOpenedAt: new Date(),
          dailyReceiptCount: 0,
          lastFiscalHash: null
        });

        res.json(formatRevMaxResponse("1", "Success: Fiscal Day Opened", result, company));
      } else {
        // Close fiscal day
        const fiscalDayNo = company.currentFiscalDayNo || 0;
        const receiptCounter = company.dailyReceiptCount || 0;
        const counters = await storage.calculateFiscalCounters(companyId, fiscalDayNo);

        const formatHarareDateOnly = (date: Date) => {
          const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Harare',
            year: 'numeric', month: '2-digit', day: '2-digit'
          }).formatToParts(date);
          const p = (t: string) => parts.find(x => x.type === t)?.value;
          return `${p('year')}-${p('month')}-${p('day')}`;
        };

        const fiscalDayDate = company.fiscalDayOpenedAt ? formatHarareDateOnly(new Date(company.fiscalDayOpenedAt)) : formatHarareDateOnly(new Date());

        const result = await device.closeDay(fiscalDayNo, fiscalDayDate, receiptCounter, counters) as any;
        const resultStatus = (result.fiscalDayStatus || "").toLowerCase();

        // Only reset local state if ZIMRA confirms the day is closed
        if (resultStatus === 'fiscaldayclosed') {
          await storage.updateCompany(companyId, {
            fiscalDayOpen: false,
            lastFiscalDayStatus: 'FiscalDayClosed',
            dailyReceiptCount: 0
          });
        } else {
          console.warn(`[ZIMRA] CloseDay returned status: ${result.fiscalDayStatus}. Local counters preserved.`);
          await storage.updateCompany(companyId, {
            lastFiscalDayStatus: result.fiscalDayStatus || 'FiscalDayCloseFailed'
          });
        }

        // Get Z-Report data
        const zReportData = await storage.getZReportData(companyId, fiscalDayNo);

        res.json(formatRevMaxResponse("1", "Success: Fiscal Day Closed - Z-Report Generated", {
          ZREPORTS: [zReportData],
          ...result
        }, company));
      }
    } catch (err: any) {
      console.error("ZReport Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      if (err instanceof ZimraApiError) {
        return res.status(err.statusCode).json(formatRevMaxResponse("0", err.message, {}, company || undefined));
      }
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 6. GET /api/companies/:id/zimra/transactions/:invoiceNumber - GetTransaction
  app.get("/api/companies/:id/zimra/transactions/:invoiceNumber", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const invoiceNumber = req.params.invoiceNumber;
      const company = await storage.getCompany(companyId);

      const invoices = await storage.getInvoices(companyId);
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);

      if (!invoice) {
        return res.status(404).json(formatRevMaxResponse("0", "Transaction not found", {}, company || undefined));
      }

      const fullInvoice = await storage.getInvoiceWithItems(invoice.id);

      const response = formatRevMaxResponse("1", "Success", {
        invoiceNumber: invoice.invoiceNumber,
        receiptData: fullInvoice,
        qrCode: invoice.qrCodeData || "",
        verificationCode: invoice.fiscalCode || "",
        fiscalDayNo: company?.currentFiscalDayNo || 0,
        receiptGlobalNo: invoice.id
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("GetTransaction Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 7. GET /api/companies/:id/zimra/transactions/unprocessed/summary - GetUnProcessedTransactionSummary
  app.get("/api/companies/:id/zimra/transactions/unprocessed/summary", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const fiscalDayNumber = req.query.fiscalDayNumber as string;
      const fiscalDate = req.query.fiscalDate as string;
      const company = await storage.getCompany(companyId);

      // Get all invoices
      const invoices = await storage.getInvoices(companyId);

      // Filter unprocessed (draft or failed)
      const unprocessed = invoices.filter(inv =>
        inv.status === "draft" || !inv.syncedWithFdms
      );

      const totalUnprocessed = unprocessed.length;
      const totalAmount = unprocessed.reduce((sum, inv) => sum + parseFloat(inv.total.toString()), 0);

      const response = formatRevMaxResponse("1", "Success", {
        fiscalDayNumber: fiscalDayNumber || company?.currentFiscalDayNo?.toString() || "",
        fiscalDate: fiscalDate || new Date().toISOString().split('T')[0],
        totalUnprocessed,
        totalAmount
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("GetUnProcessedTransactionSummary Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 8. GET /api/companies/:id/zimra/transactions/unprocessed - GetUnProcessedTransactions (paginated)
  app.get("/api/companies/:id/zimra/transactions/unprocessed", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const fiscalDayNumber = req.query.fiscalDayNumber as string;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 1000);
      const company = await storage.getCompany(companyId);

      const invoices = await storage.getInvoices(companyId);
      const unprocessed = invoices.filter(inv =>
        inv.status === "draft" || !inv.syncedWithFdms
      );

      const totalRecords = unprocessed.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTransactions = unprocessed.slice(startIndex, endIndex);

      const response = formatRevMaxResponse("1", "Success", {
        page,
        pageSize,
        totalRecords,
        totalPages,
        transactions: paginatedTransactions
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("GetUnProcessedTransactions Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 9. GET /api/companies/:id/zimra/transactions/unprocessed/by-date - GetUnProcessedTransactionsByDate
  app.get("/api/companies/:id/zimra/transactions/unprocessed/by-date", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const fiscalDate = req.query.fiscalDate as string;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 1000);
      const company = await storage.getCompany(companyId);

      if (!fiscalDate) {
        return res.status(400).json(formatRevMaxResponse("0", "fiscalDate parameter is required", {}, company || undefined));
      }

      const invoices = await storage.getInvoices(companyId);
      const targetDate = new Date(fiscalDate);

      const unprocessed = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        const sameDate = invDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
        return sameDate && (inv.status === "draft" || !inv.syncedWithFdms);
      });

      const totalRecords = unprocessed.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTransactions = unprocessed.slice(startIndex, endIndex);

      const response = formatRevMaxResponse("1", "Success", {
        page,
        pageSize,
        totalRecords,
        totalPages,
        transactions: paginatedTransactions
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("GetUnProcessedTransactionsByDate Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 10. DELETE /api/companies/:id/zimra/transactions/unprocessed - ClearUnprocessedTransactions
  app.delete("/api/companies/:id/zimra/transactions/unprocessed", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const fiscalDayNumber = req.query.fiscalDayNumber as string;
      const company = await storage.getCompany(companyId);

      if (!fiscalDayNumber) {
        return res.status(400).json(formatRevMaxResponse("0", "fiscalDayNumber parameter is required", {}, company || undefined));
      }

      // Safety check: only clear if newer fiscal day exists
      const currentDay = company?.currentFiscalDayNo || 0;
      if (parseInt(fiscalDayNumber) >= currentDay) {
        return res.status(400).json(formatRevMaxResponse("0", "Safety check failed - cannot clear current or future fiscal day", {}, company || undefined));
      }

      const invoices = await storage.getInvoices(companyId);
      const toClear = invoices.filter(inv =>
        (inv.status === "draft" || !inv.syncedWithFdms)
      );

      // Soft delete by updating status
      let clearedCount = 0;
      for (const invoice of toClear) {
        await storage.updateInvoice(invoice.id, { status: "cancelled" });
        clearedCount++;
      }

      const response = formatRevMaxResponse("1", "Successfully cleared unprocessed transactions", {
        clearedCount,
        fiscalDayNumber,
        fiscalDate: new Date().toISOString().split('T')[0]
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("ClearUnprocessedTransactions Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 11. DELETE /api/companies/:id/zimra/transactions/unprocessed/by-date - ClearUnprocessedTransactionsByDate
  app.delete("/api/companies/:id/zimra/transactions/unprocessed/by-date", requireAuthOrApiKey, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const fiscalDate = req.query.fiscalDate as string;
      const company = await storage.getCompany(companyId);

      if (!fiscalDate) {
        return res.status(400).json(formatRevMaxResponse("0", "fiscalDate parameter is required", {}, company || undefined));
      }

      // Safety check: don't clear today's transactions
      const today = new Date().toISOString().split('T')[0];
      if (fiscalDate === today) {
        return res.status(400).json(formatRevMaxResponse("0", "Safety check failed - cannot clear today's transactions", {}, company || undefined));
      }

      const invoices = await storage.getInvoices(companyId);
      const targetDate = new Date(fiscalDate);

      const toClear = invoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        const sameDate = invDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
        return sameDate && (inv.status === "draft" || !inv.syncedWithFdms);
      });

      // Soft delete by updating status
      let clearedCount = 0;
      for (const invoice of toClear) {
        await storage.updateInvoice(invoice.id, { status: "cancelled" });
        clearedCount++;
      }

      const response = formatRevMaxResponse("1", "Successfully cleared unprocessed transactions", {
        clearedCount,
        fiscalDayNumber: "",
        fiscalDate
      }, company || undefined);

      res.json(response);
    } catch (err: any) {
      console.error("ClearUnprocessedTransactionsByDate Error:", err);
      const company = await storage.getCompany(Number(req.params.id));
      res.status(500).json(formatRevMaxResponse("0", `Error: ${err.message}`, {}, company || undefined));
    }
  });

  // 12. POST /api/companies/:id/zimra/config/reset - Reset Device Counters
  app.post("/api/companies/:id/zimra/config/reset", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { globalNumber, dailyCounter, previousHash } = req.body;

      // Only allow if authenticated (requireAuth is already on)

      const updateData: any = {};
      if (globalNumber !== undefined) updateData.lastReceiptGlobalNo = Number(globalNumber);
      if (dailyCounter !== undefined) updateData.dailyReceiptCount = Number(dailyCounter);
      if (previousHash !== undefined) updateData.lastFiscalHash = previousHash === "" ? null : previousHash;

      await storage.updateCompany(companyId, updateData);

      res.json({ message: "Counters reset successfully", updated: updateData });
    } catch (err: any) {
      console.error("Reset Counters Error:", err);
      res.status(500).json({ message: "Failed to reset counters" });
    }
  });

  // ==========================================
  // End of RevMax/ZIMRA API Endpoints
  // ==========================================

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

  // Supplier Routes
  app.get("/api/companies/:companyId/suppliers", requireAuth, async (req, res) => {
    const suppliers = await storage.getSuppliers(Number(req.params.companyId));
    res.json(suppliers);
  });

  app.post("/api/companies/:companyId/suppliers", requireAuth, async (req, res) => {
    const input = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier({
      ...input,
      companyId: Number(req.params.companyId)
    });
    res.status(201).json(supplier);
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const updated = await storage.updateSupplier(id, req.body);
    if (!updated) return res.status(404).json({ message: "Supplier not found" });
    res.json(updated);
  });

  // Inventory Routes
  app.get("/api/companies/:companyId/inventory/transactions", requireAuth, async (req, res) => {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const items = await storage.getInventoryTransactions(Number(req.params.companyId), productId);
    res.json(items);
  });

  app.post("/api/companies/:companyId/inventory/stock-in", requireAuth, async (req, res) => {
    const { productId, quantity, unitCost, supplierId, notes } = req.body;
    const { recordStockIn } = await import("./lib/inventory.js");

    await recordStockIn(
      Number(productId),
      parseFloat(quantity),
      parseFloat(unitCost),
      Number(req.params.companyId),
      supplierId ? Number(supplierId) : undefined,
      notes
    );

    res.status(201).json({ message: "Stock recorded successfully" });
  });

  app.post("/api/companies/:companyId/inventory/batch-stock-in", requireAuth, async (req, res) => {
    const { items, supplierId, notes } = req.body;
    const { recordBatchStockIn } = await import("./lib/inventory.js");

    await recordBatchStockIn(
      Number(req.params.companyId),
      items,
      supplierId ? Number(supplierId) : undefined,
      notes
    );

    res.status(201).json({ message: "Batch stock recorded successfully" });
  });

  // Expense Routes
  app.get("/api/companies/:companyId/expenses", requireAuth, async (req, res) => {
    const expenses = await storage.getExpenses(Number(req.params.companyId));
    res.json(expenses);
  });

  app.post("/api/companies/:companyId/expenses", requireAuth, async (req, res) => {
    const input = insertExpenseSchema.parse(req.body);
    const expense = await storage.createExpense({
      ...input,
      companyId: Number(req.params.companyId)
    });
    res.status(201).json(expense);
  });


  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const updated = await storage.updateExpense(id, req.body);
    if (!updated) return res.status(404).json({ message: "Expense not found" });
    res.json(updated);
  });

  // Report Routes
  app.get("/api/companies/:companyId/reports/stock-valuation", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const data = await storage.getStockValuationReport(companyId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/companies/:companyId/reports/financial-summary", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const { from, to } = req.query;
      const dateFrom = from ? new Date(from as string) : undefined;
      const dateTo = to ? new Date(to as string) : undefined;
      const data = await storage.getFinancialSummary(companyId, dateFrom, dateTo);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });


  // Import Routes
  app.post("/api/import/products", requireAuth, (req, res, next) => {
    csvUpload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      try {
        const companyId = Number(req.body.companyId);
        if (!companyId) return res.status(400).json({ message: "Company ID is required" });

        const fileContent = req.file.buffer.toString("utf-8");
        const records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        const results = {
          success: 0,
          failed: 0,
          errors: [] as string[]
        };

        for (const [index, row] of records.entries()) {
          try {
            // Map CSV columns to Schema
            // Expected: Name,Description,SKU,Price,Tax Rate,Type,Stock,HS Code,Category,Track Inventory

            const name = row["Name"];
            if (!name) throw new Error("Product Name is required");

            const price = parseFloat(row["Price"] || "0");
            const taxRate = row["Tax Rate"] || "15.00"; // Default standard
            const stock = parseFloat(row["Stock"] || "0");
            const isTracked = (row["Track Inventory"] || "").toLowerCase() === "yes";

            const productType = (row["Type"] || "Good").toLowerCase() === "service" ? "service" : "good";

            await storage.createProduct({
              companyId,
              name: name,
              description: row["Description"] || "",
              sku: row["SKU"] || undefined,
              price: price.toString(),
              taxRate: taxRate.toString(),
              stockLevel: stock.toString(),
              lowStockThreshold: "10", // Default
              isActive: true,
              productType: productType,
              hsCode: row["HS Code"] || "0000.00.00",
              category: row["Category"] || "General",
              isTracked: isTracked
            });

            results.success++;
          } catch (rowErr: any) {
            results.failed++;
            results.errors.push(`Row ${index + 2}: ${rowErr.message}`);
          }
        }

        res.json(results);
      } catch (err: any) {
        console.error("Import Error:", err);
        res.status(500).json({ message: "Import failed: " + err.message });
      }
    });
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
    const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
    if (!companyId && !req.user?.isSuperAdmin) return res.status(403).json({ message: "No company associated with request" });
    const types = await storage.getTaxTypes(companyId ? Number(companyId) : undefined);
    res.json(types);
  });

  app.post(api.tax.createType.path, requireAuth, async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Company ID is required" });

      const input = api.tax.createType.input.parse(req.body);
      const type = await storage.createTaxType({ ...input, companyId: Number(companyId) });
      res.status(201).json(type);
    } catch (err: any) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e) => e.message).join(", ") });
      }
      if (err?.code === '23505') {
        return res.status(409).json({ message: "Tax code must be unique within the company" });
      }
      res.status(500).json({ message: "Failed to create tax type", error: err.message });
    }
  });

  app.patch(api.tax.updateType.path, requireAuth, async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Company ID is required" });

      const id = Number(req.params.id);
      const input = api.tax.updateType.input.parse(req.body);
      const updated = await storage.updateTaxType(id, Number(companyId), input);
      if (!updated) return res.status(404).json({ message: "Tax Type not found" });
      res.json(updated);
    } catch (err: any) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e) => e.message).join(", ") });
      }
      if (err?.code === '23505') {
        return res.status(409).json({ message: "Tax code must be unique within the company" });
      }
      res.status(500).json({ message: "Failed to update tax type", error: err.message });
    }
  });

  app.get(api.tax.categories.path, requireAuth, async (req, res) => {
    const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
    if (!companyId && !req.user?.isSuperAdmin) return res.status(403).json({ message: "No company associated with request" });
    const categories = await storage.getTaxCategories(companyId ? Number(companyId) : undefined);
    res.json(categories);
  });

  app.post(api.tax.createCategory.path, requireAuth, async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Company ID is required" });

      const input = api.tax.createCategory.input.parse(req.body);
      const category = await storage.createTaxCategory({ ...input, companyId: Number(companyId) });
      res.status(201).json(category);
    } catch (err: any) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e) => e.message).join(", ") });
      }
      if (err?.code === '23505') {
        return res.status(409).json({ message: "Tax category name must be unique within the company" });
      }
      res.status(500).json({ message: "Failed to create tax category", error: err.message });
    }
  });

  app.patch(api.tax.updateCategory.path, requireAuth, async (req, res) => {
    try {
      const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
      if (!companyId) return res.status(400).json({ message: "Company ID is required" });

      const id = Number(req.params.id);
      const input = api.tax.updateCategory.input.parse(req.body);
      const updated = await storage.updateTaxCategory(id, Number(companyId), input);
      if (!updated) return res.status(404).json({ message: "Category not found" });
      res.json(updated);
    } catch (err: any) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map((e) => e.message).join(", ") });
      }
      if (err?.code === '23505') {
        return res.status(409).json({ message: "Tax category name must be unique within the company" });
      }
      res.status(500).json({ message: "Failed to update tax category", error: err.message });
    }
  });

  // --- Tax Types Management ---

  app.get("/api/tax-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    // Allow seeing system defaults even if companyId is provided (logic inside storage)
    const taxes = await storage.getTaxTypes(companyId);
    res.json(taxes);
  });

  app.post("/api/tax-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertTaxTypeSchema.parse(req.body);
    const companyId = req.body.companyId; // Should be passed or derived from context

    // Basic validation
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });

    const newTax = await storage.createTaxType({ ...data, companyId });
    res.json(newTax);
  });

  app.put("/api/tax-types/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const companyId = req.body.companyId;

    if (!companyId) return res.status(400).json({ message: "Company ID is required for verification" });

    // We use partial update
    const updated = await storage.updateTaxType(id, companyId, req.body);
    if (!updated) return res.status(404).json({ message: "Tax Type not found" });

    res.json(updated);
  });

  // Invoice Routes
  app.get(api.invoices.list.path, requireAuth, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const isPos = req.query.isPos === 'true' ? true : (req.query.isPos === 'false' ? false : undefined);

    const result = await storage.getInvoicesPaginated(
      Number(req.params.companyId),
      page,
      limit,
      search,
      status,
      type,
      dateFrom,
      dateTo,
      isPos
    );
    res.json(result);
  });

  app.post(api.invoices.create.path, requireAuth, async (req, res) => {
    try {
      // Preprocess dates: convert ISO strings to Date objects
      const body = {
        ...req.body,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };

      const input = api.invoices.create.input.parse(body);

      // POS Shift Validation: Ensure shift is open before processing POS sales
      if (input.isPos) {
        const companyId = Number(req.params.companyId);
        const userId = (req.user as any)?.id;

        if (!userId) {
          return res.status(401).json({
            message: "User authentication required for POS sales"
          });
        }

        const activeShift = await storage.getActivePosShift(companyId, userId);

        if (!activeShift) {
          return res.status(400).json({
            message: "No active shift found. Please open a shift before processing POS sales.",
            code: "NO_ACTIVE_SHIFT"
          });
        }
      }

      let invoice = await storage.createInvoice({
        ...input,
        items: input.items as any,
        companyId: Number(req.params.companyId)
      });

      // ZIMRA Fiscalization Trigger for POS (only for VAT-registered companies)
      if (input.isPos) {
        const company = await storage.getCompany(Number(req.params.companyId));
        if (company?.vatRegistered !== false) {
          try {
            invoice = await processInvoiceFiscalization(
              invoice.id,
              invoice.companyId,
              req.user?.id,
              (req.user as any)?.isSuperAdmin,
              undefined, // zimraSync
              true // isPos
            );
          } catch (fiscalError) {
            console.error("POS Fiscalization Failed:", fiscalError);
            // We swallow the error here because the invoice is already created
            // and the user will see the failure status on the invoice.
            // The invoice will be returned with status 'draft' or 'failed'
          }
        } else {
          console.log(`[POS] Skipping fiscalization for non-VAT registered company ${req.params.companyId}`);
        }
      }

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

  app.put(api.invoices.update.path, requireAuth, async (req, res) => {
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
  app.post(api.invoices.fiscalize.path, requireAuth, async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      // Retrieve full invoice with line items
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check permissions: User must belong to the company OR be a SuperAdmin
      const users = await storage.getCompanyUsers(invoice.companyId);
      const isMember = users.some(u => u.id === req.user?.id);
      const isSuperAdmin = (req.user as any)?.isSuperAdmin;

      if (!isMember && !isSuperAdmin) {
        return res.status(403).json({ message: "You do not have permission to fiscalize for this company" });
      }

      console.log(`[Fiscalize] Processing Invoice ${invoiceId} for Company ${invoice.companyId}`);

      // Call the centralized fiscalization logic
      const updatedInvoice = await processInvoiceFiscalization(
        invoiceId,
        invoice.companyId,
        req.user?.id,
        isSuperAdmin
      );

      res.json(updatedInvoice);
    } catch (err: any) {
      console.error("Fiscalization Error:", err);
      // Provide detailed error message if available
      const message = err.message || "An unexpected error occurred during fiscalization.";

      if (err instanceof ZimraApiError) {
        return res.status(400).json({
          message: `ZIMRA Error: ${message}`,
          details: err.details
        });
      }

      // Check for specific known errors or return 500
      if (message.includes("Company has not registered")) {
        return res.status(400).json({ message });
      }

      return res.status(500).json({ message });
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
        syncedWithFdms: false,
        createdBy: (req.user as any).id, // Set createdBy
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
        currency: originalInvoice.currency, // Maintain same currency from original
        transactionType: "CreditNote",
        relatedInvoiceId: originalInvoice.id,
        items: originalInvoice.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity, // Positive quantity, logic handles it as credit
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxTypeId: item.taxTypeId, // Maintain tax type for proper zero-rated/exempt classification
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
        currency: originalInvoice.currency, // Maintain same currency from original
        transactionType: "DebitNote",
        relatedInvoiceId: originalInvoice.id,
        items: originalInvoice.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxTypeId: item.taxTypeId, // Maintain tax type for proper zero-rated/exempt classification
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

      console.log("[DEBUG] Email Route - Company ID:", invoice.companyId);
      console.log("[DEBUG] Email Route - Email Settings:", JSON.stringify(emailSettings, null, 2));
      console.log("[DEBUG] Email Route - Target Email:", email);

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

      if (invoice.status !== "draft" && !req.user.isSuperAdmin) {
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

  // Financial Summary Report (Revenue, COGS, Gross Profit, Expenses, Net Profit)
  // Includes BOTH regular invoices AND POS sales (isPos = true)
  app.get("/api/companies/:companyId/reports/financial-summary", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { from, to } = req.query;

      const startDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = to ? new Date(to as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const { invoiceItems: invoiceItemsTable, expenses: expensesTable } = await import("@shared/schema");

      // Revenue: all non-draft, non-cancelled, non-quote invoices (covers both POS + regular)
      const revenueRows = await db
        .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
        .from(invoices)
        .where(and(
          eq(invoices.companyId, companyId),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate),
          ne(invoices.status, 'draft'),
          ne(invoices.status, 'cancelled'),
          ne(invoices.status, 'quote'),
        ));
      const revenue = Number(revenueRows[0]?.total || 0);

      // COGS: from invoice_items.cogs_amount (computed at sale time via FIFO)
      const cogsRows = await db
        .select({ total: sql<number>`coalesce(sum(${invoiceItemsTable.cogsAmount}), 0)` })
        .from(invoiceItemsTable)
        .innerJoin(invoices, eq(invoiceItemsTable.invoiceId, invoices.id))
        .where(and(
          eq(invoices.companyId, companyId),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate),
          ne(invoices.status, 'draft'),
          ne(invoices.status, 'cancelled'),
          ne(invoices.status, 'quote'),
        ));
      const cogs = Number(cogsRows[0]?.total || 0);

      // Operating Expenses (from expenses table)
      const expenseRows = await db
        .select({
          total: sql<number>`coalesce(sum(${expensesTable.amount}), 0)`,
          category: expensesTable.category
        })
        .from(expensesTable)
        .where(and(
          eq(expensesTable.companyId, companyId),
          gte(expensesTable.date, startDate),
          lte(expensesTable.date, endDate),
        ))
        .groupBy(expensesTable.category);

      const totalExpenses = expenseRows.reduce((sum, r) => sum + Number(r.total), 0);
      const expenseBreakdown = expenseRows.map(r => ({
        category: r.category || 'Uncategorized',
        amount: Number(r.total)
      }));

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - totalExpenses;

      res.json({ revenue, cogs, grossProfit, expenses: totalExpenses, netProfit, expenseBreakdown });
    } catch (err: any) {
      console.error("Financial Summary Error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Stock Valuation Report
  app.get("/api/companies/:companyId/reports/stock-valuation", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);

      // Return all tracked products with their stock level and cost value
      const rows = await db
        .select({
          productId: products.id,
          name: products.name,
          sku: products.sku,
          stockLevel: products.stockLevel,
          unitCost: products.costPrice,
        })
        .from(products)
        .where(and(
          eq(products.companyId, companyId),
          eq(products.isTracked, true),
        ));

      const result = rows.map(p => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        stockLevel: p.stockLevel || "0",
        unitCost: p.unitCost || "0",
        totalValuation: Number(p.stockLevel || 0) * Number(p.unitCost || 0),
        category: (p as any).category || null,
      }));

      res.json(result);
    } catch (err: any) {
      console.error("Stock Valuation Error:", err);
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

  // --- Subscription Routes ---
  app.post("/api/companies/:id/subscriptions/initiate", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { amount, macAddress, email, serialNo: manualSerial } = req.body;
      const company = await storage.getCompany(companyId);

      if (!company) return res.status(404).json({ message: "Company not found" });

      const serialNo = manualSerial || company.fdmsDeviceSerialNo;
      if (!serialNo) {
        return res.status(400).json({ message: "A Device Serial Number is required to initiate a subscription." });
      }

      const result = await paynowService.initiateSubscription(
        companyId,
        serialNo,
        macAddress,
        amount || 150, // Default $150/year as per requirements
        email || company.email || "billing@example.com"
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/companies/:id/subscriptions", requireAuth, async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const subscriptions = await storage.getSubscriptionsByCompany(companyId);
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/subscriptions/:reference/status", requireAuth, async (req, res) => {
    try {
      const { reference } = req.params;
      const status = await paynowService.checkStatus(reference);
      res.json({ status });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Paynow IPN (Update) Callback
  app.post("/api/payments/paynow-update", async (req, res) => {
    try {
      // Paynow sends a POST with data
      const { reference } = req.body;
      if (reference) {
        await paynowService.checkStatus(reference);
      }
      res.status(200).end();
    } catch (error: any) {
      console.error("Paynow IPN error:", error);
      res.status(500).end();
    }
  });

  // Admin manual subscription activation
  app.post("/api/admin/subscriptions/manual", requireSuperAdmin, async (req, res) => {
    try {
      const { companyId, serialNo, macAddress, amount, notes } = req.body;

      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(now.getFullYear() + 1);

      const subscription = await storage.createSubscription({
        companyId: Number(companyId),
        deviceSerialNo: serialNo,
        deviceMacAddress: macAddress,
        amount: amount.toString(),
        status: "paid", // Instantly active
        startDate: now,
        endDate: endDate,
        paymentMethod: "cash",
        notes: notes || "Manual cash payment activation",
        paynowReference: `MANUAL-${Date.now()}`
      });

      // Also update the company record for legacy compatibility
      await storage.updateCompany(Number(companyId), {
        subscriptionStatus: "active",
        subscriptionEndDate: endDate,
        registeredMacAddress: macAddress
      });

      res.json({ message: "Subscription activated manually", subscription });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PIN Management
  // User Management
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user not found to prevent enumeration
        return res.json({ message: "If an account exists, a reset link has been sent." });
      }

      const token = await storage.createResetToken(user.id);

      // Send Email (Mocked for now, or use sendInvoiceEmail helper if generic enough)
      // In a real app, use Resend or similar
      console.log(`[AUTH] Password Reset Token for ${email}: ${token}`);

      // Construct Link: (Frontend URL)
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      console.log(`[AUTH] Reset Link: ${resetLink}`);

      // TODO: Integrate actual email sending here

      res.json({ message: "If an account exists, a reset link has been sent." });
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ message: "Token and password required" });

      if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const userId = await storage.verifyResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Update Password via Supabase (if using Supabase Auth) OR Local
      // Since we are hybrid, we might need to update local AND Supabase if possible.
      // However, the `storage.updateUser` usually only updates local DB.
      // If we rely on Supabase for auth, we should use Supabase's reset flow principally.
      // But looking at `auth.ts`, we sync Supabase users to local.

      // CRITICAL: We need to know if we are using Supabase Auth exclusively for login.
      // `auth.ts` suggests we verify Supabase token.
      // If so, we can't reset password purely locally if Supabase is the IdP.

      // BUT: The roadmap says "Implement Password Reset Flow".
      // If we are fully Supabase, we should use `supabase.auth.resetPasswordForEmail`.

      // Let's check if we have the Supabase Admin client available in routes.ts.
      // Yes, `import { supabaseAdmin } from "./supabase.js";` exists.

      if (supabaseAdmin) {
        const user = await storage.getUser(userId);
        if (user && user.email) {
          const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
          );
          if (error) throw error;
        }
      } else {
        console.warn("Supabase Admin not configured, cannot reset Supabase password.");
        // Fallback to local update if we supported local-only auth (which we might not fully)
      }

      await storage.consumeResetToken(token);
      res.json({ message: "Password updated successfully" });

    } catch (err: any) {
      console.error("Reset Password Error:", err);
      res.status(500).json({ message: "Failed to reset password: " + err.message });
    }
  });

  app.post("/api/users/profile/pin", requireAuth, async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin.length < 4) return res.status(400).json({ message: "PIN must be at least 4 digits" });

      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      await storage.setUserPin(userId, pin);
      res.json({ message: "PIN updated successfully" });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update PIN: " + err.message });
    }
  });

  app.post("/api/companies/:companyId/auth/verify-manager-pin", requireAuth, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { pin } = req.body;

      if (!pin) return res.status(400).json({ message: "PIN is required" });

      // Get all company users with admin/owner role
      const users = await storage.getCompanyUsers(parseInt(companyId));
      const managers = users.filter((u: any) => u.role === 'admin' || u.role === 'owner');

      // Check PIN against each manager
      for (const manager of managers) {
        const isValid = await storage.verifyUserPin(manager.id, pin);
        if (isValid) {
          return res.json({
            authorized: true,
            manager: { id: manager.id, name: manager.name, role: manager.role }
          });
        }
      }

      res.status(401).json({ authorized: false, message: "Invalid Manager PIN" });

    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Advanced Reporting Routes
  app.get("/api/reports/summary/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getReportSummary(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/charts/revenue/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getRevenueChart(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/charts/sales-by-category/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getSalesByCategory(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/charts/sales-by-payment-method/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getSalesByPaymentMethod(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/charts/sales-by-user/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getSalesByUser(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/sales/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const data = await storage.getSalesReport(companyId, startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sales Analytics - Summary
  app.get("/api/reports/summary/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const invoicesList = await db.query.invoices.findMany({
        where: and(
          eq(invoices.companyId, companyId),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate),
          ne(invoices.status, 'cancelled'),
          ne(invoices.status, 'draft')
        )
      });

      const customers = await db.query.customers.findMany({
        where: eq(customers.companyId, companyId)
      });

      const totalRevenue = invoicesList.reduce((sum, inv) => sum + Number(inv.total), 0);
      const pendingAmount = invoicesList.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.total), 0);

      res.json({
        totalRevenue,
        pendingAmount,
        invoicesCount: invoicesList.length,
        customersCount: customers.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sales Analytics - Revenue Chart
  app.get("/api/reports/charts/revenue/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const invoicesList = await db.query.invoices.findMany({
        where: and(
          eq(invoices.companyId, companyId),
          gte(invoices.issueDate, startDate),
          lte(invoices.issueDate, endDate),
          ne(invoices.status, 'cancelled'),
          ne(invoices.status, 'draft')
        ),
        orderBy: [asc(invoices.issueDate)]
      });

      // Group by date
      const revenueByDate: Record<string, number> = {};
      invoicesList.forEach(inv => {
        const date = format(new Date(inv.issueDate), 'MMM dd');
        revenueByDate[date] = (revenueByDate[date] || 0) + Number(inv.total);
      });

      const chartData = Object.entries(revenueByDate).map(([name, total]) => ({ name, total }));
      res.json(chartData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });



  // POS Transaction Routes
  app.post("/api/pos/shifts/:id/transaction", requireAuth, async (req, res) => {
    try {
      const shiftId = Number(req.params.id);
      const { type, amount, reason, items } = req.body;
      const userId = (req.user as any).id;

      const transaction = await addPosTransaction(shiftId, userId, type, amount, reason, items);
      res.json(transaction);
    } catch (err: any) {
      console.error("POS Transaction Error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/pos/shifts/:id/transactions", requireAuth, async (req, res) => {
    try {
      const shiftId = Number(req.params.id);
      const transactions = await getShiftTransactions(shiftId);
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/pos/reports/sales", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = parseInt(req.query.companyId as string) || user.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const cashierId = req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined;
      const paymentMethod = req.query.paymentMethod as string | undefined;

      const sales = await storage.getPosSales(companyId, startDate, endDate, cashierId, paymentMethod);
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/pos/my-sales", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = parseInt(req.query.companyId as string) || user.companyId;

      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : thirtyDaysAgo;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const cashierId = user.id;

      const sales = await storage.getPosSales(companyId, startDate, endDate, cashierId);
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/pos/all-sales", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = parseInt(req.query.companyId as string) || user.companyId;

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      let cashierId = req.query.cashierId as string;
      const status = req.query.status as string;
      const search = req.query.search as string;

      // Enforcement: Cashiers can ONLY see their own sales
      const role = await storage.getCompanyUserRole(user.id, companyId);
      if (role === 'cashier' || !user.isSuperAdmin && (role !== 'owner' && role !== 'admin')) {
        cashierId = user.id;
      }

      const sales = await storage.getPosSales(companyId, startDate, endDate, cashierId, undefined, status, search);
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Product Performance Report
  app.get("/api/companies/:id/reports/product-performance", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);
      const isPosOnly = req.query.isPos === "true";

      const products = await storage.getProductPerformance(companyId, startDate, endDate, isPosOnly);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POS Sales Reports
  app.get("/api/pos/reports/sales", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = parseInt(req.query.companyId as string) || user.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      const cashierId = req.query.cashierId as string;

      const sales = await storage.getPosSales(companyId, startDate, endDate, cashierId);
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POS Shift Reports
  app.get("/api/pos/reports/shifts", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const companyId = parseInt(req.query.companyId as string) || user.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      endDate.setHours(23, 59, 59, 999);

      // Fetch shifts within date range
      const shifts = await db.query.posShifts.findMany({
        where: and(
          eq(posShifts.companyId, companyId),
          gte(posShifts.startTime, startDate),
          lte(posShifts.startTime, endDate)
        ),
        with: {
          user: true
        },
        orderBy: [desc(posShifts.startTime)]
      });

      // Calculate sales for each shift
      const shiftsWithSales = await Promise.all(shifts.map(async (shift) => {
        // Get all invoices created during this shift
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();

        const shiftInvoices = await db.query.invoices.findMany({
          where: and(
            eq(invoices.companyId, companyId),
            eq(invoices.createdBy, shift.userId),
            eq(invoices.isPos, true),
            gte(invoices.createdAt, shiftStart),
            lte(invoices.createdAt, shiftEnd),
            ne(invoices.status, 'cancelled')
          )
        });

        // Get shift transactions (drops and payouts)
        const shiftTransactions = await db.query.posShiftTransactions.findMany({
          where: eq(posShiftTransactions.shiftId, shift.id)
        });

        const totalSales = shiftInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const transactionCount = shiftInvoices.length;

        // Calculate CASH-ONLY sales
        const cashSales = shiftInvoices
          .filter(inv => inv.paymentMethod?.toUpperCase() === 'CASH')
          .reduce((sum, inv) => sum + Number(inv.total), 0);

        const cashTransactionCount = shiftInvoices
          .filter(inv => inv.paymentMethod?.toUpperCase() === 'CASH').length;

        // Calculate cash drops and payouts
        const cashDrops = shiftTransactions
          .filter(t => t.type === 'DROP')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const cashPayouts = shiftTransactions
          .filter(t => t.type === 'PAYOUT')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        // Expected cash in drawer
        const expectedCash = Number(shift.openingBalance) + cashSales - cashDrops - cashPayouts;

        // Calculate variance if shift is closed and has actual cash
        const actualCash = shift.actualCash ? Number(shift.actualCash) : null;
        const cashVariance = actualCash !== null ? actualCash - expectedCash : null;

        // Calculate variance percentage
        const variancePercentage = expectedCash > 0 && cashVariance !== null
          ? (Math.abs(cashVariance) / expectedCash) * 100
          : null;

        return {
          ...shift,
          cashierName: shift.user?.username || shift.user?.email || 'Unknown',
          totalSales,
          transactionCount,
          cashSales,
          cashTransactionCount,
          cashDrops,
          cashPayouts,
          expectedCash,
          actualCash,
          cashVariance,
          variancePercentage,
          reconciliationStatus: shift.reconciliationStatus || (shift.status === 'closed' && !actualCash ? 'pending' : null)
        };
      }));

      res.json(shiftsWithSales);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Reconcile POS Shift
  app.post("/api/pos/shifts/:id/reconcile", requireAuth, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const { actualCash, notes } = req.body;
      const user = req.user as any;

      if (actualCash === undefined || actualCash === null) {
        return res.status(400).json({ message: "Actual cash amount is required" });
      }

      // Get shift to calculate expected cash
      const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, shiftId)
      });

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Calculate expected cash (same logic as reports endpoint)
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();

      const shiftInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.companyId, shift.companyId),
          eq(invoices.createdBy, shift.userId),
          eq(invoices.isPos, true),
          gte(invoices.createdAt, shiftStart),
          lte(invoices.createdAt, shiftEnd),
          ne(invoices.status, 'cancelled')
        )
      });

      const shiftTransactions = await db.query.posShiftTransactions.findMany({
        where: eq(posShiftTransactions.shiftId, shift.id)
      });

      const cashSales = shiftInvoices
        .filter(inv => inv.paymentMethod?.toUpperCase() === 'CASH')
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      const cashDrops = shiftTransactions
        .filter(t => t.type === 'DROP')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const cashPayouts = shiftTransactions
        .filter(t => t.type === 'PAYOUT')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expectedCash = Number(shift.openingBalance) + cashSales - cashDrops - cashPayouts;
      const variance = Number(actualCash) - expectedCash;
      const variancePercentage = expectedCash > 0 ? (Math.abs(variance) / expectedCash) * 100 : 0;

      // Determine reconciliation status based on variance percentage
      let reconciliationStatus = 'reconciled';
      if (variancePercentage > 5) {
        reconciliationStatus = 'critical_discrepancy'; // >5% variance
      } else if (variancePercentage > 2) {
        reconciliationStatus = 'major_discrepancy'; // 2-5% variance
      } else if (variancePercentage > 0.5) {
        reconciliationStatus = 'minor_discrepancy'; // 0.5-2% variance
      }

      // Update shift with reconciliation data
      const [updatedShift] = await db.update(posShifts)
        .set({
          actualCash: actualCash.toString(),
          reconciledAt: new Date(),
          reconciledBy: user.id,
          reconciliationNotes: notes,
          reconciliationStatus
        })
        .where(eq(posShifts.id, shiftId))
        .returning();

      res.json({
        ...updatedShift,
        expectedCash,
        variance,
        variancePercentage
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

