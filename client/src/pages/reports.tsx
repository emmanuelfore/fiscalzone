
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
import { DollarSign, FileText, Users, TrendingUp, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
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
import { Link, useLocation } from "wouter";
import { useActiveCompany } from "@/hooks/use-active-company";

export default function ReportsPage() {
    const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
    const companyId = activeCompany?.id || 0;
    const currentCompany = activeCompany;

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
        enabled: !!companyId
    });

    const { data: salesReport, isLoading: isLoadingSales } = useQuery({
        queryKey: ["reports-sales", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/sales/${companyId}?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    return (
        <Layout>
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Sales Analytics</h1>
                    <p className="text-slate-500 mt-1">Comprehensive sales performance insights</p>
                </div>

                {/* Global Controls */}
                <div className="flex items-center gap-3">
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

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Revenue"
                        value={Number(summary?.totalRevenue || 0) * Number(consolidatedRate)}
                        isLoading={isLoadingSummary}
                        symbol={consolidatedSymbol}
                        icon={DollarSign}
                        color="text-emerald-600"
                        bg="bg-emerald-100"
                    />
                    <StatsCard
                        title="Pending Payments"
                        value={Number(summary?.pendingAmount || 0) * Number(consolidatedRate)}
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
                        symbol=""
                        decimals={0}
                        icon={FileText}
                        color="text-blue-600"
                        bg="bg-blue-100"
                    />
                    <StatsCard
                        title="Total Customers"
                        value={summary?.customersCount}
                        isLoading={isLoadingSummary}
                        symbol=""
                        decimals={0}
                        icon={Users}
                        color="text-violet-600"
                        bg="bg-violet-100"
                    />
                </div>

                {/* Revenue Trends */}
                <Card className="card-depth border-none">
                    <CardHeader>
                        <CardTitle>Revenue Trends</CardTitle>
                        <CardDescription>Daily revenue performance</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${consolidatedSymbol}${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${consolidatedSymbol}${Number(value).toFixed(2)}`, "Revenue"]}
                                />
                                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales by Category */}
                    <SalesByCategoryChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />

                    {/* Sales by Payment Method */}
                    <SalesByPaymentMethodChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />
                </div>

                {/* Sales by User */}
                <SalesByUserChart companyId={companyId} dateRange={dateRange} consolidatedSymbol={consolidatedSymbol} consolidatedRate={consolidatedRate} />

                {/* Sales Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
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
                                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading sales data...</TableCell></TableRow>
                                ) : salesReport?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sales found in this period.</TableCell></TableRow>
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
                                                {consolidatedSymbol}{Number((Number(inv.total) / Number(inv.exchangeRate || 1)) * Number(consolidatedRate)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

function StatsCard({ title, value, isLoading, symbol = "$", decimals = 2, icon: Icon, color, bg }: any) {
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
                                {symbol}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                            </h3>
                        )}
                    </div>
                    {Icon && (
                        <div className={cn("p-2 rounded-lg bg-slate-50", bg)}>
                            <Icon className={cn("w-5 h-5", color)} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
