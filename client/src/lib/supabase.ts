import { createClient } from "@supabase/supabase-js";

// Get Supabase URL and anon key from environment variables
// These will be injected by Vite during build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase URL or Anon Key not found. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."
    );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
