import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage.js";

const router = Router();

// --- Zod Schema ---
// Require name; optional email, phone, address, vatNumber, tin (Req 5.2, 10.1)
export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  tin: z.string().optional().or(z.literal("")),
});

// POST / — create customer (Task 7.2, Req 5.1)
router.post("/", async (req, res) => {
  const company = req.company as any;

  const parsed = customerSchema.safeParse(req.body);
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
    const customer = await storage.createCustomer({
      ...parsed.data,
      companyId: company.id,
    } as any);

    return res.status(201).json(customer);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to create customer: " + err.message,
      statusCode: 500,
    });
  }
});

// GET / — list customers (Task 7.2, Req 5.3)
router.get("/", async (req, res) => {
  const company = req.company as any;

  try {
    const customers = await storage.getCustomers(company.id);
    return res.status(200).json(customers);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to list customers: " + err.message,
      statusCode: 500,
    });
  }
});

// GET /:id — get single customer (Task 7.2, Req 5.4, 5.5, 9.2, 9.3)
router.get("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Customer not found",
      statusCode: 404,
    });
  }

  try {
    const customer = await storage.getCustomer(id);

    if (!customer || customer.companyId !== company.id) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Customer not found",
        statusCode: 404,
      });
    }

    return res.status(200).json(customer);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to get customer: " + err.message,
      statusCode: 500,
    });
  }
});

// PUT /:id — update customer (Task 7.2, Req 5.6)
router.put("/:id", async (req, res) => {
  const company = req.company as any;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: "Customer not found",
      statusCode: 404,
    });
  }

  const parsed = customerSchema.safeParse(req.body);
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
    const customer = await storage.getCustomer(id);

    if (!customer || customer.companyId !== company.id) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Customer not found",
        statusCode: 404,
      });
    }

    const updated = await storage.updateCustomer(id, parsed.data as any);
    return res.status(200).json(updated);
  } catch (err: any) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to update customer: " + err.message,
      statusCode: 500,
    });
  }
});

export default router;
