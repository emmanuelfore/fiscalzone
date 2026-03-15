
import { useState } from "react";
import { useStockValuation } from "@/hooks/use-reports";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Package,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Search,
    ArrowLeft,
    Download,
    BarChart3
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

export default function InventoryReportsPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const [searchTerm, setSearchTerm] = useState("");
    const { data: products, isLoading } = useStockValuation(companyId);

    // Calculations
    const lowStockItems = products?.filter((p: any) => Number(p.stockLevel) <= 5) || [];
    const outOfStockItems = products?.filter((p: any) => Number(p.stockLevel) <= 0) || [];

    const totalCostValue = products?.reduce((acc: number, p: any) => acc + p.totalValuation, 0) || 0;

    // Valuation by Product for Chart (top 5)
    const chartData = products?.slice(0, 5).map(p => ({
        name: p.name,
        value: p.totalValuation
    })) || [];

    const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Filtered search
    const filteredProducts = products?.filter((p: any) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportCsv = () => {
        if (!products || products.length === 0) return;

        const headers = ["Name", "SKU", "Stock Level", "Unit Cost", "Total Value"];
        const rows = products.map((p: any) => [
            p.name,
            p.sku || "-",
            p.stockLevel,
            p.unitCost,
            p.totalValuation.toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: any[]) => row.map(cell => `"${cell || ''}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Inventory_Valuation_${format(new Date(), "yyyyMMdd")}.csv`);
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
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display text-[2.5rem] mt-2 mb-2 leading-none uppercase">Inventory Reports</h1>
                            <p className="text-sm text-slate-500 font-medium">Cost-based stock valuation and analysis</p>
                        </div>
                    </div>
                    <Button onClick={handleExportCsv} variant="outline" className="gap-2 rounded-2xl border-slate-200 shadow-sm hover:bg-slate-50">
                        <Download className="h-4 w-4" />
                        Export Report
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <DollarSign className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Total Value (Cost)</div>
                            </div>
                            <h3 className="text-4xl font-black font-display tracking-tight">${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-violet-50 rounded-2xl">
                                    <Package className="h-6 w-6 text-violet-600" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracked Items</div>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 font-display tracking-tight">{products?.length || 0}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-amber-50 rounded-2xl">
                                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock</div>
                            </div>
                            <h3 className="text-4xl font-black text-amber-600 font-display tracking-tight">{lowStockItems.length}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-rose-50 rounded-2xl">
                                    <AlertTriangle className="h-6 w-6 text-rose-600" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Out of Stock</div>
                            </div>
                            <h3 className="text-4xl font-black text-rose-600 font-display tracking-tight">{outOfStockItems.length}</h3>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Valuation by Category Chart */}
                    <Card className="lg:col-span-1 border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Top Value Assets</CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Highest value products in stock</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] p-8 pt-0">
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
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Low Stock Alerts */}
                    <Card className="lg:col-span-2 border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/50">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Stock Warnings</CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Critical replenishment required</CardDescription>
                            </div>
                            <div className="p-3 bg-white rounded-2xl shadow-sm">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                    <TableRow>
                                        <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Product</TableHead>
                                        <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Current Stock</TableHead>
                                        <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Unit Cost</TableHead>
                                        <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Valuation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStockItems.slice(0, 5).map((p: any) => (
                                        <TableRow key={p.productId} className="hover:bg-slate-50/80 border-b border-slate-50 transition-colors duration-200">
                                            <TableCell className="p-6">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.sku}</div>
                                            </TableCell>
                                            <TableCell className="p-6 text-right font-black text-amber-600">{p.stockLevel}</TableCell>
                                            <TableCell className="p-6 text-right text-slate-500 font-medium text-sm">${Number(p.unitCost).toFixed(2)}</TableCell>
                                            <TableCell className="p-6 text-right font-black text-slate-900 font-display">${p.totalValuation.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {lowStockItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="p-12 text-center text-slate-400 font-medium">
                                                All stock levels are healthy
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Full Valuation Table */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Full Asset Inventory</CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Detailed cost-based valuation list</CardDescription>
                        </div>
                        <div className="relative w-72 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors duration-200" />
                            <Input
                                placeholder="Search inventory assets..."
                                className="pl-9 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-primary/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-100">
                                <TableRow>
                                    <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Product</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Quantity</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Unit Cost</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Total Valuation</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Calculating stock assets...</span>
                                        </div>
                                    </td></tr>
                                ) : filteredProducts?.map((p: any) => (
                                    <TableRow key={p.productId} className="group hover:bg-slate-50/50 transition-colors duration-200">
                                        <TableCell className="p-6">
                                            <div className="font-bold text-slate-800 text-lg leading-tight">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase mt-1">{p.sku}</div>
                                        </TableCell>
                                        <TableCell className="p-6 text-right font-black text-slate-700 font-mono">{p.stockLevel}</TableCell>
                                        <TableCell className="p-6 text-right text-slate-500 font-medium">${Number(p.unitCost).toFixed(2)}</TableCell>
                                        <TableCell className="p-6 text-right font-black text-slate-900 text-lg font-display">${p.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="p-6">
                                            {Number(p.stockLevel) <= 0 ? (
                                                <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-full tracking-tighter border border-red-100">Out of Stock</span>
                                            ) : Number(p.stockLevel) <= 5 ? (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full tracking-tighter border border-amber-100">Low Stock</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full tracking-tighter border border-emerald-100">Healthy</span>
                                            )}
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

