
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cacheUser, getCachedUser, clearCachedUser } from "@/lib/offline-db";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(true);

  // Sync Supabase Session on mount
  useEffect(() => {
    let isMounted = true;
    const failSafe = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn("[Auth] Supabase session sync timed out; continuing without blocking UI");
      setIsSupabaseLoading(false);
    }, 3000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        window.clearTimeout(failSafe);
        setIsSupabaseLoading(false);
        if (session) {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        window.clearTimeout(failSafe);
        console.error("Supabase Session Error:", err);
        setIsSupabaseLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSupabaseLoading(false);
      if (session) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else if (navigator.onLine) {
        // ONLY Clear everything if we are definitely online but session is lost
        queryClient.clear();
        // Clear company selection on session loss
        localStorage.removeItem("selectedCompanyId");
      } else {
        console.warn("[Auth] Session change while offline - preserving cache");
      }
    });

    return () => {
      isMounted = false;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const userQuery = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/user");
        if (res.status === 401) {
          await clearCachedUser();
          return null;
        }
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        const user = await res.json();
        if (user) await cacheUser(user);
        return user;
      } catch (err) {
        console.warn("User fetch failed, trying offline cache...", err);
        const cached = await getCachedUser();
        return cached || null;
      }
    },
    // Only fetch if we passed the initial loading check
    enabled: !isSupabaseLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) throw error;
  };

  const loginWithPassword = async ({ email, password }: any) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const registerWithPassword = async ({ email, password, name }: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    await clearCachedUser();
    queryClient.clear();
    // Clear company selection to prevent stale data across user sessions
    localStorage.removeItem("selectedCompanyId");
    setLocation("/auth");
  };

  const updatePassword = async (password: string) => {
    // 1. Update in Supabase
    const { error } = await supabase.auth.updateUser({
      password
    });
    if (error) throw error;

    // 2. Update in our backend to clear "default password" flag
    const res = await apiFetch("/api/user/password", {
      method: "POST",
      body: JSON.stringify({ newPassword: password })
    });

    if (!res.ok) {
      console.warn("Failed to sync password change status with backend");
    }

    // Refresh user data to get updated passwordChanged flag
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
    user: userQuery.data,
    isLoading: isSupabaseLoading || userQuery.fetchStatus === "fetching",
    loginWithGoogle,
    loginWithPassword,
    registerWithPassword,
    logout,
    updatePassword,
    updateProfile,
  };
}
