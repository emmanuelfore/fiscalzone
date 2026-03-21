import { Router } from "express";
import { resolveApiKey } from "./middleware.js";
import fiscalizeRouter from "./fiscalize.js";
import invoicesRouter from "./invoices.js";
import customersRouter from "./customers.js";
import productsRouter from "./products.js";
import fiscalRouter from "./fiscal.js";
import webhooksRouter from "./webhooks.js";

const v1Router = Router();

// Webhooks are exempt from API key auth (use their own signature verification)
v1Router.use("/webhooks", webhooksRouter);

// All other routes require API key authentication
v1Router.use(resolveApiKey);
v1Router.use("/fiscalize", fiscalizeRouter);
v1Router.use("/invoices", invoicesRouter);
v1Router.use("/customers", customersRouter);
v1Router.use("/products", productsRouter);
v1Router.use("/fiscal", fiscalRouter);

export default v1Router;
