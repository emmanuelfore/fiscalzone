
import { useState } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileSearch, Package, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface DailySalesTableProps {
    sales: any[];
    currencies: any[];
    consolidatedSymbol: string;
    consolidatedRate: number;
    currencyMode?: "consolidated" | "original";
}

export function DailySalesTable({ sales, currencies, consolidatedSymbol, consolidatedRate, currencyMode = "consolidated" }: DailySalesTableProps) {
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [expandedInvoices, setExpandedInvoices] = useState<Record<number, boolean>>({});

    // Group sales by date
    const groupedSales = sales.reduce((acc: any, inv: any) => {
        const date = format(new Date(inv.issueDate || inv.createdAt), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = { 
            date, 
            invoices: [], 
            totals: {} as Record<string, number>, 
            discountTotals: {} as Record<string, number>,
            consolidatedTotal: 0,
            consolidatedDiscount: 0
        };
        
        acc[date].invoices.push(inv);
        
        const currency = inv.currency || "USD";
        acc[date].totals[currency] = (acc[date].totals[currency] || 0) + Number(inv.total);
        acc[date].discountTotals[currency] = (acc[date].discountTotals[currency] || 0) + Number(inv.discountAmount || 0);
        
        const rate = Number(inv.exchangeRate || 1);
        acc[date].consolidatedTotal += Number(inv.total) / rate;
        acc[date].consolidatedDiscount += Number(inv.discountAmount || 0) / rate;
        
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedSales).sort((a, b) => b.localeCompare(a));

    const toggleDay = (date: string) => {
        setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const toggleInvoice = (id: number) => {
        setExpandedInvoices(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="font-bold text-slate-800">Date / Ref</TableHead>
                        <TableHead className="font-bold text-slate-800">Customer</TableHead>
                        <TableHead className="font-bold text-slate-800">Cashier</TableHead>
                        <TableHead className="font-bold text-slate-800">Method</TableHead>
                        <TableHead className="text-right font-bold text-slate-800">
                            {currencyMode === "consolidated" ? `Discount (${consolidatedSymbol})` : "Discount"}
                        </TableHead>
                        <TableHead className="text-right font-bold text-slate-800">
                            {currencyMode === "consolidated" ? `Total (${consolidatedSymbol})` : "Total"}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedDates.map(date => (
                        <DaySection 
                            key={date}
                            dayData={groupedSales[date]}
                            isExpanded={!!expandedDays[date]}
                            onToggle={() => toggleDay(date)}
                            expandedInvoices={expandedInvoices}
                            onToggleInvoice={toggleInvoice}
                            currencies={currencies}
                            consolidatedSymbol={consolidatedSymbol}
                            consolidatedRate={consolidatedRate}
                            currencyMode={currencyMode}
                        />
                    ))}
                    {sortedDates.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                                No sales data found for this period
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function DaySection({ dayData, isExpanded, onToggle, expandedInvoices, onToggleInvoice, currencies, consolidatedSymbol, consolidatedRate, currencyMode }: any) {
    return (
        <>
            <TableRow 
                className={cn(
                    "cursor-pointer transition-colors group",
                    isExpanded ? "bg-indigo-50/30" : "hover:bg-slate-50"
                )}
                onClick={onToggle}
            >
                <TableCell>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </TableCell>
                <TableCell className="font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format(parseISO(dayData.date), 'EEEE, MMMM dd, yyyy')}
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="bg-white/50">{dayData.invoices.length} Invoices</Badge>
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold text-slate-700">
                    {currencyMode === "consolidated" ? (
                        `${consolidatedSymbol}${(dayData.consolidatedDiscount * consolidatedRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                        <div className="flex flex-col items-end gap-0.5">
                            {Object.entries(dayData.discountTotals).map(([code, total]: [any, any]) => {
                                const curr = currencies?.find((c: any) => c.code === code);
                                return (
                                    <span key={code} className="text-xs">
                                        {curr?.symbol || code}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </TableCell>
                <TableCell className="text-right font-black text-slate-900">
                    {currencyMode === "consolidated" ? (
                        `${consolidatedSymbol}${(dayData.consolidatedTotal * consolidatedRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    ) : (
                        <div className="flex flex-col items-end gap-0.5">
                            {Object.entries(dayData.totals).map(([code, total]: [any, any]) => {
                                const curr = currencies?.find((c: any) => c.code === code);
                                return (
                                    <span key={code} className="text-xs">
                                        {curr?.symbol || code}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </TableCell>
            </TableRow>
            {isExpanded && dayData.invoices.map((inv: any) => (
                <InvoiceRow 
                    key={inv.id} 
                    inv={inv} 
                    currencies={currencies}
                    isExpanded={!!expandedInvoices[inv.id]}
                    onToggle={() => onToggleInvoice(inv.id)}
                    consolidatedSymbol={consolidatedSymbol}
                    consolidatedRate={consolidatedRate}
                    currencyMode={currencyMode}
                />
            ))}
        </>
    );
}

function InvoiceRow({ inv, currencies, isExpanded, onToggle, consolidatedSymbol, consolidatedRate, currencyMode }: any) {
    const currency = currencies?.find((c: any) => c.code === (inv.currency || "USD"));
    const symbol = currency?.symbol || (inv.currency === "USD" ? "$" : inv.currency);

    return (
        <>
            <TableRow 
                className={cn(
                    "cursor-pointer transition-colors border-l-4",
                    isExpanded ? "bg-slate-50 border-l-indigo-500" : "hover:bg-slate-50 border-l-transparent"
                )}
                onClick={onToggle}
            >
                <TableCell className="pl-8">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </TableCell>
                <TableCell className="text-sm font-medium text-slate-600">
                    {format(new Date(inv.issueDate || inv.createdAt), 'HH:mm')}
                </TableCell>
                <TableCell className="text-sm font-bold text-indigo-600">
                    {inv.invoiceNumber}
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                    {inv.customerName || "Walk-in Customer"}
                </TableCell>
                <TableCell className="text-sm text-slate-500 font-medium">
                    {inv.cashierName || "System"}
                </TableCell>
                <TableCell className="text-sm">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider h-5">
                        {inv.paymentMethod || "CASH"}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-slate-600">
                    <div className="flex flex-col items-end">
                        {currencyMode === "consolidated" ? (
                            <span>{consolidatedSymbol}{(Number(inv.discountAmount || 0) / Number(inv.exchangeRate || 1) * consolidatedRate).toFixed(2)}</span>
                        ) : (
                            <span>{symbol}{Number(inv.discountAmount || 0).toFixed(2)}</span>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                    <div className="flex flex-col items-end">
                        {currencyMode === "consolidated" ? (
                            <span>{consolidatedSymbol}{(Number(inv.total) / Number(inv.exchangeRate || 1) * consolidatedRate).toFixed(2)}</span>
                        ) : (
                            <span>{symbol}{Number(inv.total).toFixed(2)}</span>
                        )}
                        {currencyMode === "consolidated" && (
                            <span className="text-[10px] text-slate-400 font-medium">{symbol}{Number(inv.total).toFixed(2)}</span>
                        )}
                    </div>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableCell colSpan={7} className="p-0">
                        <InvoiceItemsList invoiceId={inv.id} />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

function InvoiceItemsList({ invoiceId }: { invoiceId: number }) {
    const { data: invoice, isLoading } = useQuery({
        queryKey: ["invoice", invoiceId],
        queryFn: async () => {
            const res = await apiFetch(`/api/invoices/${invoiceId}`);
            if (!res.ok) throw new Error("Failed to fetch invoice");
            return await res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="px-16 py-4 flex items-center gap-2 text-slate-400 text-xs">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                Loading items...
            </div>
        );
    }

    return (
        <div className="px-16 py-4 bg-white/50">
            <div className="space-y-2 w-full max-w-4xl">
                <div className="grid grid-cols-12 text-[10px] font-black uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">
                    <div className="col-span-6 flex items-center gap-2"><Package className="w-3 h-3" /> Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                </div>
                {invoice?.items?.map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 text-xs py-1 border-b border-slate-50 last:border-0 hover:bg-slate-100/50 rounded px-1 transition-colors">
                        <div className="col-span-6 font-medium text-slate-700">{item.description || item.product?.name}</div>
                        <div className="col-span-2 text-center font-bold text-slate-500">{item.quantity}</div>
                        <div className="col-span-2 text-right text-slate-500">{Number(item.unitPrice).toFixed(2)}</div>
                        <div className="col-span-2 text-right font-bold text-slate-900">{Number(item.lineTotal).toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
