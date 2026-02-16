
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Package,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Search,
    ArrowLeft,
    Download
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
    const { activeCompany } = useActiveCompany();
    const companyId = activeCompany?.id;
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Products
    const { data: products, isLoading: isLoadingProducts } = useQuery({
        queryKey: ["products", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/products`);
            if (!res.ok) throw new Error("Failed to fetch products");
            return await res.json();
        },
        enabled: !!companyId
    });

    // Calculations
    const trackedProducts = products?.filter((p: any) => p.isTracked) || [];
    const lowStockItems = trackedProducts.filter((p: any) =>
        Number(p.stockLevel) <= Number(p.lowStockThreshold) && Number(p.stockLevel) > 0
    );
    const outOfStockItems = trackedProducts.filter((p: any) => Number(p.stockLevel) <= 0);

    const totalStockValue = products?.reduce((acc: number, p: any) =>
        acc + (Number(p.stockLevel) * Number(p.price)), 0) || 0;

    const totalCostValue = products?.reduce((acc: number, p: any) =>
        acc + (Number(p.stockLevel) * (Number(p.costPrice) || 0)), 0) || 0;

    const potentialProfit = totalStockValue - totalCostValue;

    // Valuation by Category for Chart
    const categoryValuation = products?.reduce((acc: any, p: any) => {
        const cat = p.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += (Number(p.stockLevel) * Number(p.price));
        return acc;
    }, {}) || {};

    const chartData = Object.entries(categoryValuation).map(([name, value]) => ({
        name,
        value
    })).sort((a, b) => (b.value as number) - (a.value as number));

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Filtered search
    const filteredProducts = products?.filter((p: any) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportCsv = () => {
        if (!products || products.length === 0) return;

        const headers = ["Name", "SKU", "Category", "Stock Level", "Price", "Cost", "Stock Value"];
        const rows = products.map((p: any) => [
            p.name,
            p.sku || "-",
            p.category || "Uncategorized",
            p.stockLevel,
            p.price,
            p.costPrice || 0,
            (Number(p.stockLevel) * Number(p.price)).toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: any[]) => row.map(cell => `"${cell || ''}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Inventory_Report_${format(new Date(), "yyyyMMdd")}.csv`);
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
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Reports</h1>
                            <p className="text-sm text-slate-500 font-medium">Stock valuation and movement analysis</p>
                        </div>
                    </div>
                    <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Report
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-indigo-50/50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-indigo-600" />
                                </div>
                                <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Stock Value</p>
                            </div>
                            <h3 className="text-2xl font-black text-indigo-900">${totalStockValue.toFixed(2)}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-blue-50/50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                                <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">Est. Profit</p>
                            </div>
                            <h3 className="text-2xl font-black text-blue-900">${potentialProfit.toFixed(2)}</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-amber-50/50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                </div>
                                <p className="text-sm font-bold text-amber-400 uppercase tracking-widest">Low Stock</p>
                            </div>
                            <h3 className="text-2xl font-black text-amber-900">{lowStockItems.length} Items</h3>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-rose-50/50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-100 rounded-lg">
                                    <Package className="h-5 w-5 text-rose-600" />
                                </div>
                                <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">Out of Stock</p>
                            </div>
                            <h3 className="text-2xl font-black text-rose-900">{outOfStockItems.length} Items</h3>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Valuation by Category Chart */}
                    <Card className="lg:col-span-1 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Valuation by Category</CardTitle>
                            <CardDescription>Based on selling price</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
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
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Low Stock Alerts */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Low Stock Alerts</CardTitle>
                                <CardDescription>Products reaching threshold</CardDescription>
                            </div>
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Current Stock</TableHead>
                                        <TableHead className="text-right">Threshold</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStockItems.slice(0, 5).map((p: any) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                                            <TableCell className="text-slate-500 font-mono text-xs">{p.sku}</TableCell>
                                            <TableCell className="text-right font-bold text-amber-600">{p.stockLevel}</TableCell>
                                            <TableCell className="text-right text-slate-500">{p.lowStockThreshold}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">${(Number(p.stockLevel) * Number(p.price)).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {lowStockItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-400">
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
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold">Inventory Valuation List</CardTitle>
                            <CardDescription>Detailed breakdown of all products</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search inventory..."
                                className="pl-9 bg-slate-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Product</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs">Category</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs text-right">Price</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs text-right">Stock</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs text-right">Ext. Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingProducts ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
                                ) : filteredProducts?.map((p: any) => (
                                    <TableRow key={p.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="font-bold text-slate-800">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.sku}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold uppercase">
                                                {p.category || "General"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600 text-sm">${Number(p.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {p.stockLevel}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-slate-900">
                                            ${(Number(p.stockLevel) * Number(p.price)).toFixed(2)}
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
