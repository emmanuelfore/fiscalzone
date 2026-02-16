
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Layout } from "@/components/layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    ShieldCheck,
    AlertCircle,
    FileText,
    History,
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    Clock
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaxReportsPage() {
    const { activeCompany } = useActiveCompany();
    const companyId = activeCompany?.id;
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date()
    });

    // Fetch Sales (for Tax Summary)
    const { data: sales, isLoading: isLoadingSales } = useQuery({
        queryKey: ["sales-report", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/companies/${companyId}/reports/sales?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch sales");
            return await res.json();
        },
        enabled: !!companyId
    });

    // Fetch ZIMRA Logs
    const { data: zimraLogs, isLoading: isLoadingLogs } = useQuery({
        queryKey: ["zimra-logs", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/zimra-logs?limit=10`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    // Calculations
    const vatStandard = sales?.reduce((acc: number, inv: any) => {
        // Simple logic: assume if taxRate > 0 and it's not some other special rate, it's standard.
        // In a real app, we'd check taxTypeId or zimraCode. 
        // For now, assume anything with 15% is standard.
        return acc + Number(inv.taxAmount);
    }, 0) || 0;

    const totalSales = sales?.reduce((acc: number, inv: any) => acc + Number(inv.total), 0) || 0;

    // Fiscal Status Distribution
    const fiscalStatusData = sales?.reduce((acc: any, inv: any) => {
        const status = inv.validationStatus || "pending";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {}) || {};

    const chartData = Object.entries(fiscalStatusData).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
    }));

    const COLORS: Record<string, string> = {
        'Valid': '#10b981',
        'Grey': '#94a3b8',
        'Red': '#ef4444',
        'Pending': '#f59e0b',
        'Invalid': '#ef4444'
    };

    const handleExportCsv = () => {
        if (!sales || sales.length === 0) return;
        const headers = ["Date", "Invoice #", "Subtotal", "Tax", "Total", "Fiscal Code", "Status"];
        const rows = sales.map((inv: any) => [
            format(new Date(inv.issueDate || inv.createdAt), "yyyy-MM-dd"),
            inv.invoiceNumber,
            inv.subtotal,
            inv.taxAmount,
            inv.total,
            inv.fiscalCode || "-",
            inv.validationStatus || "Pending"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: any[]) => row.map(cell => `"${cell || ''}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Tax_Report_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax & ZIMRA Reports</h1>
                            <p className="text-sm text-slate-500 font-medium">Compliance tracking and VAT analysis</p>
                        </div>
                    </div>
                    <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Data
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-emerald-50/50">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Output Tax</p>
                            <h3 className="text-2xl font-black text-emerald-900">${vatStandard.toFixed(2)}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-blue-50/50">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Fiscalized Invoices</p>
                            <h3 className="text-2xl font-black text-blue-900">
                                {sales?.filter((i: any) => i.validationStatus === 'valid').length || 0} / {sales?.length || 0}
                            </h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-rose-50/50">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Failed/Red Status</p>
                            <h3 className="text-2xl font-black text-rose-900">
                                {sales?.filter((i: any) => i.validationStatus === 'red' || i.validationStatus === 'invalid').length || 0}
                            </h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-slate-50/50">
                        <CardContent className="p-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reporting Period</p>
                            <h3 className="text-lg font-black text-slate-900">
                                {format(dateRange.from, "MMM yyyy")}
                            </h3>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Fiscalization Status Chart */}
                    <Card className="lg:col-span-1 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Fiscalization Health</CardTitle>
                            <CardDescription>Status distribution of issued receipts</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Fiscalization Issues Table */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Recent Fiscalization Issues</CardTitle>
                            <CardDescription>Invoices requiring attention</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales?.filter((i: any) => i.validationStatus !== 'valid' && i.validationStatus !== null).slice(0, 5).map((inv: any) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-bold">{inv.invoiceNumber}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{format(new Date(inv.issueDate || inv.createdAt), "dd MMM yyyy")}</TableCell>
                                            <TableCell>
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    inv.validationStatus === 'red' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {inv.validationStatus === 'red' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                    {inv.validationStatus}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                                                    Fix Issues
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sales?.filter((i: any) => i.validationStatus !== 'valid' && i.validationStatus !== null).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                                No compliance issues detected
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* ZIMRA Communication Logs */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">Recent ZIMRA Logs</CardTitle>
                            <CardDescription>Live communication with ZIMRA servers</CardDescription>
                        </div>
                        <History className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Time</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Endpoint</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Status</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Message</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLogs ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                                ) : zimraLogs?.map((log: any) => (
                                    <TableRow key={log.id} className="hover:bg-slate-50">
                                        <TableCell className="whitespace-nowrap text-xs text-slate-500 font-mono">
                                            {format(new Date(log.createdAt), "HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-bold text-slate-700">{log.endpoint}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                                log.statusCode === 200 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                            )}>
                                                {log.statusCode}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-md truncate text-xs text-slate-600">
                                            {log.errorMessage || "Success"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
