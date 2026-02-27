import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cacheUser, getCachedUser, clearCachedUser, getPendingSalesCount } from "@/lib/offline-db";
import { useToast } from "@/hooks/use-toast";

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
  // If offline, skip Supabase init entirely — we'll use cached user from IndexedDB
  const startOffline = !navigator.onLine;
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
      }, 4000);

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
          if (navigator.onLine) {
            queryClient.clear();
            localStorage.removeItem("selectedCompanyId");
          } else {
            console.warn("[Auth] Session change while offline - preserving cache");
          }
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
      if (!navigator.onLine) {
        const cached = await getCachedUser();
        if (cached) {
          console.log("[Auth] Offline — using cached user:", cached.email);
          return cached;
        }
        // No cache and offline — return null so UI shows login
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
        // Network error while online (flaky connection) — fall back to cache
        console.warn("[Auth] User fetch failed, trying offline cache...", err);
        const cachedFromQuery = queryClient.getQueryData(["/api/user"]);
        if (cachedFromQuery) return cachedFromQuery;
        const cachedFromOffline = await getCachedUser();
        // Return cached user instead of throwing — keeps POS accessible
        return cachedFromOffline ?? null;
      }
    },
    enabled: !isSupabaseLoading,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) throw error;
  };

  const loginWithPassword = async ({ email, password }: any) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

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
    // Block logout when offline — cached session is needed for POS to work
    if (!navigator.onLine) {
      toast({
        title: "Cannot sign out while offline",
        description: "You must be connected to the internet to sign out. This protects access to offline POS data.",
        variant: "destructive",
      });
      return;
    }

    await supabase.auth.signOut();
    await clearCachedUser();
    queryClient.clear();
    localStorage.removeItem("selectedCompanyId");
    setLocation("/auth");
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