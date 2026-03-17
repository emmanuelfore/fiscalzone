
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveCompany } from "@/hooks/use-active-company";
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from "date-fns";
import { Layout } from "@/components/layout";
import { Calendar as CalendarIcon, Download, Loader2, ArrowLeft, Search, BarChart3, ListOrdered, History, TrendingUp, Users, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

export default function PosReportsPage() {
    const { activeCompany } = useActiveCompany();
    const companyId = activeCompany?.id;

    // State
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfDay(subDays(new Date(), 30)),
        to: endOfDay(new Date())
    });
    const [selectedCashier, setSelectedCashier] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Reconciliation State
    const [reconciliationShift, setReconciliationShift] = useState<any>(null);
    const [actualCashValue, setActualCashValue] = useState<string>("");
    const [reconNotes, setReconNotes] = useState<string>("");

    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Reconciliation Mutation
    const reconcileMutation = useMutation({
        mutationFn: async (data: { shiftId: number, actualCash: number, notes: string }) => {
            const res = await apiFetch(`/api/pos/shifts/${data.shiftId}/reconcile`, {
                method: "POST",
                body: JSON.stringify({
                    actualCash: data.actualCash,
                    notes: data.notes
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to reconcile shift");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pos-shifts"] });
            toast({
                title: "Shift Reconciled",
                description: "Cash reconciliation has been recorded successfully.",
            });
            setReconciliationShift(null);
            setActualCashValue("");
            setReconNotes("");
        },
        onError: (error: any) => {
            toast({
                title: "Reconciliation Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Fetch Users (Cashiers)
    const { data: users } = useQuery({
        queryKey: ["company-users", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/users`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    // Fetch Sales Data
    const { data: sales, isLoading } = useQuery({
        queryKey: ["pos-sales-report", companyId, dateRange.from, dateRange.to, selectedCashier],
        queryFn: async () => {
            if (!companyId) return [];
            const params = new URLSearchParams({
                companyId: companyId.toString(),
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });

            if (selectedCashier && selectedCashier !== "all") {
                params.append("cashierId", selectedCashier);
            }

            const res = await apiFetch(`/api/pos/reports/sales?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch sales");
            return await res.json();
        },
        enabled: !!companyId
    });

    // Fetch Top Selling Products (POS Only)
    const { data: topProducts, isLoading: isLoadingProducts } = useQuery({
        queryKey: ["pos-top-products", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd'),
                isPos: "true"
            });
            const res = await apiFetch(`/api/companies/${companyId}/reports/product-performance?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    // Fetch POS Shifts
    const { data: shifts, isLoading: isLoadingShifts } = useQuery({
        queryKey: ["pos-shifts", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            if (!companyId) return [];
            const params = new URLSearchParams({
                companyId: companyId.toString(),
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/pos/reports/shifts?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    // Filter by search term locally
    const filteredSales = sales?.filter((sale: any) =>
        sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalTxns = filteredSales?.length || 0;
    const totalRevenue = filteredSales?.reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;
    const fiscalizedTxns = sales?.filter((s: any) => s.syncedWithFdms).length || 0;
    const fiscalizationRate = totalTxns > 0 ? (fiscalizedTxns / totalTxns) * 100 : 0;

    // Local Aggregations for Charts
    const revenueTrends = useMemo(() => {
        if (!sales || !Array.isArray(sales)) return [];

        const daily: Record<string, { date: Date, total: number }> = {};

        sales.forEach((s: any) => {
            const rawDate = new Date(s.issueDate || s.createdAt);
            if (isNaN(rawDate.getTime())) return;

            const dateStr = format(rawDate, 'MMM dd');
            if (!daily[dateStr]) {
                daily[dateStr] = { date: startOfDay(rawDate), total: 0 };
            }
            daily[dateStr].total += Number(s.total || 0);
        });

        return Object.entries(daily)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({ name, total }) => ({ name, total }));
    }, [sales]);

    const salesByCashier = useMemo(() => {
        if (!sales) return [];
        const users: Record<string, { total: number; count: number }> = {};
        sales.forEach((s: any) => {
            const name = s.cashierName || "Unknown Cashier";
            if (!users[name]) users[name] = { total: 0, count: 0 };
            users[name].total += Number(s.total);
            users[name].count += 1;
        });
        return Object.entries(users)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, stats]) => ({ name, ...stats }));
    }, [sales]);

    const paymentMethods = useMemo(() => {
        if (!sales) return {};
        const methods: Record<string, { total: number, count: number }> = {};
        sales.forEach((s: any) => {
            const method = s.paymentMethod || "CASH";
            if (!methods[method]) methods[method] = { total: 0, count: 0 };
            methods[method].total += Number(s.total);
            methods[method].count += 1;
        });
        return methods;
    }, [sales]);

    const dailySalesGroups = useMemo(() => {
        if (!sales) return [];
        const groups: Record<string, { date: Date, total: number, count: number, currencyTotals: Record<string, number> }> = {};
        sales.forEach((sale: any) => {
            const d = new Date(sale.issueDate || sale.createdAt);
            const dateKey = format(d, 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = { date: startOfDay(d), total: 0, count: 0, currencyTotals: {} };
            }
            groups[dateKey].total += Number(sale.total || 0);
            groups[dateKey].count += 1;
            
            const cur = sale.currency || "USD";
            groups[dateKey].currencyTotals[cur] = (groups[dateKey].currencyTotals[cur] || 0) + Number(sale.total || 0);
        });
        return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [sales]);

    const handleExportCsv = () => {
        if (!filteredSales || filteredSales.length === 0) return;

        const headers = ["Date", "Invoice #", "Customer", "Cashier", "Payment Method", "Currency", "Total", "Status"];
        const rows = filteredSales.map((sale: any) => [
            format(new Date(sale.issueDate || sale.createdAt), "yyyy-MM-dd HH:mm"),
            sale.invoiceNumber,
            sale.customerName || "Walk-in",
            sale.cashierName || "-",
            sale.paymentMethod || "CASH",
            sale.currency,
            sale.total,
            sale.status
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: any[]) => row.map((cell: any) => `"${cell || ''}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `POS_Sales_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportDailyCsv = () => {
        if (dailySalesGroups.length === 0) return;

        const headers = ["Date", "Total Sales", "Transaction Count", "Currencies Breakdown"];
        const rows = dailySalesGroups.map((group) => [
            format(group.date, "yyyy-MM-dd"),
            group.total.toFixed(2),
            group.count,
            Object.entries(group.currencyTotals).map(([cur, amt]) => `${cur}: ${amt.toFixed(2)}`).join(" | ")
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: any[]) => row.map((cell: any) => `"${cell || ''}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Daily_Summary_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">POS Sales Report</h1>
                            <p className="text-sm text-slate-500 font-medium">Detailed transaction history and analytics</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card className="p-4 border-none shadow-sm sticky top-0 z-10 bg-white/80 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("justify-start text-left font-normal w-[240px]", !dateRange && "text-muted-foreground")}>
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
                                <PopoverContent className="w-auto p-0" align="start">
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

                            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Cashiers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cashiers</SelectItem>
                                    {users?.map((u: any) => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search invoice or customer..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" onClick={handleExportCsv}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-500 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1">Total Revenue</p>
                                    <h3 className="text-3xl font-black">${totalRevenue.toFixed(2)}</h3>
                                </div>
                                <TrendingUp className="w-8 h-8 text-emerald-200/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1">Total Transactions</p>
                                    <h3 className="text-3xl font-black">{totalTxns}</h3>
                                </div>
                                <ListOrdered className="w-8 h-8 text-blue-200/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-600 text-white border-none shadow-md">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1">Fiscalization Rate</p>
                                    <h3 className="text-3xl font-black">{fiscalizationRate.toFixed(1)}%</h3>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-emerald-200/50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Analytics Overview
                        </TabsTrigger>
                        <TabsTrigger value="daily" className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" /> Daily Sales
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="w-4 h-4" /> Transaction History
                        </TabsTrigger>
                        <TabsTrigger value="shifts" className="flex items-center gap-2">
                            <Users className="w-4 h-4" /> Shift Reconciliation
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Revenue Trends */}
                            <Card className="lg:col-span-2 border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                                        Revenue Trends
                                    </CardTitle>
                                    <CardDescription>Daily revenue performance for the selected period</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[350px]">
                                    {isLoading ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                            <p className="text-sm text-slate-400 animate-pulse">Analyzing revenue data...</p>
                                        </div>
                                    ) : revenueTrends.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueTrends}>
                                                <defs>
                                                    <linearGradient id="colorRevenuePos" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue"]}
                                                />
                                                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenuePos)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <TrendingUp className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">No revenue data for the last 30 days</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Payment Types Analysis */}
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Payment Methods</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {Object.entries(paymentMethods).map(([method, stats]: [string, any]) => (
                                            <div key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{method}</span>
                                                    <span className="text-xs text-slate-500">{stats.count} txns</span>
                                                </div>
                                                <span className="font-mono font-bold text-slate-900">${stats.total.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {Object.keys(paymentMethods).length === 0 && (
                                            <div className="text-center py-8 text-slate-400">No payment data</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Selling Products */}
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Top Selling Products</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Qty Sold</TableHead>
                                                <TableHead className="text-right">Revenue</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoadingProducts ? (
                                                <TableRow><TableCell colSpan={3} className="text-center py-8">Loading products...</TableCell></TableRow>
                                            ) : topProducts?.slice(0, 5).map((p: any) => (
                                                <TableRow key={p.productId}>
                                                    <TableCell className="font-medium">{p.productName}</TableCell>
                                                    <TableCell className="text-right">{p.quantity}</TableCell>
                                                    <TableCell className="text-right">${p.revenue.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {!isLoadingProducts && topProducts?.length === 0 && (
                                                <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400">No product data</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Sales by User */}
                            <Card className="border-none shadow-sm lg:col-span-1">
                                <CardHeader>
                                    <CardTitle>Sales by Cashier</CardTitle>
                                    <CardDescription>Performance comparison across team members</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div className="h-[200px] w-full">
                                            {salesByCashier.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={salesByCashier} layout="vertical" margin={{ left: 0, right: 30 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis
                                                            dataKey="name"
                                                            type="category"
                                                            fontSize={11}
                                                            width={80}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: '#f8fafc' }}
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                                                        />
                                                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                                            {salesByCashier.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data to visualize</div>
                                            )}
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cashier</TableHead>
                                                    <TableHead className="text-right">Txns</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {salesByCashier.map((u: any) => (
                                                    <TableRow key={u.name}>
                                                        <TableCell className="font-medium text-xs truncate max-w-[100px]">{u.name}</TableCell>
                                                        <TableCell className="text-right text-xs">{u.count}</TableCell>
                                                        <TableCell className="text-right text-xs font-bold">${u.total.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {salesByCashier.length === 0 && (
                                                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400 text-xs">No user data</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="daily" className="space-y-6">
                        <Card className="border-none shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Daily Sales Summary</h3>
                                    <p className="text-sm text-slate-500 font-medium">Aggregated sales performance by date</p>
                                </div>
                                <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold flex items-center gap-2" onClick={handleExportDailyCsv}>
                                    <Download className="w-3.5 h-3.5" />
                                    Export Daily Summary
                                </Button>
                            </div>
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-500">Date</TableHead>
                                        <TableHead className="font-bold text-slate-500 text-center">Transactions</TableHead>
                                        <TableHead className="font-bold text-slate-500">Currency Breakdown</TableHead>
                                        <TableHead className="text-right font-bold text-slate-500">Total (Base)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                                    ) : dailySalesGroups.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">No data available</TableCell></TableRow>
                                    ) : dailySalesGroups.map((group) => (
                                        <TableRow key={group.date.toISOString()} className="hover:bg-slate-50/50">
                                            <TableCell className="font-bold text-slate-700">{format(group.date, "EEEE, dd MMM yyyy")}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-bold">{group.count}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(group.currencyTotals).map(([cur, amt]) => (
                                                        <Badge key={cur} variant="outline" className="border-slate-200">
                                                            {cur}: ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-slate-900">
                                                ${group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        <div className="flex flex-col gap-6">
                            <Card className="border-none shadow-sm overflow-hidden">
                                <Tabs defaultValue="all-tx" className="w-full">
                                    <div className="px-6 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-xl">Transaction History</CardTitle>
                                            <CardDescription>Detailed list of all POS sales and fiscal status</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                                                <TabsTrigger value="all-tx" className="rounded-lg text-xs font-bold">All</TabsTrigger>
                                                <TabsTrigger value="fiscalized" className="rounded-lg text-xs font-bold px-3">Fiscalized</TabsTrigger>
                                                <TabsTrigger value="pending" className="rounded-lg text-xs font-bold px-3">Pending</TabsTrigger>
                                            </TabsList>
                                            <Link href="/pos/all-sales">
                                                <Button size="sm" variant="outline" className="h-9 rounded-xl border-slate-200 font-bold flex items-center gap-2">
                                                    <History className="w-3.5 h-3.5 text-slate-400" />
                                                    View Full Ledger
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {["all-tx", "fiscalized", "pending"].map((tabValue) => (
                                            <TabsContent key={tabValue} value={tabValue} className="mt-0">
                                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50/50">
                                                            <TableRow className="hover:bg-transparent border-slate-100">
                                                                <TableHead className="w-[150px] font-bold text-slate-500">Date/Time</TableHead>
                                                                <TableHead className="font-bold text-slate-500">Invoice #</TableHead>
                                                                <TableHead className="font-bold text-slate-500">Receipt #</TableHead>
                                                                <TableHead className="font-bold text-slate-500">Cashier</TableHead>
                                                                <TableHead className="font-bold text-slate-500">Customer</TableHead>
                                                                <TableHead className="font-bold text-slate-500">Fiscal Status</TableHead>
                                                                <TableHead className="text-right font-bold text-slate-500">Amount</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {isLoading ? (
                                                                <TableRow><TableCell colSpan={6} className="text-center py-20">
                                                                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                                                                    <p className="text-slate-400">Fetching records...</p>
                                                                </TableCell></TableRow>
                                                            ) : (
                                                                (filteredSales?.filter((s: any) => {
                                                                    if (tabValue === "fiscalized") return s.syncedWithFdms;
                                                                    if (tabValue === "pending") return !s.syncedWithFdms;
                                                                    return true;
                                                                }) || []).length === 0 ? (
                                                                    <TableRow><TableCell colSpan={6} className="text-center py-20">
                                                                        <div className="flex flex-col items-center gap-2 text-slate-300">
                                                                            <History className="w-12 h-12 opacity-20" />
                                                                            <p className="font-medium">No transactions found</p>
                                                                        </div>
                                                                    </TableCell></TableRow>
                                                                ) : (
                                                                    filteredSales?.filter((s: any) => {
                                                                        if (tabValue === "fiscalized") return s.syncedWithFdms;
                                                                        if (tabValue === "pending") return !s.syncedWithFdms;
                                                                        return true;
                                                                    }).map((sale: any) => (
                                                                        <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                                                            <TableCell>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-bold text-slate-700">
                                                                                        {format(new Date(sale.issueDate || sale.createdAt), "MMM dd")}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                                        {format(new Date(sale.issueDate || sale.createdAt), "HH:mm")}
                                                                                    </span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <code className="text-[11px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                                    {sale.invoiceNumber}
                                                                                </code>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="text-[10px] font-bold text-slate-500">
                                                                                    {sale.receiptCounter ? `${sale.receiptCounter}/${sale.receiptGlobalNo}` : "-"}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                                                        {sale.cashierName?.[0]?.toUpperCase() || "S"}
                                                                                    </div>
                                                                                    <span className="text-xs font-semibold text-slate-600">{sale.cashierName || "System"}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="text-xs font-medium text-slate-500">{sale.customerName || "Walk-in Guest"}</span>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {sale.syncedWithFdms ? (
                                                                                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 flex items-center gap-1.5 w-fit font-bold rounded-lg shadow-sm">
                                                                                        <CheckCircle2 className="w-3 h-3" /> Fiscalized
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50/30 flex items-center gap-1.5 w-fit font-bold rounded-lg py-0.5">
                                                                                        <Clock className="w-3 h-3" /> Pending
                                                                                    </Badge>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-sm font-black text-slate-900">
                                                                                        ${Number(sale.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                    </span>
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                                                        {sale.paymentMethod}
                                                                                    </span>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>
                                        ))}
                                    </div>
                                </Tabs>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="shifts" className="space-y-6">
                        {/* Shift Reports */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle>POS Shift Cash Reconciliation</CardTitle>
                                <CardDescription>Cash-only tracking and variance reconciliation</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cashier</TableHead>
                                            <TableHead>Shift Time</TableHead>
                                            <TableHead className="text-right">Opening</TableHead>
                                            <TableHead className="text-right">Cash Sales</TableHead>
                                            <TableHead className="text-right">Drops/Outs</TableHead>
                                            <TableHead className="text-right">Expected</TableHead>
                                            <TableHead className="text-right">Actual</TableHead>
                                            <TableHead className="text-right">Variance</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingShifts ? (
                                            <TableRow><TableCell colSpan={9} className="text-center py-8">Loading shifts...</TableCell></TableRow>
                                        ) : shifts?.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400">No shifts found</TableCell></TableRow>
                                        ) : (
                                            shifts?.map((shift: any) => {
                                                const getVarianceColor = (percentage: number | null) => {
                                                    if (percentage === null || percentage === 0) return "text-emerald-600";
                                                    if (percentage > 5) return "text-red-600";
                                                    if (percentage > 2) return "text-orange-600";
                                                    if (percentage > 0.5) return "text-yellow-600";
                                                    return "text-emerald-600";
                                                };

                                                const getStatusBadge = (status: string | null) => {
                                                    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
                                                        'reconciled': { label: 'Reconciled', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                                        'minor_discrepancy': { label: 'Minor Gap', icon: AlertCircle, className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                                                        'major_discrepancy': { label: 'Major Gap', icon: AlertCircle, className: 'bg-orange-50 text-orange-700 border-orange-200' },
                                                        'critical_discrepancy': { label: 'Critical Gap', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
                                                        'pending': { label: 'Pending', icon: Clock, className: 'bg-blue-50 text-blue-700 border-blue-200' }
                                                    };

                                                    const config = statusConfig[status || 'pending'] || statusConfig['pending'];
                                                    return (
                                                        <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
                                                            <config.icon className="w-3 h-3" /> {config.label}
                                                        </Badge>
                                                    );
                                                };

                                                return (
                                                    <TableRow key={shift.id}>
                                                        <TableCell className="font-medium">{shift.cashierName}</TableCell>
                                                        <TableCell className="font-mono text-[11px]">
                                                            <div>{format(new Date(shift.startTime), "MMM dd, HH:mm")}</div>
                                                            {shift.endTime && (
                                                                <div className="text-slate-400">to {format(new Date(shift.endTime), "HH:mm")}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">${Number(shift.openingBalance).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs">${Number(shift.cashSales).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs text-red-600">-${(Number(shift.cashDrops) + Number(shift.cashPayouts)).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-bold text-xs">${Number(shift.expectedCash).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {shift.actualCash ? (
                                                                <span className="text-xs font-black">${Number(shift.actualCash).toFixed(2)}</span>
                                                            ) : shift.status === 'closed' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        setReconciliationShift(shift);
                                                                        setActualCashValue(shift.expectedCash.toFixed(2));
                                                                    }}
                                                                >
                                                                    Reconcile
                                                                </Button>
                                                            ) : (
                                                                <span className="text-[10px] text-blue-500 font-medium italic">Shift Open</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={cn("text-right font-bold text-xs", getVarianceColor(shift.variancePercentage))}>
                                                            {shift.cashVariance !== null ? (
                                                                <span>{shift.cashVariance > 0 ? "+" : ""}{shift.cashVariance.toFixed(2)}</span>
                                                            ) : "-"}
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(shift.reconciliationStatus)}</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog open={!!reconciliationShift} onOpenChange={(open) => !open && setReconciliationShift(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Reconcile Cash Drawer</DialogTitle>
                            <DialogDescription>
                                Compare actual cash counted against system expectations for <strong>{reconciliationShift?.cashierName}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 uppercase font-black">Expected Cash</span>
                                    <span className="text-2xl font-black text-slate-900">${Number(reconciliationShift?.expectedCash).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col border-l pl-4 border-slate-200">
                                    <span className="text-xs text-slate-500 uppercase font-black">Variance</span>
                                    {actualCashValue ? (
                                        <span className={cn("text-2xl font-black", (Number(actualCashValue) - Number(reconciliationShift?.expectedCash)) < 0 ? "text-red-600" : "text-emerald-600")}>
                                            ${(Number(actualCashValue) - Number(reconciliationShift?.expectedCash)).toFixed(2)}
                                        </span>
                                    ) : <span className="text-2xl font-black text-slate-300">$0.00</span>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="actualCash">Actual Cash Counted</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                    <Input
                                        id="actualCash"
                                        type="number"
                                        step="0.01"
                                        className="pl-7 text-lg font-bold"
                                        placeholder="0.00"
                                        value={actualCashValue}
                                        onChange={(e) => setActualCashValue(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Reconciliation Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Explain any discrepancies here..."
                                    value={reconNotes}
                                    onChange={(e) => setReconNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setReconciliationShift(null)}>Cancel</Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={!actualCashValue || reconcileMutation.isPending}
                                onClick={() => {
                                    reconcileMutation.mutate({
                                        shiftId: reconciliationShift.id,
                                        actualCash: parseFloat(actualCashValue),
                                        notes: reconNotes
                                    });
                                }}
                            >
                                {reconcileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Reconciliation"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
