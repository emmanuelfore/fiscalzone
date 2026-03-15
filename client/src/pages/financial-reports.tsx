
import { Layout } from "@/components/layout";
import { useFinancialSummary } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    CartesianGrid,
    Tooltip
} from "recharts";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinancialReportsPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: summary, isLoading } = useFinancialSummary(companyId);

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    const expenseBreakdown = summary?.expenseBreakdown || [];

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 uppercase">Financial Analysis</h1>
                    <p className="text-slate-500 mt-1 font-medium">Profitability and expense performance overview</p>
                </div>
                <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 shadow-sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print Analysis
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {/* Revenue */}
                <Card className="border-none shadow-xl bg-indigo-600 text-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Revenue</p>
                        <h3 className="text-3xl font-black font-display tracking-tight">${summary?.revenue.toLocaleString()}</h3>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold bg-white/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Gross Sales
                        </div>
                    </CardContent>
                </Card>

                {/* COGS */}
                <Card className="border-none shadow-xl bg-rose-500 text-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Cost of Sales (COGS)</p>
                        <h3 className="text-3xl font-black font-display tracking-tight">${summary?.cogs.toLocaleString()}</h3>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold bg-white/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            Inventory Cost
                        </div>
                    </CardContent>
                </Card>

                {/* Gross Profit */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 border border-slate-50">
                    <CardContent className="p-8">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gross Profit</p>
                        <h3 className="text-3xl font-black text-slate-900 font-display tracking-tight">${summary?.grossProfit.toLocaleString()}</h3>
                        <div className={`mt-4 flex items-center gap-1.5 text-xs font-bold ${summary!.grossProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {summary!.grossProfit > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {((summary!.grossProfit / summary!.revenue) * 100 || 0).toFixed(1)}% Margin
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border border-slate-50">
                    <CardContent className="p-8">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Op. Expenses</p>
                        <h3 className="text-3xl font-black text-slate-900 font-display tracking-tight">${summary?.expenses.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">Indirect Costs</p>
                    </CardContent>
                </Card>

                {/* Net Profit */}
                <Card className={`border-none shadow-xl rounded-[2rem] overflow-hidden border ${summary!.netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    <CardContent className="p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Net Profit</p>
                        <h3 className="text-3xl font-black font-display tracking-tight">${summary?.netProfit.toLocaleString()}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 opacity-80">Bottom Line</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Expense Breakdown */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Expense Distribution</CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Spending by category</CardDescription>
                            </div>
                            <div className="p-3 bg-violet-50 rounded-2xl">
                                <PieChartIcon className="w-6 h-6 text-violet-600" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="amount"
                                    nameKey="category"
                                >
                                    {expenseBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Expense List Table */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/50">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Financial Summary</CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Detailed spending records</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                    <th className="p-6 text-left">Category</th>
                                    <th className="p-6 text-right">Amount</th>
                                    <th className="p-6 text-right">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {expenseBreakdown.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-200">
                                        <td className="p-6 font-bold text-slate-700">{item.category}</td>
                                        <td className="p-6 text-right font-black text-slate-900">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="p-6 text-right">
                                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">
                                                {((item.amount / summary!.expenses) * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {expenseBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-slate-400 font-medium italic">No expense data recorded</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
