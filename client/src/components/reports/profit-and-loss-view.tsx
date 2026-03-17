
import { useState } from "react";
import { format } from "date-fns";
import { useFinancialSummary } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    PieChart as PieChartIcon, 
    ArrowUpRight, 
    ArrowDownRight, 
    Printer,
    Activity,
    ShoppingBag,
    Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table as TableUI,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ProfitAndLossViewProps {
    companyId: number;
    dateRange: { from: Date; to: Date };
    consolidatedSymbol: string;
    consolidatedRate: number;
}

export function ProfitAndLossView({ companyId, dateRange, consolidatedSymbol, consolidatedRate }: ProfitAndLossViewProps) {
    const [drillDownType, setDrillDownType] = useState<"revenue" | "cogs" | "expenses" | null>(null);
    
    const { data: summary, isLoading } = useFinancialSummary(
        companyId, 
        format(dateRange.from, 'yyyy-MM-dd'), 
        format(dateRange.to, 'yyyy-MM-dd'), 
        true
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Calculating financial data...</p>
            </div>
        );
    }

    const expenseBreakdown = summary?.expenseBreakdown || [];

    // Apply consolidated rate if needed (Backend usually returns USD, we want to show consolidated)
    const formatValue = (val: number) => {
        return (val * consolidatedRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue */}
                <MetricCard 
                    title="Gross Revenue"
                    value={summary?.revenue || 0}
                    formatValue={formatValue}
                    symbol={consolidatedSymbol}
                    icon={TrendingUp}
                    color="bg-indigo-600"
                    onClick={() => setDrillDownType("revenue")}
                />

                {/* COGS */}
                <MetricCard 
                    title="Cost of Sales"
                    value={summary?.cogs || 0}
                    formatValue={formatValue}
                    symbol={consolidatedSymbol}
                    icon={ShoppingBag}
                    color="bg-rose-500"
                    onClick={() => setDrillDownType("cogs")}
                />

                {/* Gross Profit */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-slate-100">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Profit</p>
                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                <Activity className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight">
                            {consolidatedSymbol}{formatValue(summary?.grossProfit || 0)}
                        </h3>
                        <div className={cn(
                            "mt-3 flex items-center gap-1.5 text-xs font-black px-2 py-1 rounded-full w-fit",
                            summary!.grossProfit >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                        )}>
                            {((summary!.grossProfit / summary!.revenue) * 100 || 0).toFixed(1)}% Margin
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses */}
                <MetricCard 
                    title="Operating Expenses"
                    value={summary?.expenses || 0}
                    formatValue={formatValue}
                    symbol={consolidatedSymbol}
                    icon={Wallet}
                    color="bg-slate-800"
                    onClick={() => setDrillDownType("expenses")}
                />

                {/* Net Profit */}
                <Card className={cn(
                    "border-none shadow-xl rounded-[2rem] overflow-hidden text-white transition-all duration-300 group hover:scale-[1.02]",
                    summary!.netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"
                )}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Net Profit</p>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <DollarSign className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black font-display tracking-tight">
                            {consolidatedSymbol}{formatValue(summary?.netProfit || 0)}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 opacity-80 group-hover:opacity-100 transition-opacity">Bottom Line Contribution</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Chart */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border border-slate-100">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Expense Distribution</CardTitle>
                                <CardDescription className="text-slate-400 font-medium tracking-tight">Top category spending</CardDescription>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] p-6">
                        {expenseBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="amount"
                                        nameKey="category"
                                        stroke="none"
                                    >
                                        {expenseBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                        formatter={(value: number) => [`${consolidatedSymbol}${formatValue(value)}`, 'Amount']}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
                                <Wallet className="w-8 h-8 mb-2 opacity-20" />
                                No expense data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expense Detailed Table */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border border-slate-100">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Detailed Breakdown</CardTitle>
                        <CardDescription className="text-slate-400 font-medium tracking-tight">Metric categorization</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-100">
                                    <th className="p-6 text-left">Category</th>
                                    <th className="p-6 text-right">Amount</th>
                                    <th className="p-6 text-right">Contribution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {expenseBreakdown.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors duration-200 group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span className="font-bold text-slate-700">{item.category}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right font-black text-slate-900">
                                            {consolidatedSymbol}{formatValue(item.amount)}
                                        </td>
                                        <td className="p-6 text-right font-medium text-slate-400">
                                            <Badge variant="outline" className="font-black text-[10px] bg-slate-50 group-hover:bg-white">
                                                {((item.amount / summary!.expenses) * 100).toFixed(1)}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {expenseBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-16 text-center text-slate-400 italic text-sm">No expenses recorded for this period</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            {/* Drill-down Dialog */}
            <Dialog open={!!drillDownType} onOpenChange={(open) => !open && setDrillDownType(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0">
                    <div className={cn(
                        "p-8 text-white",
                        drillDownType === "revenue" ? "bg-indigo-600" : 
                        drillDownType === "cogs" ? "bg-rose-500" : "bg-slate-900"
                    )}>
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    {drillDownType === "revenue" ? <TrendingUp className="w-6 h-6" /> : 
                                     drillDownType === "cogs" ? <ShoppingBag className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-3xl font-black uppercase tracking-tight leading-none">
                                        {drillDownType === "revenue" && "Revenue Records"}
                                        {drillDownType === "cogs" && "Cost Breakdown"}
                                        {drillDownType === "expenses" && "Expense Ledger"}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/60 font-medium mt-1">
                                        Drill-down exploration of {drillDownType} performance
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 flex-1 overflow-y-auto">
                        {drillDownType === "revenue" && (
                            <TableUI>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Ref #</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Customer</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary?.drillDown?.revenueItems.map((inv: any) => (
                                        <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                                            <TableCell className="font-medium text-slate-500">{format(new Date(inv.issueDate || inv.createdAt), "dd MMM yyyy")}</TableCell>
                                            <TableCell className="font-black text-indigo-600">{inv.invoiceNumber}</TableCell>
                                            <TableCell className="font-medium text-slate-700">{inv.customerName || "Walk-in"}</TableCell>
                                            <TableCell className="text-right font-black text-slate-900">
                                                {consolidatedSymbol}{(Number(inv.total) * consolidatedRate).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </TableUI>
                        )}

                        {drillDownType === "cogs" && (
                            <TableUI>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Reference</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Product</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary?.drillDown?.cogsItems.map((tx: any) => (
                                        <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                                            <TableCell className="font-medium text-slate-500">{format(new Date(tx.createdAt), "dd MMM HH:mm")}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-black">{tx.referenceType} #{tx.referenceId}</Badge></TableCell>
                                            <TableCell className="font-bold text-slate-700 truncate max-w-[200px]">{tx.productName || "Product"}</TableCell>
                                            <TableCell className="text-right font-black text-rose-500">
                                                {consolidatedSymbol}{(Number(tx.totalCost) * consolidatedRate).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </TableUI>
                        )}

                        {drillDownType === "expenses" && (
                            <TableUI>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Date</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Category</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Description</TableHead>
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary?.drillDown?.expenseItems.map((exp: any) => (
                                        <TableRow key={exp.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                                            <TableCell className="font-medium text-slate-500">{format(new Date(exp.expenseDate || exp.date), "dd MMM yyyy")}</TableCell>
                                            <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-black text-[9px]">{exp.category}</Badge></TableCell>
                                            <TableCell className="text-slate-700 font-medium truncate max-w-[250px]">{exp.description}</TableCell>
                                            <TableCell className="text-right font-black text-rose-500">
                                                {consolidatedSymbol}{(Number(exp.amount) * consolidatedRate).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </TableUI>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MetricCard({ title, value, formatValue, symbol, icon: Icon, color, onClick }: any) {
    return (
        <Card 
            className={cn(
                "border-none shadow-xl text-white rounded-[2rem] overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300",
                color
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{title}</p>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-black font-display tracking-tight leading-none mb-4">
                    {symbol}{formatValue(value)}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] font-black bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm group hover:bg-white/30 transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    EXPLORE DATA
                </div>
            </CardContent>
        </Card>
    );
}
