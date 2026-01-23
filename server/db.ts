
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database connection pool for Drizzle ORM
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export const db = drizzle(pool, { schema });

// Supabase client for auth and real-time features (optional for now)
export const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
  : (() => {
    console.warn(
      "⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set. Supabase client features disabled."
    );
    return null;
  })();
