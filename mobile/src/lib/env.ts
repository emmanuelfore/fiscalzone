const getRaw = (key: string) => process.env[key] ?? "";

export const ENV = {
  supabaseUrl: getRaw("EXPO_PUBLIC_SUPABASE_URL").trim(),
  supabaseAnonKey: getRaw("EXPO_PUBLIC_SUPABASE_ANON_KEY").trim(),
  apiBaseUrl: (getRaw("EXPO_PUBLIC_API_BASE_URL").trim()).replace(/\/+$/, "")
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


