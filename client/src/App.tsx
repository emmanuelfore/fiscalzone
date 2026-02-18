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
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const { activeCompany, isLoading: isLoadingActiveCompany } = useActiveCompany();
  const [location, setLocation] = useLocation();

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

  if (!companies || companies.length === 0) {
    return <Redirect to="/onboarding" />;
  }

  // Role based redirection for Cashiers
  if (activeCompany) {
    const role = (activeCompany as any).role;
    const allowedCashierPaths = ["/pos", "/pos/my-sales"];
    // Redirection for Cashiers - SuperAdmins are ALWAYS exempt from forced POS view
    if (!user?.isSuperAdmin && role === "cashier" && !allowedCashierPaths.includes(location)) {
      return <Redirect to="/pos" />;
    }
  }

  return <Component />;
}

function OnboardingRoute() {
  const { user, isLoading } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);

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

  if (companies && companies.length > 0) {
    return <Redirect to="/dashboard" />;
  }

  return <OnboardingPage />;
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
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

      <Route component={NotFound} />
    </Switch>
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
