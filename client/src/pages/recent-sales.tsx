
import { Layout } from "@/components/layout";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveCompany } from "@/hooks/use-active-company";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
    Search,
    History,
    Download,
    Filter,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
    ArrowLeft,
    TrendingUp,
    DownloadCloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function RecentSalesPage() {
    const { activeCompany } = useActiveCompany();
    const { user } = useAuth();
    const companyId = activeCompany?.id;
    const activeRole = (activeCompany as any)?.role;
    const isCashier = activeRole === 'cashier' && !user?.isSuperAdmin;

    // Default to Feb 1 - Feb 28 as requested for this specific "Recent Sales" view context
    // But allow full flexibility
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date()
    });

    const [statusFilter, setStatusFilter] = useState("all");
    const [cashierFilter, setCashierFilter] = useState(isCashier ? user?.id : "all");
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Cashiers
    const { data: users } = useQuery({
        queryKey: ["company-users", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/users`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!companyId && !isCashier // No need to fetch all users if cashier is restricted
    });

    // Fetch All POS Sales with filters
    const { data: sales, isLoading } = useQuery({
        queryKey: ["pos-all-sales", companyId, dateRange.from, dateRange.to, statusFilter, cashierFilter, searchTerm],
        queryFn: async () => {
            const params = new URLSearchParams({
                companyId: companyId!.toString(),
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd'),
                status: statusFilter,
                cashierId: cashierFilter || "all",
                search: searchTerm
            });
            const res = await apiFetch(`/api/pos/all-sales?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch sales");
            return res.json();
        },
        enabled: !!companyId
    });

    const totalRevenue = sales?.reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;
    const totalTxns = sales?.length || 0;
    const fiscalizedCount = sales?.filter((s: any) => s.syncedWithFdms).length || 0;

    const handleExportCsv = () => {
        if (!sales || sales.length === 0) return;

        const headers = ["Date", "Invoice #", "Customer", "Cashier", "Method", "Amount", "Fiscal Status"];
        const rows = sales.map((s: any) => [
            format(new Date(s.issueDate), "yyyy-MM-dd HH:mm"),
            s.invoiceNumber,
            s.customerName || "Walk-in",
            s.cashierName || "System",
            s.paymentMethod,
            s.total,
            s.syncedWithFdms ? "Fiscalized" : "Pending"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sales-report-${format(dateRange.from, 'MMM-dd')}-to-${format(dateRange.to, 'MMM-dd')}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Layout>
            <div className="container mx-auto py-8 px-4 max-w-[1400px]">
                {/* Premium Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/reports/pos">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:bg-slate-50">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recent Sales Ledger</h1>
                            <p className="text-slate-400 font-medium mt-1 uppercase tracking-widest text-[10px]">
                                {isCashier ? "Your transaction records & personal performance" : "Detailed transaction records & compliance audit"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleExportCsv}
                            disabled={!sales || sales.length === 0}
                            className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl font-black shadow-lg shadow-slate-200 flex items-center gap-2"
                        >
                            <DownloadCloud className="w-5 h-5" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-none shadow-sm bg-indigo-600 text-white rounded-[2rem]">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
                                    <h3 className="text-3xl font-black">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                                <TrendingUp className="w-8 h-8 text-indigo-300 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Transactions</p>
                                    <h3 className="text-3xl font-black text-slate-900">{totalTxns}</h3>
                                </div>
                                <History className="w-8 h-8 text-slate-200" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-emerald-500 text-white rounded-[2rem]">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Fiscalized</p>
                                    <h3 className="text-3xl font-black">{fiscalizedCount}</h3>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-emerald-200 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-amber-500 text-white rounded-[2rem]">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1">Pending Sync</p>
                                    <h3 className="text-3xl font-black">{totalTxns - fiscalizedCount}</h3>
                                </div>
                                <Clock className="w-8 h-8 text-amber-200 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Row */}
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden mb-8">
                    <CardContent className="p-6 flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search invoice # or customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-12 bg-slate-50/50 border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {/* Date Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-white flex items-center gap-3 font-bold text-slate-600">
                                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                                        {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range: any) => {
                                            if (range?.from && range?.to) {
                                                setDateRange({ from: range.from, to: range.to });
                                            }
                                        }}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[160px] h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 p-1">
                                    <SelectItem value="all" className="rounded-xl">All Statuses</SelectItem>
                                    <SelectItem value="fiscalized" className="rounded-xl">Fiscalized</SelectItem>
                                    <SelectItem value="pending" className="rounded-xl">Pending Sync</SelectItem>
                                    <SelectItem value="cancelled" className="rounded-xl">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Cashier Filter - Only visible for admin/owner */}
                            {!isCashier && (
                                <Select value={cashierFilter} onValueChange={setCashierFilter}>
                                    <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-slate-600">
                                        <SelectValue placeholder="Cashier" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 p-1">
                                        <SelectItem value="all" className="rounded-xl">All Cashiers</SelectItem>
                                        {users?.map((u: any) => (
                                            <SelectItem key={u.id} value={u.id} className="rounded-xl">{u.username}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button
                                variant="ghost"
                                className="h-12 px-6 rounded-2xl text-slate-400 hover:text-slate-600 font-bold"
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("all");
                                    if (!isCashier) setCashierFilter("all");
                                    setDateRange({ from: startOfMonth(new Date()), to: new Date() });
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Table */}
                <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[160px] h-14 font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Date / Time</TableHead>
                                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-400">Invoice Number</TableHead>
                                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-400">Customer Name</TableHead>
                                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-400">Handled By</TableHead>
                                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-400">Compliance Status</TableHead>
                                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Final Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-96 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                                            <p className="font-bold text-slate-400 animate-pulse uppercase tracking-widest text-[10px]">Synchronizing Ledger...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sales?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-96 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-200">
                                            <History className="w-16 h-16" />
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-sm">No records found for selection</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales?.map((s: any) => (
                                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700">
                                                    {format(new Date(s.issueDate), "MMM dd, yyyy")}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {format(new Date(s.issueDate), "HH:mm")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                                    <History className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                                </div>
                                                <span className="font-mono text-xs font-black text-slate-600">
                                                    {s.invoiceNumber}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-bold text-slate-500">
                                                {s.customerName || "Walk-in Customer"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-500">
                                                    {s.cashierName?.[0]?.toUpperCase() || "S"}
                                                </div>
                                                <span className="text-[11px] font-black text-slate-600 tracking-tight">
                                                    {s.cashierName || "System"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {s.syncedWithFdms ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 w-fit">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Fiscalized
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 w-fit">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Pending Sync
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex flex-col items-end">
                                                <span className="text-base font-black text-slate-900 leading-none">
                                                    ${Number(s.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    {s.paymentMethod} • {s.currency}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </Layout>
    );
}

