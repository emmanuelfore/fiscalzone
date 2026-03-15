import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function SalesByCategoryChart({ companyId, dateRange, consolidatedSymbol = "$", consolidatedRate = 1 }: any) {
    const { data: chartData, isLoading } = useQuery({
        queryKey: ["sales-by-category", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/charts/sales-by-category/${companyId}?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    const data = chartData?.map((item: any) => ({
        name: item.category,
        value: Number(item.totalSales) * Number(consolidatedRate)
    })) || [];

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Sales by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => [`${consolidatedSymbol}${value.toFixed(2)}`, "Sales"]}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No category data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function SalesByPaymentMethodChart({ companyId, dateRange, consolidatedSymbol = "$", consolidatedRate = 1 }: any) {
    const { data: chartData, isLoading } = useQuery({
        queryKey: ["sales-by-payment-method", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/charts/sales-by-payment-method/${companyId}?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    const data = chartData?.map((item: any) => ({
        name: item.method,
        value: Number(item.total) * Number(consolidatedRate)
    })) || [];

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Sales by Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${consolidatedSymbol}${v}`} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                formatter={(value: any) => [`${consolidatedSymbol}${value.toFixed(2)}`, "Total"]}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No payment data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function SalesByUserChart({ companyId, dateRange, consolidatedSymbol = "$", consolidatedRate = 1 }: any) {
    const { data: chartData, isLoading } = useQuery({
        queryKey: ["sales-by-user", companyId, dateRange.from, dateRange.to],
        queryFn: async () => {
            const params = new URLSearchParams({
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd')
            });
            const res = await apiFetch(`/api/reports/charts/sales-by-user/${companyId}?${params.toString()}`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!companyId
    });

    const data = chartData?.map((item: any) => ({
        name: item.userName,
        value: Number(item.totalSales) * Number(consolidatedRate)
    })) || [];

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Sales Performance by User</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${consolidatedSymbol}${v}`} />
                            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                formatter={(value: any) => [`${consolidatedSymbol}${value.toFixed(2)}`, "Total Sales"]}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No user performance data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ProductPerformanceTable({ companyId, dateRange }: any) {
    // This component is mostly used in POS reports but kept here for compatibility
    return null;
}
