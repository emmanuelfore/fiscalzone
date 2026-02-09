import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
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
import ReportsPage from "@/pages/reports";
import UserProfilePage from "@/pages/user-profile";
import AuditLogsPage from "@/pages/audit-logs";
import QuotationsPage from "@/pages/quotations";
import CreateQuotationPage from "@/pages/create-quotation";
import RecurringInvoicesPage from "@/pages/recurring-invoices";
import ZimraLogsPage from "@/pages/zimra-logs";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !isLoading && !isLoadingCompanies) {
      if (!companies || companies.length === 0) {
        setLocation("/onboarding");
      }
    }
  }, [user, companies, isLoading, isLoadingCompanies, setLocation]);

  if (isLoading || isLoadingCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!companies || companies.length === 0) {
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />

      <Route path="/onboarding">
        {() => {
          if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
          return <OnboardingPage />;
        }}
      </Route>

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
      <Route path="/reports">
        {() => <ProtectedRoute component={ReportsPage} />}
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
