import { Request, Response, NextFunction } from "express";
import { storage } from "../../storage.js";

export async function resolveApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.headers["x-api-key"] as string | undefined;

  if (!key) {
    res.status(401).json({
      error: "MISSING_API_KEY",
      message: "X-API-Key header is required",
      statusCode: 401,
    });
    return;
  }

  const company = await storage.getCompanyByApiKey(key);

  if (!company) {
    res.status(401).json({
      error: "INVALID_API_KEY",
      message: "Invalid API key",
      statusCode: 401,
    });
    return;
  }

  req.company = company;
  next();
}
