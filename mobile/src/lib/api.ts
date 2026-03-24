import { supabase } from "./supabase";
import { ENV } from "./env";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function joinUrl(base: string, path: string) {
  if (!base) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  let session = null;
  
  // Skip session check for health endpoint to speed up online detection
  if (path !== "/api/health") {
    try {
      if (supabase) {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 5000)
          )
        ]);
        session = sessionResult?.data?.session ?? null;
      }
    } catch (e) {
      console.warn("[API] Session fetch failed:", e);
    }
  }


  const headers = new Headers(init?.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = init?.signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;

  try {
    const url = joinUrl(ENV.apiBaseUrl, path);
    return await fetch(url, {
      ...init,
      headers,
      signal: init?.signal ?? (controller ? controller.signal : undefined)
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function apiJson<T = Json>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await apiFetch(path, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (e: any) {
    if (e.message === "Aborted" || e.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection.");
    }
    if (e.message.includes("Network request failed")) {
      const url = joinUrl(ENV.apiBaseUrl, path);
      throw new Error(`Network error: Unable to reach server at ${url}. Please ensure the server is running and reachable from your device.`);
    }
    throw e;
  }
}
