
import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrencies } from "@/hooks/use-currencies";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { DollarSign, FileText, Users, TrendingUp, Calendar as CalendarIcon, Download, Loader2, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Link, useLocation, useRoute } from "wouter";

export default function ReportsPage() {
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;
    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
    const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = currentCompany?.id || 0;

    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const { data: currencies } = useCurrencies(companyId);
    const [consolidatedCode, setConsolidatedCode] = useState<string>("ZiG");

    const consolidatedCurrency = currencies?.find(c => c.code === consolidatedCode) || currencies?.find(c => c.code === 'USD');
    const consolidatedRate = Number(consolidatedCurrency?.exchangeRate || 1);
    const consolidatedSymbol = consolidatedCurrency?.symbol || (consolidatedCode === 'USD' ? '$' : consolidatedCode);

    // 1. Overview Stats (Existing)
    const { data: summary, isLoading: isLoadingSummary } = useQuery({
        queryKey: ["stats", "summary", companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await apiFetch(`/api/companies/${companyId}/stats/summary`);
            if (!res.ok) throw new Error("Failed to fetch stats");
            return await res.json();
        },
        enabled: !!companyId
    });

    const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
        queryKey: ["stats", "revenue", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/stats/revenue-over-time?days=30`);
            if (!res.ok) throw new Error("Failed to fetch revenue data");
            return await res.json();
        },
        enabled: !!companyId
    });

    // 2. Sales Report Query
    const { data: salesReport, isLoading: isLoadingSales } = useQuery({
        queryKey: ["reports", "sales", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const start = format(dateRange.from, 'yyyy-MM-dd');
            const end = format(dateRange.to, 'yyyy-MM-dd');
            const res = await apiFetch(`/api/companies/${companyId}/reports/sales?startDate=${start}&endDate=${end}`);
            if (!res.ok) throw new Error("Failed to fetch sales report");
            return await res.json();
        },
        enabled: !!companyId
    });

    // 3. Payments Report Query
    const { data: paymentsReport, isLoading: isLoadingPayments } = useQuery({
        queryKey: ["reports", "payments", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const start = format(dateRange.from, 'yyyy-MM-dd');
            const end = format(dateRange.to, 'yyyy-MM-dd');
            const res = await apiFetch(`/api/companies/${companyId}/reports/payments?startDate=${start}&endDate=${end}`);
            if (!res.ok) throw new Error("Failed to fetch payments report");
            return await res.json();
        },
        enabled: !!companyId
    });

    if (isLoadingCompanies) return <Layout><div className="p-8">Loading...</div></Layout>;
    if (!currentCompany) return <Layout><div className="p-8">No company selected.</div></Layout>;

    const [location, setLocation] = useLocation();
    const [params] = useRoute("/reports"); // Though useLocation is enough for query params usually

    // Simple query param extraction since wouter doesn't have a built-in one for this specific hook usage style easily accessible in all versions
    const getQueryParam = (param: string) => {
        const search = window.location.search;
        const urlParams = new URLSearchParams(search);
        return urlParams.get(param);
    };

    // Manage active tab state locally for better reactivity
    const [activeTab, setActiveTab] = useState(getQueryParam("tab") || "overview");

    // Sync tab with URL if changed from outside (sidebar)
    useEffect(() => {
        const tab = getQueryParam("tab") || "overview";
        if (tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [location]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === "overview") setLocation("/reports");
        else setLocation(`/reports?tab=${value}`);
    };

    // ... (rest of the component)

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-slate-500 mt-1">Comprehensive insights into your business performance</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="sales">Sales (Invoices)</TabsTrigger>
                        <TabsTrigger value="payments">Payments Received</TabsTrigger>
                        <TabsTrigger value="statements">Customer Statements</TabsTrigger>
                    </TabsList>

                    {/* Global Controls */}
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 font-medium">Consolidate in:</span>
                            <Select value={consolidatedCode} onValueChange={setConsolidatedCode}>
                                <SelectTrigger className="w-[100px] h-9">
                                    <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    {currencies?.filter(c => c.code !== 'USD').map(c => (
                                        <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
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
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                            title="Total Revenue"
                            value={Number(summary?.totalRevenue || 0) * consolidatedRate}
                            isLoading={isLoadingSummary}
                            symbol={consolidatedSymbol}
                            icon={DollarSign}
                            color="text-emerald-600"
                            bg="bg-emerald-100"
                        />
                        <StatsCard
                            title="Pending Payments"
                            value={Number(summary?.pendingAmount || 0) * consolidatedRate}
                            isLoading={isLoadingSummary}
                            symbol={consolidatedSymbol}
                            icon={TrendingUp}
                            color="text-amber-600"
                            bg="bg-amber-100"
                        />
                        <StatsCard
                            title="Total Invoices"
                            value={summary?.invoicesCount}
                            isLoading={isLoadingSummary}
                            prefix=""
                            icon={FileText}
                            color="text-blue-600"
                            bg="bg-blue-100"
                        />
                        <StatsCard
                            title="Total Customers"
                            value={summary?.customersCount}
                            isLoading={isLoadingSummary}
                            prefix=""
                            icon={Users}
                            color="text-violet-600"
                            bg="bg-violet-100"
                        />
                    </div>

                    <Card className="card-depth border-none">
                        <CardHeader>
                            <CardTitle>Revenue Overview (Last 30 Days)</CardTitle>
                            <CardDescription>Daily revenue performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                {isLoadingRevenue ? (
                                    <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>
                                ) : revenueData?.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400">No revenue data yet.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                stroke="#888888"
                                                tick={{ fill: '#888888', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#888888"
                                                tick={{ fill: '#888888', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `${consolidatedSymbol}${value}`}
                                            />
                                            <Tooltip
                                                formatter={(value: any) => [`${consolidatedSymbol}${Number(Number(value) * consolidatedRate).toFixed(2)}`, "Revenue"]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SALES TAB */}
                <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Report</CardTitle>
                            <CardDescription>Invoices issued between {format(dateRange.from, 'MMM d')} and {format(dateRange.to, 'MMM d')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Local Total</TableHead>
                                        <TableHead className="text-right">Consolidated ({consolidatedCode})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingSales ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8">Loading sales data...</TableCell></TableRow>
                                    ) : salesReport?.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sales found in this period.</TableCell></TableRow>
                                    ) : (
                                        salesReport?.map((inv: any) => (
                                            <TableRow key={inv.id}>
                                                <TableCell>{format(new Date(inv.issueDate || inv.createdAt), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                                <TableCell>{inv.customerName || "Unknown"}</TableCell>
                                                <TableCell>
                                                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize",
                                                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            inv.status === 'draft' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                                                    )}>
                                                        {inv.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {currencies?.find(c => c.code === (inv.currency || "USD"))?.symbol || (inv.currency === "USD" ? "$" : inv.currency)} {Number(inv.total).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {consolidatedSymbol}{Number((Number(inv.total) / Number(inv.exchangeRate || 1)) * consolidatedRate).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PAYMENTS TAB */}
                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payments Report</CardTitle>
                            <CardDescription>Payments received between {format(dateRange.from, 'MMM d')} and {format(dateRange.to, 'MMM d')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Local Amount</TableHead>
                                        <TableHead className="text-right">Consolidated ({consolidatedCode})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingPayments ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8">Loading payments data...</TableCell></TableRow>
                                    ) : paymentsReport?.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No payments found in this period.</TableCell></TableRow>
                                    ) : (
                                        paymentsReport?.map((pay: any) => (
                                            <TableRow key={pay.id}>
                                                <TableCell>{format(new Date(pay.paymentDate), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="font-medium">{pay.reference || "-"}</TableCell>
                                                <TableCell className="capitalize">{pay.method}</TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">
                                                    {currencies?.find(c => c.code === (pay.currency || "USD"))?.symbol || (pay.currency === "USD" ? "$" : pay.currency)} {Number(pay.amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-700">
                                                    {consolidatedSymbol}{Number((Number(pay.amount) / Number(pay.exchangeRate || 1)) * consolidatedRate).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STATEMENTS TAB */}
                <TabsContent value="statements">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Statements</CardTitle>
                            <CardDescription>Statements are generated per customer. Select a customer below to view their statement.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="w-12 h-12 text-slate-200 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-2">View Individual Statements</h3>
                                <p className="text-slate-500 max-w-md mb-6">
                                    To generate a detailed Statement of Account (PDF), please navigate to the Customers page, select a customer, and click on the "Statement of Account" tab.
                                </p>
                                <Link href="/customers">
                                    <Button>
                                        Go to Customers <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </Layout>
    );
}

function StatsCard({ title, value, isLoading, symbol = "$", icon: Icon, color, bg }: any) {
    return (
        <Card className="card-depth border-none">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                        {isLoading ? (
                            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
                        ) : (
                            <h3 className="text-2xl font-bold font-display text-slate-900">
                                {symbol}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        )}
                    </div>
                    {Icon && (
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
