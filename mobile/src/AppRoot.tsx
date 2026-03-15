import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { assertEnv } from "./lib/env";
import { supabase } from "./lib/supabase";
import { apiJson } from "./lib/api";
import { PremiumColors } from "./ui/PremiumColors";
import { LoginScreen } from "./screens/LoginScreen";
import { CompanySelectScreen } from "./screens/CompanySelectScreen";
import { POSScreen } from "./screens/POSScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { StockInScreen } from "./screens/StockInScreen";
import { CustomersScreen } from "./screens/CustomersScreen";
import { SuppliersScreen } from "./screens/SuppliersScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { AppDrawer } from "./ui/AppDrawer";
import { BottomTabs } from "./ui/BottomTabs";
import { getSelectedCompanyId, setSelectedCompanyId } from "./lib/storage";

type Stage = "boot" | "login" | "company" | "main";
type ScreenName = "pos" | "reports" | "profile" | "inventory" | "stockin" | "customers" | "suppliers" | "expenses";

export function AppRoot() {
  const [stage, setStage] = useState<Stage>("boot");
  const [bootError, setBootError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>("pos");
  const [showDrawer, setShowDrawer] = useState(false);
  const [userName, setUserName] = useState("Cashier");
  const [userRole, setUserRole] = useState("member");
  const [userId, setUserId] = useState<string | null>(null);

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
    // Fetch role from companies list
    try {
      const res = await apiJson<any[]>('/api/companies');
      if (res && res.length > 0) {
        const company = res.find((c: any) => c.id === companyId) || res[0];
        if (company?.role) setUserRole(company.role);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    try {
      assertEnv();
    } catch (e: any) {
      setBootError(e?.message ?? "Missing configuration");
      setStage("boot");
      return;
    }

    let cancelled = false;

    (async () => {
      const cachedCompanyId = await getSelectedCompanyId();
      if (!cancelled) setCompanyId(cachedCompanyId);

      const session = await supabase.auth.getSession();
      const authed = !!session.data.session?.access_token;
      if (!cancelled) {
        if (!authed) setStage("login");
        else {
          await fetchUser();
          if (!cachedCompanyId) setStage("company");
          else setStage("main");
        }
      }
    })();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authed = !!session?.access_token;
      if (!authed) {
        setStage("login");
        return;
      }
      await fetchUser();
      const cachedCompanyId = await getSelectedCompanyId();
      setCompanyId(cachedCompanyId);
      setStage(cachedCompanyId ? "main" : "company");
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setShowDrawer(false);
    await supabase.auth.signOut();
    setCompanyId(null);
    setStage("login");
  };

  const content = useMemo(() => {
    if (bootError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 18, marginBottom: 12 }}>
            Mobile app not configured
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{bootError}</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 10 }}>
            Copy `mobile/.env.example` → `mobile/.env` and fill in the values.
          </Text>
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
          onLoggedIn={async () => {
            const cachedCompanyId = await getSelectedCompanyId();
            setCompanyId(cachedCompanyId);
            setStage(cachedCompanyId ? "main" : "company");
          }}
        />
      );
    }

    if (stage === "company") {
      return (
        <CompanySelectScreen
          onSelected={async (id) => {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: PremiumColors.bg.base }}>
      {content}
    </SafeAreaView>
  );
}

