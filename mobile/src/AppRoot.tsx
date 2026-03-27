import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assertEnv } from "./lib/env";
import { supabase } from "./lib/supabase";
import { apiJson } from "./lib/api";
import { PremiumColors } from "./ui/PremiumColors";
import { LoginScreen } from "./screens/LoginScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";

import { CompanySelectScreen } from "./screens/CompanySelectScreen";
import { POSScreen } from "./screens/POSScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { StockInScreen } from "./screens/StockInScreen";
import { CustomersScreen } from "./screens/CustomersScreen";
import { SuppliersScreen } from "./screens/SuppliersScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { StockTakeScreen } from "./screens/StockTakeScreen";
import { AppDrawer } from "./ui/AppDrawer";
import { BottomTabs } from "./ui/BottomTabs";
import { Button } from "./ui/Button";
import { getSelectedCompanyId, setSelectedCompanyId } from "./lib/storage";

type Stage = "boot" | "login" | "forgot-password" | "onboarding" | "company" | "main";

type ScreenName = "pos" | "reports" | "profile" | "inventory" | "stockin" | "customers" | "suppliers" | "expenses" | "stocktake";

export function AppRoot() {
  const [stage, setStage] = useState<Stage>("boot");
  const [bootError, setBootError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("pos");
  const [showDrawer, setShowDrawer] = useState(false);
  const [userName, setUserName] = useState("Cashier");
  const [userRole, setUserRole] = useState("member");
  const [userId, setUserId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);

  const [retryCount, setRetryCount] = useState(0);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUserName(
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split("@")[0] ||
        "Cashier"
      );
      setUserId(data.user.id);
    }
    
    try {
      const companies = await apiJson<any[]>('/api/companies');
      if (Array.isArray(companies)) {
        // Cache for offline use
        await AsyncStorage.setItem('cached_companies', JSON.stringify(companies));
        setCompanies(companies);
        return companies;
      }
      return [];
    } catch (e: any) {
      // Offline — try cached companies
      try {
        const cached = await AsyncStorage.getItem('cached_companies');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
      
      // If no cache and network failed, propagate the error so the boot sequence knows
      throw new Error(`Connection error: ${e.message || "Could not reach server"}. Please ensure you have an active internet connection.`);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setBootError(null);
        assertEnv();

        if (!supabase) {
          throw new Error("Supabase client not initialized. Check your environment variables.");
        }

        const cachedCompanyId = await getSelectedCompanyId();
        if (!cancelled) setCompanyId(cachedCompanyId);

        const sessionResult = await supabase.auth.getSession();
        const authed = !!sessionResult.data.session?.access_token;
        
        if (!cancelled) {
          if (!authed) {
            setStage("login");
          } else {
            const companies = await fetchUser();
            const cachedId = await getSelectedCompanyId();
            const validCompany = companies.find(c => (c && c.id === cachedId));

            if (validCompany) {
              if (validCompany.role) setUserRole(validCompany.role);
              setCompanyId(cachedId);
              setStage("main");
            } else {
              await setSelectedCompanyId(null);
              setCompanyId(null);
              setStage(companies.length > 0 ? "company" : "onboarding");
            }
          }
        }
      } catch (e: any) {
        console.error("[Auth] Initialization error:", e);
        if (!cancelled) {
          setBootError(e?.message || "Unknown error");
          setStage("boot");
        }
      }
    };

    initialize();

    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      try {
        console.log("[Auth] Event:", event, session ? "Session active" : "No session");
        const authed = !!session?.access_token;
        if (!authed) {
          setStage("login");
          setCompanyId(null);
        } else {
          // Re-fetch user/companies on auth change to ensure sync
          await fetchUser();
        }
      } catch (e) {
        console.error("[Auth] Error on auth change:", e);
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [retryCount]);

  const handleLogout = async () => {
    setShowDrawer(false);
    await supabase.auth.signOut();
    await setSelectedCompanyId(null);
    setCompanyId(null);
    setStage("login");
    setBootError(null); // Clear error on logout
  };

  const content = useMemo(() => {
    if (bootError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: PremiumColors.bg.primary }}>
          <Text style={{ color: "#ff4757", fontWeight: "900", fontSize: 20, marginBottom: 12 }}>
            Connection Error
          </Text>
          <Text style={{ color: PremiumColors.text.primary, textAlign: "center", marginBottom: 24, fontSize: 14, lineHeight: 20 }}>
            {bootError}
          </Text>
          
          <Button 
            title="Try Again" 
            onPress={() => {
              setRetryCount(prev => prev + 1);
            }} 
            style={{ width: "100%", marginBottom: 12 }}
          />

          <Button 
            title="Sign Out" 
            variant="ghost" 
            onPress={handleLogout} 
            style={{ width: "100%" }}
          />
        </View>
      );
    }

    if (stage === "boot") {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={PremiumColors.amber.primary} />
        </View>
      );
    }

    if (stage === "login") {
      return (
        <LoginScreen
          onForgotPassword={() => setStage("forgot-password")}
          onLoggedIn={async () => {

            const companies = await fetchUser();
            const cachedId = await getSelectedCompanyId();
            const validCompany = companies.find(c => c.id === cachedId);

            if (validCompany) {
              if (validCompany.role) setUserRole(validCompany.role);
              setCompanyId(cachedId);
              setStage("main");
            } else {
              await setSelectedCompanyId(null);
              setCompanyId(null);
              setStage(companies.length > 0 ? "company" : "onboarding");
            }
          }}
        />
      );
    }

    if (stage === "forgot-password") {
      return <ForgotPasswordScreen onBack={() => setStage("login")} />;
    }

    if (stage === "onboarding") {

      return (
        <OnboardingScreen
          onComplete={async (id) => {
            await setSelectedCompanyId(id);
            setCompanyId(id);
            setStage("main");
          }}
          onSignOut={handleLogout}
        />
      );
    }

    if (stage === "company") {
      return (
        <CompanySelectScreen
          onSelected={async (id) => {
            if (id === -1) {
              setStage("onboarding");
              return;
            }
            
            // Re-sync role for the newly selected company
            const selected = companies.find(c => c.id === id);
            if (selected?.role) setUserRole(selected.role);
            
            await setSelectedCompanyId(id);
            setCompanyId(id);
            setStage("main");
          }}
          onSignOut={handleLogout}
        />
      );
    }

    if (!companyId) {
      setStage("company");
      return null;
    }

    return (
      <View style={{ flex: 1 }}>
        {currentScreen === "pos" && (
          <POSScreen 
            companyId={companyId} 
            userName={userName}
            onOpenDrawer={() => setShowDrawer(true)} 
          />
        )}
        {currentScreen === "reports" && (
          <ReportsScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            companyId={companyId}
            userRole={userRole}
            userId={userId || undefined}
            userName={userName}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}
        {currentScreen === "profile" && (
          <ProfileScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            userName={userName}
            onLogout={handleLogout}
          />
        )}
        {currentScreen === "inventory" && (
          <InventoryScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            companyId={companyId}
          />
        )}
        {currentScreen === "stockin" && (
          <StockInScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            onClose={() => setCurrentScreen("inventory")}
            companyId={companyId}
          />
        )}
        {currentScreen === "customers" && (
          <CustomersScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            companyId={companyId}
          />
        )}
        {currentScreen === "suppliers" && (
          <SuppliersScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            companyId={companyId}
          />
        )}
        {currentScreen === "expenses" && (
          <ExpensesScreen 
            onOpenDrawer={() => setShowDrawer(true)} 
            companyId={companyId}
          />
        )}
        {currentScreen === "stocktake" && (
          <StockTakeScreen 
            companyId={companyId}
            onClose={() => setCurrentScreen("reports")}
          />
        )}

        <AppDrawer
          visible={showDrawer}
          onClose={() => setShowDrawer(false)}
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onLogout={handleLogout}
          userName={userName}
          userRole={userRole}
        />
        
        <BottomTabs
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onOpenDrawer={() => setShowDrawer(true)}
          userRole={userRole}
          userName={userName}
        />
      </View>
    );
  }, [bootError, stage, companyId, currentScreen, showDrawer, userName, userRole]);

  return (
    <View style={{ flex: 1, backgroundColor: PremiumColors.bg.base }}>
      {content}
    </View>
  );
}

