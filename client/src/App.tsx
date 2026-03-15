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
import TaxReportsPage from "@/pages/tax-reports";
import PosSettingsPage from "@/pages/pos-settings";
import SubscriptionPage from "@/pages/subscription";
import PosLoginPage from "@/pages/pos-login";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useCompanies } from "@/hooks/use-companies";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { getPwaLaunchRedirect } from "@/hooks/use-pwa-install";
import { useIsOnline } from "@/hooks/use-is-online";

// Prevents loading states from spinning forever.
// Returns true while `loading` is true, but automatically
// resolves to false after `maxMs` milliseconds regardless.
function useBoundedLoading(loading: boolean, maxMs = 5000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), maxMs);
    return () => clearTimeout(timer);
  }, [loading, maxMs]);

  return loading && !timedOut;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const {
    data: companies,
    isLoading: isLoadingCompanies,
    isError: isCompaniesError,
  } = useCompanies(!!user);
  const { activeCompany, isLoading: isLoadingActiveCompany } = useActiveCompany(!!user);
  const [location, setLocation] = useLocation();
  const isOnline = useIsOnline();
  const hasRedirectedToPosRef = useRef(false);

  const isPosPath = location.startsWith("/pos");
  const isOffline = !isOnline || isCompaniesError;

  const rawLoading = isLoadingAuth || (!!user && (isLoadingCompanies || isLoadingActiveCompany));
  const isLoading = useBoundedLoading(rawLoading);

  useEffect(() => {
    if (isOffline && !isPosPath && !hasRedirectedToPosRef.current) {
      hasRedirectedToPosRef.current = true;
      setLocation("/pos");
    }
  }, [isOffline, isPosPath, setLocation]);

  if (isLoading) return <LoadingScreen />;

  // No user at all — if offline send to /pos (they may have cached data),
  // if online send to /auth
  if (!user) return <Redirect to={isOffline ? "/pos" : "/auth"} />;

  if (!isOffline && activeCompany) {
    const role = (activeCompany as any).role;
    const isCashier = role === "cashier" && !user?.isSuperAdmin;
    const isAllowedPath = isPosPath || location.startsWith("/profile");
    if (isCashier && !isAllowedPath) return <Redirect to="/pos" />;
  }

  return <Component />;
}

function OnboardingRoute() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies, isError } = useCompanies(!!user);
  const isOnline = useIsOnline();

  const rawLoading = isLoadingAuth || (!!user && isLoadingCompanies);
  const isLoading = useBoundedLoading(rawLoading);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/auth" />;
  if (!isOnline || isError) return <Redirect to="/pos" />;

  if (companies && companies.length > 0) {
    const role = (companies[0] as any).role;
    const isCashier = role === "cashier" && !user?.isSuperAdmin;
    return <Redirect to={isCashier ? "/pos" : "/dashboard"} />;
  }

  return <OnboardingPage />;
}

function Router() {
  const { user, isLoading: rawAuthLoading } = useAuth();
  const isOnline = useIsOnline();
  const isLoading = useBoundedLoading(rawAuthLoading);

  // If launched as an installed PWA from /pos, go straight there
  const pwaRedirect = getPwaLaunchRedirect();
  if (pwaRedirect) return <Redirect to={pwaRedirect} />;

  if (isLoading) return <LoadingScreen />;

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to={isOnline ? "/dashboard" : "/pos"} /> : <AuthPage />}
      </Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/pos-login" component={PosLoginPage} />

      <Route path="/onboarding" component={OnboardingRoute} />

      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/invoices">{() => <ProtectedRoute component={InvoicesPage} />}</Route>
      <Route path="/invoices/new">{() => <ProtectedRoute component={CreateInvoicePage} />}</Route>
      <Route path="/invoices/:id">{() => <ProtectedRoute component={InvoiceDetailsPage} />}</Route>
      <Route path="/customers">{() => <ProtectedRoute component={CustomersPage} />}</Route>
      <Route path="/customers/:id">{() => <ProtectedRoute component={CustomerDetailsPage} />}</Route>
      <Route path="/suppliers">{() => <ProtectedRoute component={SuppliersPage} />}</Route>
      <Route path="/expenses">{() => <ProtectedRoute component={ExpensesPage} />}</Route>
      <Route path="/inventory">{() => <ProtectedRoute component={InventoryTransactionsPage} />}</Route>
      <Route path="/inventory/account">{() => <ProtectedRoute component={InventoryAccountPage} />}</Route>
      <Route path="/reports/inventory">{() => <ProtectedRoute component={InventoryReportsPage} />}</Route>
      <Route path="/reports/financial">{() => <ProtectedRoute component={FinancialReportsPage} />}</Route>
      <Route path="/products">{() => <ProtectedRoute component={ProductsPage} />}</Route>
      <Route path="/services">{() => <ProtectedRoute component={ServicesPage} />}</Route>
      <Route path="/tax-config">{() => <ProtectedRoute component={TaxConfigPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route path="/currencies">{() => <ProtectedRoute component={CurrencySettingsPage} />}</Route>
      <Route path="/team-settings">{() => <ProtectedRoute component={TeamSettingsPage} />}</Route>
      <Route path="/reports/pos">{() => <ProtectedRoute component={PosReportsPage} />}</Route>
      <Route path="/reports/tax">{() => <ProtectedRoute component={TaxReportsPage} />}</Route>
      <Route path="/reports">{() => <Redirect to="/reports/pos" />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={UserProfilePage} />}</Route>
      <Route path="/zimra-settings">{() => <ProtectedRoute component={ZimraSettingsPage} />}</Route>
      <Route path="/zimra-logs">{() => <ProtectedRoute component={ZimraLogsPage} />}</Route>
      <Route path="/fdms-test">{() => <ProtectedRoute component={FdmsTestPage} />}</Route>
      <Route path="/quotations">{() => <ProtectedRoute component={QuotationsPage} />}</Route>
      <Route path="/quotations/new">{() => <ProtectedRoute component={CreateQuotationPage} />}</Route>
      <Route path="/recurring">{() => <ProtectedRoute component={RecurringInvoicesPage} />}</Route>
      <Route path="/subscription">{() => <ProtectedRoute component={SubscriptionPage} />}</Route>
      <Route path="/pos/my-sales">{() => <ProtectedRoute component={MySalesPage} />}</Route>
      <Route path="/pos/reports">{() => <Redirect to="/reports/pos" />}</Route>
      <Route path="/pos/all-sales">{() => <ProtectedRoute component={RecentSalesPage} />}</Route>
      <Route path="/pos">{() => <ProtectedRoute component={POSPage} />}</Route>
      <Route path="/pos-settings">{() => <ProtectedRoute component={PosSettingsPage} />}</Route>
      <Route path="/">
        {user ? <Redirect to={isOnline ? "/dashboard" : "/pos"} /> : <LandingPage />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Bridge: service worker asks for auth token during background sync
function useSwAuthBridge() {
  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'GET_AUTH_TOKEN') return;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? null;
        event.ports[0]?.postMessage({ token });
      } catch {
        event.ports[0]?.postMessage({ token: null });
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);
}

function App() {
  useSwAuthBridge();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PwaInstallPrompt />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;