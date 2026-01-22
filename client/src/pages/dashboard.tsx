
import { useAuth } from "@/hooks/use-auth";
import { useInvoices } from "@/hooks/use-invoices";
import { useCompanies } from "@/hooks/use-companies";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Plus,
  Server,
  Wifi,
  FileText,
  Settings,
  Building2,
  Fingerprint,
  Activity,
  RefreshCw,
  ClipboardList
} from "lucide-react";
import React, { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { useCurrencies } from "@/hooks/use-currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: companies } = useCompanies();
  const selectedCompany = companies?.[0]; // Single tenant focus
  const { data: invoices, isLoading } = useInvoices(selectedCompany?.id || 0);
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["stats", "summary", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/stats/summary`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return await res.json();
    },
    enabled: !!selectedCompany?.id
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: pingZimra, isPending: isPinging } = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) return;
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/zimra/ping`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Ping failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setPingSuccess(true); // Set success state
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err: Error) => {
      setPingSuccess(false);
      toast({
        title: "Ping Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Track ping success locally for UI state
  const [pingSuccess, setPingSuccess] = React.useState(false);
  const isOnline = pingSuccess;

  // Auto-Ping on Mount if Configured
  React.useEffect(() => {
    if (selectedCompany?.fdmsDeviceId) {
      pingZimra();
    }
  }, [selectedCompany?.fdmsDeviceId]);

  // Fetch Live Status on Mount (to get real fiscal day status)
  const zimraStatusQuery = useQuery({
    queryKey: ["zimraStatus", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !selectedCompany.fdmsDeviceId) return null;
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/zimra/status`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!selectedCompany?.id && !!selectedCompany.fdmsDeviceId
  });

  const { mutate: closeFiscalDay, isPending: isClosing } = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) return;
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/zimra/day/close`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to close fiscal day");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fiscal Day Closed",
        description: `Successfully closed day ${data.fiscalDayNo}.`,
        className: "bg-emerald-600 text-white"
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "summary", selectedCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["zimraStatus", selectedCompany?.id] });
    },
    onError: (err: Error) => {
      toast({
        title: "Closure Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const { mutate: openFiscalDay, isPending: isOpening } = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) return;
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/zimra/day/open`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to open fiscal day");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fiscal Day Opened",
        description: `Successfully opened day ${data.fiscalDayNo}.`,
        className: "bg-emerald-600 text-white"
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["zimraStatus", selectedCompany?.id] });
    },
    onError: (err: Error) => {
      toast({
        title: "Opening Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const { data: currencies } = useCurrencies(selectedCompany?.id || 0);
  const [reportCurrencyCode, setReportCurrencyCode] = React.useState<string>("ZiG");

  const consolidatedCurrency = currencies?.find(c => c.code === reportCurrencyCode) || currencies?.find(c => c.code === 'USD');
  const consolidatedRate = Number(consolidatedCurrency?.exchangeRate || 1);
  const consolidatedSymbol = consolidatedCurrency?.symbol || (reportCurrencyCode === 'USD' ? '$' : reportCurrencyCode);

  const stats = useMemo(() => {
    return {
      total: (summary?.totalRevenue || 0) * consolidatedRate,
      pending: (summary?.pendingAmount || 0) * consolidatedRate,
      count: summary?.invoicesCount || 0
    };
  }, [summary, consolidatedRate]);

  // Fiscal Day Alert Logic
  const { data: deviceStatus } = useDeviceStatus(selectedCompany?.id || 0);
  const showTimeAlert = React.useMemo(() => {
    if (!deviceStatus?.fiscalDayOpen) return false;
    const hour = new Date().getHours();
    return hour >= 17; // 5 PM
  }, [deviceStatus]);

  const isConfigured = selectedCompany?.tin && selectedCompany.fdmsDeviceId;

  if (!selectedCompany) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to ZimInvoice Pro</h2>
          <p className="text-slate-500 mb-8 max-w-md">Let's get your business set up for ZIMRA compliance.</p>
          <Button onClick={() => setLocation("/onboarding")} size="lg" className="btn-gradient">
            Setup Business Profile
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showTimeAlert && (
        <div className="mb-4">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
            <Clock className="h-4 w-4" />
            <AlertTitle>Fiscal Day is still Open</AlertTitle>
            <AlertDescription>
              It is past 5:00 PM. Please remember to <Link href="/zimra-settings" className="font-bold underline">Close the Fiscal Day</Link> to ensure compliance.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span>
          </p>
        </div>
        {!isConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">FDMS Configuration Incomplete</span>
            <Button variant="outline" size="sm" className="ml-auto bg-white border-amber-300 text-amber-900 hover:bg-amber-100" onClick={() => setLocation("/zimra-settings")}>
              Fix Now
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* Business Identity Card */}
        <Link href="/settings">
          <Card className="card-depth border-none h-full bg-gradient-to-br from-white to-slate-50 hover:border-violet-200 transition-all cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-100 transition-colors" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 group-hover:text-violet-600 group-hover:scale-110 transition-all">
                  {selectedCompany.logoUrl ? (
                    <img src={selectedCompany.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{selectedCompany.name}</div>
                  <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1 group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors">
                    {selectedCompany.city}, Zimbabwe
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100/50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Fingerprint className="w-4 h-4" /> TIN / BP
                </div>
                <div className="font-mono text-sm font-semibold text-slate-700">
                  {selectedCompany.tin || selectedCompany.bpNumber || "Not Set"}
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText className="w-4 h-4" /> VAT Status
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-bold ${selectedCompany.vatEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {selectedCompany.vatEnabled ? "Registered" : "Non-VAT"}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Stats Cards */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-4">
          <Card className="card-depth border-none flex flex-col justify-between">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle>
              <Select value={reportCurrencyCode} onValueChange={setReportCurrencyCode}>
                <SelectTrigger className="w-[80px] h-7 text-[10px] py-0 px-2">
                  <SelectValue placeholder="Cur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  {currencies?.filter(c => c.code !== 'USD').map(c => (
                    <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-slate-900">
                {consolidatedSymbol}{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-600 flex items-center mt-2 font-medium">
                <TrendingUp className="w-3 h-3 mr-1" /> Converted from USD
              </div>
            </CardContent>
          </Card>
          <Card className="card-depth border-none flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-slate-900">
                {consolidatedSymbol}{stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-amber-600 mt-2 font-medium">
                {((stats.pending / (stats.total || 1)) * 100).toFixed(0)}% of total revenue
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions & FDMS Status */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-28 flex-col gap-3 bg-white card-depth border-none hover:border-violet-200 hover:bg-violet-50 group transition-all"
              onClick={() => setLocation("/invoices/new")}
            >
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">New Invoice</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-3 bg-white card-depth border-none hover:border-blue-200 hover:bg-blue-50 group transition-all"
              onClick={() => setLocation("/customers")}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">Customers</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-3 bg-white card-depth border-none hover:border-amber-200 hover:bg-amber-50 group transition-all"
              onClick={() => setLocation("/quotations/new")}
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">New Quote</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-3 bg-white card-depth border-none hover:border-emerald-200 hover:bg-emerald-50 group transition-all"
              onClick={() => setLocation("/products")}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">Products</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-3 bg-white card-depth border-none hover:border-slate-200 hover:bg-slate-50 group transition-all"
              onClick={() => setLocation("/settings")}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">All Settings</span>
            </Button>
          </div>

          {/* FDMS Status Card */}
          <Card className="border-none bg-slate-900 text-white rounded-xl overflow-hidden relative shadow-slate-900/20 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Server className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">Fiscal Device</CardTitle>
                    <CardDescription className="text-slate-400 text-xs mt-0.5">
                      ZIMRA FDMS Compliance Hook
                    </CardDescription>
                  </div>
                </div>
                {/* Status Badge: Dependent on Ping Result */}
                {zimraStatusQuery.isLoading || isPinging ? (
                  <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide">
                    Checking...
                  </span>
                ) : (
                  <span
                    className={`backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wide ${isOnline ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
                  >
                    {isOnline ? "Connected" : "Offline"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Fiscal Day</div>
                    <div className="flex items-center justify-between">
                      {/* Prefer Live Status over Company Data */}
                      <div className="text-2xl font-bold font-display tracking-tight text-white">
                        {zimraStatusQuery.isLoading ? (
                          <span className="text-sm text-slate-400">Loading...</span>
                        ) : zimraStatusQuery.data ? (
                          zimraStatusQuery.data.fiscalDayStatus === 'FiscalDayOpened' ? "OPEN" : "CLOSED"
                        ) : (
                          selectedCompany.fiscalDayOpen ? "OPEN" : "CLOSED"
                        )}
                      </div>
                      {zimraStatusQuery.data?.fiscalDayStatus === 'FiscalDayOpened' || (!zimraStatusQuery.data && selectedCompany.fiscalDayOpen) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[10px] font-bold uppercase bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/40"
                          onClick={() => {
                            if (confirm("Are you sure you want to close the fiscal day? This action cannot be undone.")) {
                              closeFiscalDay();
                            }
                          }}
                          disabled={isClosing}
                        >
                          {isClosing ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                          Close Day
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/40"
                          onClick={() => openFiscalDay()}
                          disabled={isOpening}
                        >
                          {isOpening ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                          Open Day
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Status: {zimraStatusQuery.data?.fiscalDayStatus || selectedCompany.lastFiscalDayStatus || (selectedCompany.fiscalDayOpen ? "Active" : "Closed")}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">System Status</div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-white" onClick={() => pingZimra()} disabled={isPinging}>
                      <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                    {pingSuccess ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isPinging ? '...' : (
                      // Fallback to stored ping if available but show Offline if ping failed
                      selectedCompany.lastPing ? 'Offline' : 'Offline'
                    ))}
                  </div>
                  <div className={`text-xs mt-1 flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isOnline ? <Activity className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                    {isOnline ? 'Online' : 'No Signal'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card className="card-depth border-none h-full bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-slate-500 text-center py-8">Loading activity...</div>
              ) : invoices?.slice(0, 5).map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer border border-slate-100 hover:border-violet-100 shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 transition-all">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-violet-600 transition-colors">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${Number(inv.total).toFixed(2)}</p>
                      <StatusBadge status={inv.status!} className="scale-75 origin-right" />
                    </div>
                  </div>
                </Link>
              ))}
              {invoices?.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">No invoices generated yet.</div>
              )}

              <Link href="/invoices">
                <Button variant="ghost" className="w-full mt-4 text-slate-500 hover:text-violet-600">View All History</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
