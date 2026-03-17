
import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrencies } from "@/hooks/use-currencies";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { SalesByCategoryChart, SalesByUserChart, SalesByPaymentMethodChart } from "@/components/charts/sales-charts";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { DollarSign, FileText, Users, TrendingUp, Calendar as CalendarIcon, ArrowRight, BarChart3, Receipt, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/reports/stats-card"; // Assuming StatsCard is extracted or defined below

export default function ReportsPage() {
    const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
    const companyId = activeCompany?.id || 0;
    
    // Determine active tab from URL query param if present
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get("tab") || "analytics";
    const [activeTab, setActiveTab] = useState(initialTab);

    const { data: currencies } = useCurrencies(companyId);

    // State
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });
    const [consolidatedCode, setConsolidatedCode] = useState<string>("USD");

    const consolidatedCurrency = currencies?.find(c => c.code === consolidatedCode);
    const consolidatedRate = Number(consolidatedCurrency?.exchangeRate || 1);
    const consolidatedSymbol = consolidatedCurrency?.symbol || "$";

    // Sync state with URL but don't force navigation
    useEffect(() => {
        const handleSearchParamsChange = () => {
            const currentTab = new URLSearchParams(window.location.search).get("tab");
            if (currentTab && currentTab !== activeTab) {
                setActiveTab(currentTab);
            }
        };

        window.addEventListener('popstate', handleSearchParamsChange);
        return () => window.removeEventListener('popstate', handleSearchParamsChange);
    }, [activeTab]);

    // Queries
    const { data: summary, isLoading: isLoadingSummary } = useQuery({
        queryKey: ["reports-summary", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return null;
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/summary/${companyId}?${params.toString()}`);
            if (!res.ok) return null;
            return await res.json();
        },
        enabled: !!companyId
    });

    const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
        queryKey: ["reports-revenue-chart", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/charts/revenue/${companyId}?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId && activeTab === 'analytics'
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const newUrl = `${window.location.pathname}?tab=${value}`;
        window.history.replaceState({ ...window.history.state, url: newUrl }, '', newUrl);
    };

    return (
        <Layout>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 uppercase tracking-tight">Intelligence Hub</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Data-driven performance insights for {activeCompany?.name}</p>
                </div>

                {/* Global Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Base:</span>
                        <Select value={consolidatedCode} onValueChange={setConsolidatedCode}>
                            <SelectTrigger className="w-[90px] h-8 text-xs font-bold border-none bg-slate-100/50 rounded-xl focus:ring-0">
                                <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="USD" className="text-xs font-bold">USD</SelectItem>
                                {currencies?.filter(c => c.code !== 'USD').map(c => (
                                    <SelectItem key={c.id} value={c.code} className="text-xs font-bold">{c.code}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className={cn("h-8 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                {dateRange.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "MMM dd, yyyy")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from}
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range: any) => {
                                    if (range?.from) {
                                        setDateRange({ from: range.from, to: range.to || range.from });
                                    }
                                }}
                                numberOfMonths={2}
                                className="rounded-3xl"
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 h-auto self-start">
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest gap-2">
                        <BarChart3 className={cn("w-4 h-4", activeTab === 'analytics' ? "text-indigo-500" : "text-slate-400")} />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                            title="Total Revenue"
                            value={Number(summary?.totalRevenue || 0) * Number(consolidatedRate)}
                            isLoading={isLoadingSummary}
                            symbol={consolidatedSymbol}
                            icon={DollarSign}
                            color="text-indigo-600"
                            bg="bg-indigo-50"
                        />
                        <StatsCard
                            title="Pending Payments"
                            value={Number(summary?.pendingAmount || 0) * Number(consolidatedRate)}
                            isLoading={isLoadingSummary}
                            symbol={consolidatedSymbol}
                            icon={TrendingUp}
                            color="text-amber-600"
                            bg="bg-amber-50"
                        />
                        <StatsCard
                            title="Total Invoices"
                            value={summary?.invoicesCount}
                            isLoading={isLoadingSummary}
                            symbol=""
                            decimals={0}
                            icon={FileText}
                            color="text-blue-600"
                            bg="bg-blue-50"
                        />
                        <StatsCard
                            title="Total Customers"
                            value={summary?.customersCount}
                            isLoading={isLoadingSummary}
                            symbol=""
                            decimals={0}
                            icon={Users}
                            color="text-violet-600"
                            bg="bg-violet-50"
                        />
                    </div>

                    {/* Revenue Trends */}
                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Revenue Trends</CardTitle>
                            <CardDescription className="text-slate-400 font-medium font-sans">Daily revenue performance</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] p-8 pt-0">
                            {isLoadingRevenue ? (
                                <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tick={{ dy: 10 }} />
                                        <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={(value) => `${consolidatedSymbol}${value}`} tick={{ dx: -10 }} />
                                        <Popover>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                                                formatter={(value: any) => [`${consolidatedSymbol}${Number(value).toFixed(2)}`, "Revenue"]}
                                            />
                                        </Popover>
                                        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
                        <SalesByCategoryChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />
                        <SalesByPaymentMethodChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />
                        <div className="lg:col-span-2">
                            <SalesByUserChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Layout>
    );
}

