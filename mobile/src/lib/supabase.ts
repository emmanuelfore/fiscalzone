import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// Safe initialization of Supabase to prevent hard crashes on standalone APKs
// if environment variables are missing at build time.
let supabaseInstance: SupabaseClient | null = null;

try {
  if (ENV.supabaseUrl && ENV.supabaseAnonKey) {
    supabaseInstance = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
  } else {
    console.warn("[Supabase] Missing environment variables for initialization.");
  }
} catch (e) {
  console.error("[Supabase] Fatal initialization error:", e);
}

export const supabase = supabaseInstance as SupabaseClient;


