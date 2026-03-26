import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage.js";

const router = Router();

// --- Zod Schema ---
export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  price: z.number().min(0, "Price must be non-negative").or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
  sku: z.string().optional().or(z.literal("")),
  categoryId: z.number().int().positive().optional(),
  category: z.string().optional().or(z.literal("")),
  taxTypeId: z.number().int().positive().optional(),
  taxRate: z.number().min(0, "Tax rate must be non-negative").optional().or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
  hsCode: z.string().optional().or(z.literal("")),
  productType: z.enum(["good", "service"]).optional(),
  stockLevel: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  isTracked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  barcode: z.string().optional().or(z.literal("")),
  unitOfMeasure: z.string().optional().or(z.literal("")),
  costPrice: z.number().min(0).optional().or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
});

// POST / — create product (Task 8.2, Req 6.1)
router.post("/", async (req, res) => {
  const company = req.company as any;

  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request body validation failed",
      statusCode: 400,
      details: parsed.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  try {
    const product = await storage.createProduct({
      ...parsed.data,
      price: parsed.data.price?.toString(),
      taxRate: parsed.data.taxRate?.toString(),
      stockLevel: parsed.data.stockLevel?.toString(),
      lowStockThreshold: parsed.data.lowStockThreshold?.toString(),
      costPrice: parsed.data.costPrice?.toString(),
      companyId: company.id,
    } as any);

    return res.status(201).json(product);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to create product: " + err.message,
      statusCode: 500,
    });
  }
});

// GET / — list products (Task 8.2, Req 6.2)
router.get("/", async (req, res) => {
  const company = req.company as any;

  try {
    const products = await storage.getProducts(company.id);
    return res.status(200).json(products);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to list products: " + err.message,
      statusCode: 500,
    });
  }
});

// PUT /:id — update product (Task 8.2, Req 6.3, 6.4, 6.5)
router.put("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Product not found",
      statusCode: 404,
    });
  }

  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request body validation failed",
      statusCode: 400,
      details: parsed.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  try {
    // We don't have a direct `getProduct` method in storage based on signatures seen so far,
    // let's fetch all products and manually find, or assume there is a query we can do.
    // Instead, let's just get the product list for this company and find it.
    // This correctly enforces company scoping (Req 6.5).
    const products = await storage.getProducts(company.id);
    const existing = products.find((p: any) => p.id === id);

    if (!existing) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Product not found",
        statusCode: 404,
      });
    }

    const updated = await storage.updateProduct(id, {
      ...parsed.data,
      price: parsed.data.price?.toString(),
      taxRate: parsed.data.taxRate?.toString(),
      stockLevel: parsed.data.stockLevel?.toString(),
      lowStockThreshold: parsed.data.lowStockThreshold?.toString(),
      costPrice: parsed.data.costPrice?.toString(),
    } as any);

    return res.status(200).json(updated);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to update product: " + err.message,
      statusCode: 500,
    });
  }
});

export default router;
