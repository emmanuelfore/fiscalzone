import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage.js";
import { User as DbUser } from "../shared/schema.js";
import { supabaseServer } from "./supabase.js";

// Augment Express Request type
declare global {
  namespace Express {
    interface User extends DbUser { }
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

export function setupAuth(app: Express) {
  // Auth Middleware
  app.use(async (req: any, res: Response, next: NextFunction) => {
    // Skip auth for public routes (if any)
    if (!req.path.startsWith("/api")) {
      return next();
    }

    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Continue without user (will be caught by requireAuth if needed)
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) return next();

    try {
      // Verify token with Supabase
      const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);

      if (error || !supabaseUser) {
        return next();
      }

      // Get user from our database with retry
      let user;
      let retries = 3;
      while (retries > 0) {
        try {
          user = await storage.getUser(supabaseUser.id);
          break;
        } catch (err) {
          console.warn(`Failed to fetch user (attempt ${4 - retries}/3):`, err);
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Sync user if missing (Auto-registration on first API call)
      if (!user && supabaseUser.email) {
        try {
          user = await storage.createUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            password: "", // Handled by Supabase
            name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || "New User",
          });
        } catch (err) {
          console.error("Error creating user from Supabase token:", err);
          return next();
        }
      }

      if (user) {
        req.user = user;
        req.isAuthenticated = () => true;
      }

      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      return res.status(500).json({
        message: "Auth middleware failed",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Helper for checking auth (used in routes)
  app.use((req: any, res, next) => {
    if (!req.isAuthenticated) {
      req.isAuthenticated = () => false;
    }
    next();
  });

  // User profile endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  app.patch("/api/user", (req: any, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    next();
  }, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Name cannot be empty" });

      const updatedUser = await storage.updateUser(req.user!.id, { name });
      res.json(updatedUser);
    } catch (err: any) {
      console.error("Update User Error:", err);
      res.status(500).json({ message: "Failed to update profile", error: err.message });
    }
  });
}
