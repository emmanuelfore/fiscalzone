import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from "recharts";
import { DollarSign, FileText, Users, TrendingUp } from "lucide-react";

export default function ReportsPage() {
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;
    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
    const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = currentCompany?.id || 0;

    // Fetch Summary Stats
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

    // Fetch Revenue Over Time
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

    if (isLoadingCompanies) return <Layout><div className="p-8">Loading...</div></Layout>;
    if (!currentCompany) return <Layout><div className="p-8">No company selected.</div></Layout>;

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-slate-500 mt-1">Insights into your business performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard
                    title="Total Revenue"
                    value={summary?.totalRevenue}
                    isLoading={isLoadingSummary}
                    icon={DollarSign}
                    color="text-emerald-600"
                    bg="bg-emerald-100"
                />
                <StatsCard
                    title="Pending Payments"
                    value={summary?.pendingAmount}
                    isLoading={isLoadingSummary}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <Card className="card-depth border-none col-span-1 lg:col-span-2">
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
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

function StatsCard({ title, value, isLoading, prefix = "$", icon: Icon, color, bg }: any) {
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
                                {prefix}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: prefix === "$" ? 2 : 0 })}
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
