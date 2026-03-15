export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "")
};

export function assertEnv() {
  const missing: string[] = [];
  if (!ENV.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!ENV.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!ENV.apiBaseUrl) missing.push("EXPO_PUBLIC_API_BASE_URL");
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

