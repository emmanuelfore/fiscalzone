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
    if (!req.path.startsWith("/api") || req.path.startsWith("/api/health")) {
      return next();
    }

    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log(`[AUTH] No Authorization header for ${req.method} ${req.path}`);
      // Continue without user (will be caught by requireAuth if needed)
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) return next();

    try {
      // Verify token with Supabase with retry logic for network stability
      let supabaseUser = null;
      let authError = null;
      let authRetries = 3;

      while (authRetries > 0) {
        try {
          const { data, error } = await supabaseServer.auth.getUser(token);
          if (error) {
            authError = error;
            // If it's a 401/403 (invalid token), don't retry
            if (error.status === 401 || error.status === 403) break;
          } else {
            supabaseUser = data.user;
            authError = null;
            break;
          }
        } catch (err: any) {
          authError = err;
          console.warn(`[AUTH] Supabase connection attempt failed (${4 - authRetries}/3):`, err.message || err);
        }

        authRetries--;
        if (authRetries > 0) {
          // Exponential backoff: 500ms, 1500ms
          await new Promise(resolve => setTimeout(resolve, 500 * (4 - authRetries)));
        }
      }

      if (authError || !supabaseUser) {
        console.log(`[AUTH] Supabase verification failed for ${req.path}: ${authError?.message || 'No user'}`);
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
            username: supabaseUser.email.split('@')[0],
            passwordChanged: true, // Self-registered users have their own password
          });
        } catch (err) {
          console.error("Error creating user from Supabase token:", err);
          return next();
        }
      }

      if (user) {
        console.log(`[AUTH] Authenticated: ${user.email} (isSuperAdmin: ${user.isSuperAdmin}) for ${req.method} ${req.path}`);
        req.user = user;
        req.isAuthenticated = () => true;
      } else {
        console.log(`[AUTH] No DB user for Supabase ID ${supabaseUser.id}`);
        req.user = undefined;
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
