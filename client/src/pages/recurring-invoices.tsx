import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useRecurringInvoices, useDeleteRecurringInvoice, useUpdateRecurringInvoice } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Loader2, RefreshCw, Calendar, MoreHorizontal, Trash2, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function RecurringInvoicesPage() {
    const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: recurring, isLoading } = useRecurringInvoices(selectedCompanyId);
    const deleteRecurring = useDeleteRecurringInvoice();
    const updateRecurring = useUpdateRecurringInvoice();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");

    const handleToggleStatus = (id: number, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "paused" : "active";
        updateRecurring.mutate({ id, data: { status: newStatus } });
    };

    const filteredRecurring = recurring?.filter(r => {
        const matchesSearch = r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.frequency.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <Layout>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Recurring Invoices</h1>
                    <p className="text-slate-500 mt-1">Automate your regular billing cycles</p>
                </div>
                <Link href="/invoices">
                    <Button variant="outline">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Go to Invoices
                    </Button>
                </Link>
            </div>

            <Card className="card-depth border-none overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search templates..."
                                className="pl-9 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="data-table-header">Template Description</th>
                                    <th className="data-table-header w-[120px]">Frequency</th>
                                    <th className="data-table-header w-[140px]">Last Run</th>
                                    <th className="data-table-header w-[140px]">Next Run</th>
                                    <th className="data-table-header w-[100px]">Status</th>
                                    <th className="data-table-header w-[60px] text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                <p>Loading schedules...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecurring?.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <RefreshCw className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <p className="font-medium">No recurring schedules found</p>
                                                <p className="text-xs mt-1 text-slate-400">Convert an existing invoice to a recurring schedule to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecurring?.map((r) => (
                                    <tr key={r.id} className="data-table-row group">
                                        <td className="data-table-cell font-medium text-slate-900">
                                            {r.description || "No description"}
                                        </td>
                                        <td className="data-table-cell">
                                            <Badge variant="secondary" className="capitalize">
                                                {r.frequency}
                                            </Badge>
                                        </td>
                                        <td className="data-table-cell text-slate-500">
                                            {r.lastRunDate ? format(new Date(r.lastRunDate), "dd MMM yyyy") : "Never"}
                                        </td>
                                        <td className="data-table-cell font-medium text-primary">
                                            {r.nextRunDate ? format(new Date(r.nextRunDate), "dd MMM yyyy") : "-"}
                                        </td>
                                        <td className="data-table-cell">
                                            <Badge className={cn(
                                                "capitalize",
                                                r.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-400'
                                            )}>
                                                {r.status}
                                            </Badge>
                                        </td>
                                        <td className="data-table-cell text-right pr-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(r.id, r.status || "active")}>
                                                        {r.status === "active" ? (
                                                            <><Pause className="mr-2 h-4 w-4" /> Pause Schedule</>
                                                        ) : (
                                                            <><Play className="mr-2 h-4 w-4" /> Resume Schedule</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 cursor-pointer"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this schedule?")) {
                                                                deleteRecurring.mutate(r.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </Layout>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}
