import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cacheUser, getCachedUser, clearCachedUser, getPendingSalesCount, saveOfflineCredentials, verifyOfflineCredentials } from "@/lib/offline-db";
import { useToast } from "@/hooks/use-toast";
import { isElectron } from "@/lib/utils";
import { getIsOnline, setOnlineState } from "@/lib/online-state";

let supabaseInitStarted = false;
let supabaseInitDone = false;
const supabaseInitListeners = new Set<(ready: boolean) => void>();
let lastUserInvalidateAt = 0;

function notifySupabaseInitListeners() {
  for (const listener of supabaseInitListeners) listener(supabaseInitDone);
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // If offline, skip Supabase init entirely — we'll use cached user from IndexedDB.
  // In Electron we always let Supabase attempt init (it has a 1.5s failsafe timeout).
  const startOffline = !isElectron() && !navigator.onLine;
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(
    startOffline ? false : !supabaseInitDone
  );

  useEffect(() => {
    // Offline on mount — mark supabase as ready immediately so query runs against cache
    if (startOffline) {
      if (!supabaseInitDone) {
        supabaseInitDone = true;
        notifySupabaseInitListeners();
      }
      return;
    }

    const listener = (ready: boolean) => setIsSupabaseLoading(!ready);
    supabaseInitListeners.add(listener);
    listener(supabaseInitDone);

    if (!supabaseInitStarted) {
      supabaseInitStarted = true;

      const failSafe = window.setTimeout(() => {
        if (supabaseInitDone) return;
        console.warn("[Auth] Supabase session sync timed out; continuing without blocking UI");
        supabaseInitDone = true;
        notifySupabaseInitListeners();
      }, isElectron() ? 1500 : 4000);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION") {
          window.clearTimeout(failSafe);
          if (!supabaseInitDone) {
            supabaseInitDone = true;
            notifySupabaseInitListeners();
          }
          if (session) {
            const now = Date.now();
            if (now - lastUserInvalidateAt > 2000) {
              lastUserInvalidateAt = now;
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            }
          }
        } else if (event === "SIGNED_IN") {
          if (!supabaseInitDone) {
            supabaseInitDone = true;
            notifySupabaseInitListeners();
          }
          const now = Date.now();
          if (now - lastUserInvalidateAt > 2000) {
            lastUserInvalidateAt = now;
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          }
        } else if (event === "SIGNED_OUT") {
          window.clearTimeout(failSafe);
          if (!supabaseInitDone) {
            supabaseInitDone = true;
            notifySupabaseInitListeners();
          }
          // Don't clear queryClient here — logout() already handles cleanup
          // to avoid double-clearing which can cause race conditions
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    return () => {
      supabaseInitListeners.delete(listener);
    };
  }, [queryClient]);

  const userQuery = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      // Offline: skip the network entirely and go straight to cache
      if (!getIsOnline()) {
        const cached = await getCachedUser();
        if (cached) {
          console.log("[Auth] Offline — using cached user:", cached.email);
          return cached;
        }
        return null;
      }

      try {
        const res = await apiFetch("/api/user");
        if (res.status === 304) {
          const cachedFromQuery = queryClient.getQueryData(["/api/user"]);
          if (cachedFromQuery) return cachedFromQuery;
          const cachedFromOffline = await getCachedUser();
          return cachedFromOffline || null;
        }
        if (res.status === 401) {
          await clearCachedUser();
          return null;
        }
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await res.json();
        const user = typeof data === "object" && data !== null && "user" in data ? data.user : data;
        if (user) await cacheUser(user);
        return user;
      } catch (err) {
        console.warn("[Auth] User fetch failed, trying offline cache...", err);
        const cachedFromQuery = queryClient.getQueryData(["/api/user"]);
        if (cachedFromQuery) return cachedFromQuery;
        const cachedFromOffline = await getCachedUser();
        return cachedFromOffline ?? null;
      }
    },
    enabled: !isSupabaseLoading,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) throw error;
  };

  const loginWithPassword = async ({ email, password }: any) => {
    // Try online login first; fall back to offline credentials if network fails
    if (getIsOnline()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
          await saveOfflineCredentials(email, password, { ...data.user, sessionStatus: 'offline_cached' });
          await cacheUser(data.user);
          queryClient.setQueryData(["/api/user"], data.user);

          // Eagerly cache everything needed for offline use (non-blocking)
          warmOfflineCache(data.user).catch(err =>
            console.warn("[Auth] Failed to warm offline cache:", err)
          );
        }
        return;
      } catch (err: any) {
        // If it's an auth error (wrong password), throw immediately
        if (err?.status === 400 || err?.message?.includes("Invalid")) throw err;
        // Network error — fall through to offline path
        console.warn("[Auth] Online login failed, trying offline credentials:", err.message);
      }
    }

    // Offline path
    const user = await verifyOfflineCredentials(email, password);
    if (!user) {
      throw new Error("Invalid credentials or no offline profile cached");
    }

    console.log("[Auth] Offline verification successful");
    await cacheUser(user);

    // Restore selectedCompanyId BEFORE setting user in query cache
    const storedId = localStorage.getItem("selectedCompanyId");
    if (!storedId || storedId === "0") {
      const { getCachedCompaniesList } = await import("@/lib/offline-db");
      const cachedCompanies = await getCachedCompaniesList();
      if (cachedCompanies && cachedCompanies.length > 0) {
        const best =
          cachedCompanies.find((c: any) => c.role === "owner") ||
          cachedCompanies.find((c: any) => c.role === "cashier") ||
          cachedCompanies[0];
        localStorage.setItem("selectedCompanyId", String(best.id));
        console.log("[Auth] Offline — restored selectedCompanyId:", best.id);
      }
    }

    queryClient.setQueryData(["/api/user"], user);

    if (!supabaseInitDone) {
      supabaseInitDone = true;
      notifySupabaseInitListeners();
    }
  };

  async function warmOfflineCache(_user: any) {
    const { cacheCompaniesList, cacheCompanySettings, cacheProducts, cacheCustomers, cacheCurrencies, cacheTaxConfig, setLastCacheTime } = await import("@/lib/offline-db");

    const companiesRes = await apiFetch("/api/companies");
    if (!companiesRes.ok) return;
    const companies = await companiesRes.json();
    await cacheCompaniesList(companies);

    if (!localStorage.getItem("selectedCompanyId") || localStorage.getItem("selectedCompanyId") === "0") {
      const best = companies.find((c: any) => c.role === "owner") ||
                   companies.find((c: any) => c.role === "cashier") ||
                   companies[0];
      if (best) localStorage.setItem("selectedCompanyId", String(best.id));
    }

    for (const company of companies) {
      const cid = company.id;
      try { await cacheCompanySettings(cid, company); } catch {}

      const [prodRes, custRes, currRes, taxRes] = await Promise.allSettled([
        apiFetch(`/api/companies/${cid}/products`),
        apiFetch(`/api/companies/${cid}/customers`),
        apiFetch(`/api/companies/${cid}/currencies`),
        apiFetch(`/api/tax/types?companyId=${cid}`),
      ]);

      if (prodRes.status === "fulfilled" && prodRes.value.ok) {
        await cacheProducts(cid, await prodRes.value.json());
        await setLastCacheTime(cid, Date.now());
      }
      if (custRes.status === "fulfilled" && custRes.value.ok) {
        await cacheCustomers(cid, await custRes.value.json());
      }
      if (currRes.status === "fulfilled" && currRes.value.ok) {
        await cacheCurrencies(cid, await currRes.value.json());
      }
      if (taxRes.status === "fulfilled" && taxRes.value.ok) {
        const types = await taxRes.value.json();
        const existing = (await import("@/lib/offline-db").then(m => m.getCachedTaxConfig(cid))) || {};
        await cacheTaxConfig(cid, { ...existing, types });
      }
    }
    console.log("[Auth] Offline cache warmed for", companies.length, "company/companies");
  }

  const registerWithPassword = async ({ email, password, name }: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    // Clear React Query cache and local user cache
    await clearCachedUser();
    queryClient.clear();
    localStorage.removeItem("selectedCompanyId");

    // Mark supabase as done so the login page never shows a spinner.
    // Do NOT reset supabaseInitStarted — resetting it causes a second subscription
    // to race with the existing one, which can deadlock the login page offline.
    supabaseInitDone = true;
    notifySupabaseInitListeners();

    if (getIsOnline()) {
      try { await supabase.auth.signOut(); } catch { /* ignore network errors */ }
    }

    setLocation(isElectron() ? "/pos-login" : "/auth");

    if (!getIsOnline()) {
      toast({
        title: "Logged Out",
        description: "You can log back in with your cached credentials.",
      });
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    const res = await apiFetch("/api/user/password", {
      method: "POST",
      body: JSON.stringify({ newPassword: password }),
    });
    if (!res.ok) console.warn("Failed to sync password change status with backend");
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  const updateProfile = async (data: { name: string }) => {
    const res = await apiFetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update profile");
    }
    const updatedUser = await res.json();
    queryClient.setQueryData(["/api/user"], updatedUser);
    return updatedUser;
  };

  return {
    user: userQuery.data ?? null,
    isLoading: isSupabaseLoading || (userQuery.isPending && userQuery.fetchStatus !== "idle"),
    loginWithGoogle,
    loginWithPassword,
    registerWithPassword,
    logout,
    updatePassword,
    updateProfile,
  };
}