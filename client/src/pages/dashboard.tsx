
import { useAuth } from "@/hooks/use-auth";
import { useInvoices } from "@/hooks/use-invoices";
import { useCompanies } from "@/hooks/use-companies";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell,
  Legend
} from "recharts";
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  Clock,
  CalendarDays,
  Receipt,
  ShoppingCart,
  Plus,
  Settings,
  Server,
  RefreshCw,
  Activity,
  Wifi,
  AlertCircle,
  ShoppingBag,
  Package,
  Key
} from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DayManagementControls } from "@/components/zimra/day-management-controls";
import { useCurrencies } from "@/hooks/use-currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useActiveCompany } from "@/hooks/use-active-company";

export default function Dashboard() {
  const { user } = useAuth();
  const { activeCompany, isLoading: isLoadingCompany } = useActiveCompany();
  const selectedCompany = activeCompany;
  const { data: invoicesResult, isLoading } = useInvoices(selectedCompany?.id || 0, { limit: 5 });
  const invoices = invoicesResult?.data;
  const [, setLocation] = useLocation();

  const { data: currencies } = useCurrencies(selectedCompany?.id || 0);
  const [reportCurrencyCode, setReportCurrencyCode] = React.useState<string>("USD");

  const consolidatedCurrency = currencies?.find(c => c.code === reportCurrencyCode) || currencies?.find(c => c.code === 'USD');
  const consolidatedRate = Number(consolidatedCurrency?.exchangeRate || 1);
  const consolidatedSymbol = consolidatedCurrency?.symbol || (reportCurrencyCode === 'USD' ? '$' : reportCurrencyCode);

  const { data: aging } = useQuery<any>({
    queryKey: [api.reports.receivablesAging.path, selectedCompany?.id, reportCurrencyCode],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(api.reports.receivablesAging.path, { companyId: selectedCompany?.id }) + `?currency=${reportCurrencyCode}`);
      return res.json();
    },
    enabled: !!selectedCompany?.id,
  });

  const { data: fiscalStats } = useQuery<any>({
    queryKey: [api.reports.fiscalYearStats.path, selectedCompany?.id, reportCurrencyCode],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(api.reports.fiscalYearStats.path, { companyId: selectedCompany?.id }) + `?currency=${reportCurrencyCode}`);
      return res.json();
    },
    enabled: !!selectedCompany?.id,
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

  // Add API Key Generation Mutation
  const { mutate: generateApiKey, isPending: isGeneratingKey } = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${selectedCompany.id}/api-keys/generate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to generate API Key");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Generated",
        description: "Your new API key has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // In a real app we might show the full key once here, but 
      // the endpoint currently just saves it and the list/user endpoint returns a masked version.
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message,
      });
    }
  });

  // Auto-Ping on Mount if Configured
  React.useEffect(() => {
    if (selectedCompany?.fdmsDeviceId) {
      pingZimra();
    }
  }, [selectedCompany?.fdmsDeviceId]);

  const stats = useMemo(() => {
    return {
      total: (fiscalStats?.totalSales || 0),
      pending: (aging?.total || 0),
      count: invoices?.length || 0
    };
  }, [fiscalStats, aging, invoices]);

  // Fiscal Day Alert Logic
  const { data: deviceStatus } = useDeviceStatus(selectedCompany?.id || 0);
  const showTimeAlert = React.useMemo(() => {
    const now = new Date();
    const isPast5PM = now.getHours() >= 17;
    const isFiscalDayOpen = deviceStatus?.isFiscalDayOpen || deviceStatus?.fiscalDayOpen;
    return isPast5PM && isFiscalDayOpen;
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


  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: reportCurrencyCode }).format(val);
    } catch (e) {
      // Fallback for non-standard ISO codes or symbols
      return `${consolidatedSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <Layout>
      <div className="space-y-8 pb-12">
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
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
            <p className="text-slate-500 font-medium italic mt-1">Financial overview for the current fiscal year</p>
          </div>
          <div className="flex items-center gap-4">
            {currencies && currencies.length > 0 && (
              <Select value={reportCurrencyCode} onValueChange={setReportCurrencyCode}>
                <SelectTrigger className="w-[120px] bg-white border-slate-200">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="hidden sm:flex bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">Fiscal Year {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/invoices?new=true" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-primary/20 group">
            <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-slate-700 text-sm">New Invoice</span>
          </Link>
          <Link href="/customers" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-blue-500/20 group">
            <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Customers</span>
          </Link>
          <Link href="/products" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-emerald-500/20 group">
            <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Products</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-purple-500/20 group">
            <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Settings</span>
          </Link>
        </div>

        {/* Total Receivables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 glass-card border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Receivables</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black font-display mb-1">{formatCurrency(aging?.total || 0)}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Across all categories</span>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Current", value: aging?.current, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "1-15 Days", value: aging?.days1_15, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "16-30 Days", value: aging?.days16_30, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "31-45 Days", value: aging?.days31_45, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Above 45 Days", value: aging?.above45, color: "text-rose-600", bg: "bg-rose-50" },
            ].map((item, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
                  <p className={cn("text-lg font-black font-display", item.color)}>
                    {formatCurrency(item.value || 0)}
                  </p>
                  <div className={cn("w-full h-1 mt-3 rounded-full opacity-30", item.bg.replace('50', '200'))} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts & Fiscal Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Sales and Expenses</CardTitle>
                <p className="text-xs text-slate-400 font-medium mt-1">Monthly performance trend</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Expenses</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fiscalStats?.monthlyData || []}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                      cursor={{stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5'}}
                    />
                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl bg-white p-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Receipt className="w-3 h-3 text-primary" /> Fiscal Year Summary
              </CardTitle>
              
              <div className="space-y-4">
                {[
                  { label: "Total Sales", value: fiscalStats?.totalSales, color: "text-slate-900", icon: TrendingUp, iconColor: "text-emerald-500" },
                  { label: "Total Receipts", value: fiscalStats?.totalReceipts, color: "text-primary", icon: Receipt, iconColor: "text-primary" },
                  { label: "Total Expenses", value: fiscalStats?.totalExpenses, color: "text-rose-600", icon: ArrowDownRight, iconColor: "text-rose-500" },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl bg-white shadow-sm", item.iconColor.replace('text', 'bg').replace('500', '50'))}>
                        <item.icon className={cn("w-4 h-4", item.iconColor)} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                    </div>
                    <span className={cn("text-lg font-black font-display tracking-tight", item.color)}>
                      {formatCurrency(item.value || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Estimated Net</p>
                    <p className="text-2xl font-black text-primary font-display">
                      {formatCurrency((fiscalStats?.totalSales || 0) - (fiscalStats?.totalExpenses || 0))}
                    </p>
                  </div>
                  <div className="p-2 bg-primary rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-primary" /> Compliance Status
              </CardTitle>
              
              <div className="grid grid-cols-2 gap-4">
                {/* VAT Status */}
                <Card className={cn("border-none shadow-sm rounded-2xl p-4", activeCompany?.vatRegistered ? "bg-emerald-50/50" : "bg-slate-50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", activeCompany?.vatRegistered ? "text-emerald-600/60" : "text-slate-500")}>VAT Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", activeCompany?.vatRegistered ? "bg-emerald-500" : "bg-slate-400")} />
                    <span className={cn("text-xs font-black uppercase tracking-tight", activeCompany?.vatRegistered ? "text-emerald-700" : "text-slate-600")}>
                      {activeCompany?.vatRegistered ? "Registered" : "Not Registered"}
                    </span>
                  </div>
                </Card>

                {/* Fiscal Device */}
                <Card className={cn("border-none shadow-sm rounded-2xl p-4", selectedCompany?.fdmsDeviceId ? "bg-blue-50/50" : "bg-amber-50/50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", selectedCompany?.fdmsDeviceId ? "text-blue-600/60" : "text-amber-600/60")}>Fiscal Device</p>
                  <div className="flex items-center gap-2">
                    <Server className={cn("w-3 h-3", selectedCompany?.fdmsDeviceId ? "text-blue-500" : "text-amber-500")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-tight truncate", selectedCompany?.fdmsDeviceId ? "text-blue-700" : "text-amber-700")} title={selectedCompany?.fdmsDeviceSerialNo || "Not Configured"}>
                      {selectedCompany?.fdmsDeviceSerialNo ? selectedCompany.fdmsDeviceSerialNo.substring(0, 10) + '...' : "Not Configured"}
                    </span>
                  </div>
                </Card>

                {/* Connection Status */}
                <Card className={cn("border-none shadow-sm rounded-2xl p-4", pingSuccess ? "bg-emerald-50/50" : "bg-rose-50/50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", pingSuccess ? "text-emerald-600/60" : "text-rose-600/60")}>Zimra Server</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", pingSuccess ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                      <span className={cn("text-xs font-black uppercase tracking-tight", pingSuccess ? "text-emerald-700" : "text-rose-700")}>
                        {isPinging ? "Checking..." : (pingSuccess ? "Online" : "Offline")}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => pingZimra()} disabled={isPinging}>
                      <RefreshCw className={cn("w-3 h-3", isPinging ? "animate-spin text-slate-400" : "text-slate-500")} />
                    </Button>
                  </div>
                </Card>

                {/* Day Status */}
                <Card className={cn("border-none shadow-sm rounded-2xl p-4", deviceStatus?.isFiscalDayOpen ? "bg-amber-50/50" : "bg-slate-50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", deviceStatus?.isFiscalDayOpen ? "text-amber-600/60" : "text-slate-500")}>Day Status</p>
                  <div className="flex items-center gap-2">
                    <Activity className={cn("w-3 h-3", deviceStatus?.isFiscalDayOpen ? "text-amber-500" : "text-slate-400")} />
                    <span className={cn("text-xs font-black uppercase tracking-tight", deviceStatus?.isFiscalDayOpen ? "text-amber-700" : "text-slate-600")}>
                      {deviceStatus?.isFiscalDayOpen ? "Day Open" : "Day Closed"}
                    </span>
                  </div>
                </Card>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Key className="w-3 h-3 text-primary" /> Integration & API
              </CardTitle>
              
              <Card className="border-none shadow-sm rounded-2xl p-4 bg-indigo-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600/60 mb-1">API Key</p>
                    <p className="text-xs font-mono font-bold text-indigo-900">
                      {activeCompany?.apiKey ? (activeCompany.apiKey.substring(0, 12) + "...") : "No API Key Generated"}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                    onClick={() => generateApiKey()}
                    disabled={isGeneratingKey}
                  >
                    {isGeneratingKey ? "Generating..." : "Generate New Key"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
