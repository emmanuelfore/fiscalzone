export const ENV = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim(),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "")
};


export function assertEnv() {
  const missing: string[] = [];
  if (!ENV.supabaseUrl || !ENV.supabaseUrl.startsWith("http")) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!ENV.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!ENV.apiBaseUrl || !ENV.apiBaseUrl.startsWith("http")) missing.push("EXPO_PUBLIC_API_BASE_URL");
  
  if (missing.length) {
    throw new Error(`Invalid or missing configuration: ${missing.join(", ")}`);
  }
}


