
import { Layout } from "@/components/layout";
import { useStockValuation } from "@/hooks/use-reports";
import { useInventoryTransactions } from "@/hooks/use-inventory";
import { useProducts } from "@/hooks/use-products";
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
import {
    Package,
    TrendingUp,
    DollarSign,
    Activity,
    ArrowUpRight,
    ArrowDownLeft,
    BarChart3,
    Layers,
    History
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";
import { GrnForm } from "@/components/inventory/grn-form";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function InventoryAccountPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: valuation, isLoading: isLoadingValuation } = useStockValuation(companyId);
    const { data: transactions, isLoading: isLoadingTransactions } = useInventoryTransactions(companyId);
    const { data: products } = useProducts(companyId);

    // Sum total valuation
    const totalValue = valuation?.reduce((acc: number, p: any) => acc + p.totalValuation, 0) || 0;

    // Group by category
    const categoryData: Record<string, number> = {};
    valuation?.forEach((p: any) => {
        const cat = p.category || "Uncategorized";
        categoryData[cat] = (categoryData[cat] || 0) + p.totalValuation;
    });

    const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

    // Top 5 products by value
    const topAssets = [...(valuation || [])]
        .sort((a: any, b: any) => b.totalValuation - a.totalValuation)
        .slice(0, 5);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 font-display uppercase tracking-tight">Goods Received</h1>
                        <p className="text-slate-500 mt-1 font-medium">Consolidated view of your stock holdings and movements</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/inventory">
                            <Button variant="outline" className="rounded-2xl gap-2 font-bold border-slate-200">
                                <History className="h-4 w-4" />
                                View Ledger
                            </Button>
                        </Link>
                        <GrnForm />
                    </div>
                </div>

                {/* Performance Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-[2rem] overflow-hidden group">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <TrendingUp className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="text-4xl font-black font-display tracking-tight leading-tight">
                                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                            <p className="text-white/60 text-xs font-black uppercase tracking-widest mt-2">Total Net Stock Value</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-8 text-slate-600">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl">
                                    <Layers className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 font-display tracking-tight leading-tight">
                                {valuation?.length || 0}
                            </h3>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Total SKU Varieties</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-8 text-slate-600">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-amber-50 rounded-2xl">
                                    <Activity className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 font-display tracking-tight leading-tight">
                                {transactions?.filter(t => {
                                    const d = new Date(t.createdAt!);
                                    const now = new Date();
                                    return d.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000;
                                }).length || 0}
                            </h3>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-2">Movements (30d)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Valuation Breakdown */}
                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-violet-500" />
                                Value Distribution
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium font-sans">Stock value contribution by category</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px] p-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        formatter={(v: number) => [`$${v.toFixed(2)}`, 'Valuation']}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Top Inventory Assets */}
                    <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                Top Stock Items
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Highest value products by stock quantity</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Product</TableHead>
                                        <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Qty</TableHead>
                                        <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topAssets.map((asset: any) => (
                                        <TableRow key={asset.productId} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="p-6">
                                                <div className="font-bold text-slate-800">{asset.name}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{asset.sku}</div>
                                            </TableCell>
                                            <TableCell className="p-6 text-right font-mono text-slate-600 font-bold">{asset.stockLevel}</TableCell>
                                            <TableCell className="p-6 text-right font-black text-slate-900 font-display">
                                                ${Number(asset.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-500" />
                                Recent Movements
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Last 5 stock adjustments</CardDescription>
                        </div>
                        <Link href="/inventory">
                            <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl">Full Ledger</Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type & Product</TableHead>
                                    <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Change</TableHead>
                                    <TableHead className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions?.slice(0, 5).map((t: any) => {
                                    const product = products?.find(p => p.id === t.productId);
                                    const isPositive = Number(t.quantity) > 0;
                                    return (
                                        <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="p-6">
                                                <div className="flex items-center gap-2">
                                                    {isPositive ? (
                                                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                                                    )}
                                                    <div className="font-bold text-slate-700">
                                                        {product?.name || "Product " + t.productId}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-6">{t.type}</div>
                                            </TableCell>
                                            <TableCell className={`p-6 text-right font-black ${isPositive ? "text-emerald-600" : "text-blue-600"}`}>
                                                {isPositive ? "+" : ""}{t.quantity}
                                            </TableCell>
                                            <TableCell className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                                {new Date(t.createdAt!).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
