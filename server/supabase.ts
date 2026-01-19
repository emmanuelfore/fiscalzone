import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Check your .env file.",
    );
}

// Server-side Supabase client
// Use this for server-side operations that need auth context
export const supabaseServer = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// For admin operations (use service key)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
    : null;
