import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OnboardingPage from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices";
import CreateInvoicePage from "@/pages/create-invoice";
import InvoiceDetailsPage from "@/pages/invoice-details";
import CustomersPage from "@/pages/customers";
import CustomerDetailsPage from "@/pages/customer-details";
import SuppliersPage from "@/pages/suppliers";
import ExpensesPage from "@/pages/expenses";
import InventoryTransactionsPage from "@/pages/inventory-transactions";
import InventoryAccountPage from "@/pages/inventory-account";
import ProductsPage from "@/pages/products";
import ServicesPage from "@/pages/services";
import TaxConfigPage from "@/pages/tax-config";
import SettingsPage from "@/pages/settings";
import ZimraSettingsPage from "@/pages/zimra-settings";
import FdmsTestPage from "@/pages/fdms-test";
import CurrencySettingsPage from "@/pages/currency-settings";
import TeamSettingsPage from "@/pages/team-settings";
import UserProfilePage from "@/pages/user-profile";
import AuditLogsPage from "@/pages/audit-logs";
import QuotationsPage from "@/pages/quotations";
import CreateQuotationPage from "@/pages/create-quotation";
import FinancialReportsPage from "@/pages/financial-reports";
import InventoryReportsPage from "@/pages/inventory-reports";
import RecurringInvoicesPage from "@/pages/recurring-invoices";
import ZimraLogsPage from "@/pages/zimra-logs";
import POSPage from "@/pages/pos";
import MySalesPage from "@/pages/my-sales";
import PosReportsPage from "@/pages/pos-reports";
import RecentSalesPage from "@/pages/recent-sales";
// import InventoryReportsPage from "@/pages/inventory-reports";
import TaxReportsPage from "@/pages/tax-reports";
import PosSettingsPage from "@/pages/pos-settings";
import SubscriptionPage from "@/pages/subscription";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function useIsOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Listen for hardware events (fastest response for Wi-Fi toggles)
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Active Polling (backup for when hardware events are unreliable/laggy)
    const checkConnection = async () => {
      // If hardware is definitely offline, trust it immediately
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // Ping the public health endpoint with a cache-buster to force a real network check
        const response = await fetch(`/api/health?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        }).catch(() => null);

        clearTimeout(timeoutId);

        // Treat any successful non-503 response as "Online"
        // (status 503 is returned by our SW when the network is actually unreachable)
        if (response && response.ok && response.status !== 503) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch (err) {
        setIsOnline(false);
      }
    };

    // Poll every 5 seconds for a tighter response loop
    const interval = setInterval(checkConnection, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies, isSuccess: isCompaniesSuccess, isError: isCompaniesError } = useCompanies(!!user);
  const { activeCompany, isLoading: isLoadingActiveCompany } = useActiveCompany();
  const [location] = useLocation();
  const isOnline = useIsOnline();

  if (isLoading || isLoadingCompanies || isLoadingActiveCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect to onboarding ONLY if:
  // 1. We are online (browser thinks we have connection)
  // 2. The query succeeded (didn't catch an error)
  // 3. We have a non-null result that is definitely an empty array.
  // This avoids accidental redirects during network hiccups or if the offline cache is empty.
  const isPossiblyOffline = !isOnline || isCompaniesError;
  const hasConfirmedEmpty = !isPossiblyOffline && isCompaniesSuccess && Array.isArray(companies) && companies.length === 0;

  if (hasConfirmedEmpty) {
    return <Redirect to="/onboarding" />;
  }

  // Redirection Logic
  const isPosPath = location.startsWith("/pos");
  const isOffline = !isOnline || isCompaniesError;

  // hard-reload on disconnect
  useEffect(() => {
    if (isOffline && !isPosPath) {
      window.location.href = "/pos";
    }
  }, [isOffline, isPosPath]);

  // 1. IF OFFLINE: Force POS access only (extra fallback)
  if (isOffline && !isPosPath) {
    return null; // Let useEffect handle reload
  }

  // 2. IF ONLINE: Normal role-based restrictions
  if (!isOffline && activeCompany) {
    const role = (activeCompany as any).role;
    const isCashier = role === "cashier" && !user?.isSuperAdmin;
    const isAllowedPath = isPosPath || location.startsWith("/profile");

    if (isCashier && !isAllowedPath) {
      return <Redirect to="/pos" />;
    }
  }

  return <Component />;
}

function OnboardingRoute() {
  const { user, isLoading } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies, isError } = useCompanies(!!user);
  const isOnline = useIsOnline();

  if (isLoading || isLoadingCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Always redirect to POS as requested
  if (!isOnline || isError) {
    return <Redirect to="/pos" />;
  }

  if (companies && companies.length > 0) {
    const isOffline = !navigator.onLine || isError;
    if (isOffline) return <Redirect to="/pos" />;

    const role = (companies[0] as any).role;
    const isCashier = role === "cashier" && !user?.isSuperAdmin;
    return <Redirect to={isCashier ? "/pos" : "/dashboard"} />;
  }

  return <OnboardingPage />;
}

function Router() {
  const { user, isLoading } = useAuth();
  const isOnline = useIsOnline();

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to={isOnline ? "/dashboard" : "/pos"} /> : <AuthPage />}
      </Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      <Route path="/onboarding" component={OnboardingRoute} />

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={InvoicesPage} />}
      </Route>
      <Route path="/invoices/new">
        {() => <ProtectedRoute component={CreateInvoicePage} />}
      </Route>
      <Route path="/invoices/:id">
        {() => <ProtectedRoute component={InvoiceDetailsPage} />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={CustomersPage} />}
      </Route>
      <Route path="/customers/:id">
        {() => <ProtectedRoute component={CustomerDetailsPage} />}
      </Route>
      <Route path="/suppliers">
        {() => <ProtectedRoute component={SuppliersPage} />}
      </Route>
      <Route path="/expenses">
        {() => <ProtectedRoute component={ExpensesPage} />}
      </Route>
      <Route path="/inventory">
        {() => <ProtectedRoute component={InventoryTransactionsPage} />}
      </Route>
      <Route path="/inventory/account">
        {() => <ProtectedRoute component={InventoryAccountPage} />}
      </Route>
      <Route path="/reports/inventory">
        {() => <ProtectedRoute component={InventoryReportsPage} />}
      </Route>
      <Route path="/reports/financial">
        {() => <ProtectedRoute component={FinancialReportsPage} />}
      </Route>
      <Route path="/products">
        {() => <ProtectedRoute component={ProductsPage} />}
      </Route>
      <Route path="/services">
        {() => <ProtectedRoute component={ServicesPage} />}
      </Route>
      <Route path="/tax-config">
        {() => <ProtectedRoute component={TaxConfigPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/currencies">
        {() => <ProtectedRoute component={CurrencySettingsPage} />}
      </Route>
      <Route path="/team-settings">
        {() => <ProtectedRoute component={TeamSettingsPage} />}
      </Route>
      <Route path="/reports/pos">
        {() => <ProtectedRoute component={PosReportsPage} />}
      </Route>
      /* <Route path="/reports/inventory">
        {() => <ProtectedRoute component={InventoryReportsPage} />}
      </Route> */
      <Route path="/reports/tax">
        {() => <ProtectedRoute component={TaxReportsPage} />}
      </Route>
      <Route path="/reports">
        {() => <Redirect to="/reports/pos" />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={UserProfilePage} />}
      </Route>
      <Route path="/zimra-settings">
        {() => <ProtectedRoute component={ZimraSettingsPage} />}
      </Route>
      <Route path="/zimra-logs">
        {() => <ProtectedRoute component={ZimraLogsPage} />}
      </Route>
      <Route path="/fdms-test">
        {() => <ProtectedRoute component={FdmsTestPage} />}
      </Route>
      <Route path="/quotations">
        {() => <ProtectedRoute component={QuotationsPage} />}
      </Route>
      <Route path="/quotations/new">
        {() => <ProtectedRoute component={CreateQuotationPage} />}
      </Route>
      <Route path="/recurring">
        {() => <ProtectedRoute component={RecurringInvoicesPage} />}
      </Route>
      <Route path="/subscription">
        {() => <ProtectedRoute component={SubscriptionPage} />}
      </Route>
      <Route path="/pos/my-sales">
        {() => <ProtectedRoute component={MySalesPage} />}
      </Route>
      <Route path="/pos/reports">
        {() => <Redirect to="/reports/pos" />}
      </Route>
      <Route path="/pos/all-sales">
        {() => <ProtectedRoute component={RecentSalesPage} />}
      </Route>
      <Route path="/pos">
        {() => <ProtectedRoute component={POSPage} />}
      </Route>
      <Route path="/pos-settings">
        {() => <ProtectedRoute component={PosSettingsPage} />}
      </Route>
      <Route path="/">
        {user ? <Redirect to={navigator.onLine ? "/dashboard" : "/pos"} /> : <LandingPage />}
      </Route>

      <Route component={NotFound} />
    </Switch >
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
