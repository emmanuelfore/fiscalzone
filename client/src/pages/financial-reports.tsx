import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Layout } from "@/components/layout";
import { useCurrencies } from "@/hooks/use-currencies";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Printer, Calculator, FileDown } from "lucide-react";
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
import { ProfitAndLossView } from "@/components/reports/profit-and-loss-view";
import { downloadExcel } from "@/lib/export-utils";

export default function FinancialReportsPage() {
    const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
    const companyId = activeCompany?.id || 0;
    
    const { data: currencies } = useCurrencies(companyId);

    // State
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });
    const [consolidatedCode, setConsolidatedCode] = useState<string>("USD");

    const consolidatedCurrency = currencies?.find(c => c.code === consolidatedCode);
    const consolidatedRate = Number(consolidatedCurrency?.exchangeRate || 1);
    const consolidatedSymbol = consolidatedCurrency?.symbol || "$";

    const handleExportExcel = () => {
        const params = new URLSearchParams({
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd')
        });
        downloadExcel(`/api/reports/export/financial/${companyId}?${params.toString()}`, `Financial_Report_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    if (isLoadingActive) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 uppercase tracking-tight">Financial Performance</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Comprehensive Profit & Loss Analysis for {activeCompany?.name}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Base:</span>
                        <Select value={consolidatedCode} onValueChange={setConsolidatedCode}>
                            <SelectTrigger className="w-[90px] h-8 text-xs font-bold border-none bg-slate-100/50 rounded-xl focus:ring-0">
                                <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="USD" className="text-xs font-bold">USD</SelectItem>
                                {currencies?.filter(c => c.code !== 'USD').map(c => (
                                    <SelectItem key={c.id} value={c.code} className="text-xs font-bold">{c.code}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className={cn("h-8 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl")}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from}
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range: any) => {
                                    if (range?.from) {
                                        setDateRange({ from: range.from, to: range.to || range.from });
                                    }
                                }}
                                numberOfMonths={2}
                                className="rounded-3xl"
                            />
                        </PopoverContent>
                    </Popover>

                    <div className="h-6 w-px bg-slate-200" />
                    
                    <div className="flex gap-1">
                        <Button variant="ghost" className="h-8 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl gap-2" onClick={handleExportExcel}>
                            <FileDown className="h-3.5 w-3.5 text-indigo-500" />
                            Excel
                        </Button>
                        <Button variant="ghost" className="h-8 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl gap-2" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5 text-indigo-500" />
                            Print
                        </Button>
                    </div>
                </div>
            </div>

            <ProfitAndLossView 
                companyId={companyId}
                dateRange={dateRange}
                consolidatedSymbol={consolidatedSymbol}
                consolidatedRate={consolidatedRate}
            />
        </Layout>
    );
}
