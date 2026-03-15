import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useInvoice, useCreateCreditNote } from "@/hooks/use-invoices";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, ChevronDown, ChevronUp, Printer, Calendar as CalendarIcon, FileText, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Receipt48 } from "./receipt-48";

interface MySalesModalProps {
    companyId: number;
    company: any;
    posSettings: any;
    user: any;
    trigger?: React.ReactNode;
}

function SaleItems({ invoiceId }: { invoiceId: number }) {
    const { data: invoice, isLoading } = useInvoice(invoiceId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!invoice || !invoice.items || invoice.items.length === 0) {
        return <div className="text-center py-4 text-slate-500 text-xs italic">No items found</div>;
    }

    return (
        <div className="bg-slate-50/50 rounded-xl p-4 my-2 border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Items</h4>
            <div className="space-y-2">
                {invoice.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{item.description}</span>
                        <div className="text-slate-500">
                            <span>{item.quantity} x ${Number(item.unitPrice).toFixed(2)}</span>
                            <span className="ml-2 font-black text-slate-900">${Number(item.lineTotal).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MySalesModal({ companyId, company, posSettings, user, trigger }: MySalesModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [processingIds, setProcessingIds] = useState<Record<number, 'printing' | 'crediting' | null>>({});
    const { toast } = useToast();
    const createCreditNote = useCreateCreditNote();

    const { data: transactions, isLoading, refetch } = useQuery({
        queryKey: ["/api/pos/my-sales", companyId, selectedDate],
        queryFn: async () => {
            const start = startOfDay(selectedDate).toISOString();
            const end = endOfDay(selectedDate).toISOString();
            const res = await apiFetch(`/api/pos/my-sales?companyId=${companyId}&startDate=${start}&endDate=${end}`);
            if (!res.ok) throw new Error("Failed to fetch sales");
            return res.json();
        },
        enabled: isOpen
    });

    const handleReprint = async (tx: any) => {
        setProcessingIds(prev => ({ ...prev, [tx.id]: 'printing' }));
        try {
            const printContent = document.getElementById(`reprint-${tx.id}`);
            if (!printContent && !tx.items) {
                 toast({
                    title: "Note",
                    description: "Fetching full receipt data...",
                });
                setExpandedId(tx.id);
                // We'll stop here and let the user click again once expanded if items weren't ready,
                // but usually the SaleItems query starts fetching on expansion.
                // To be smoother, we can wait a bit or just expand it.
                await new Promise(r => setTimeout(r, 500));
            }

            if (posSettings.silentPrinting) {
                // Fetch fresh element after expansion if needed
                const freshPrintContent = document.getElementById(`reprint-${tx.id}`);
                const html = freshPrintContent?.outerHTML;
                if (!html) throw new Error("Receipt content not found. Please expand the row first.");

                if (window.electronAPI) {
                    await window.electronAPI.printReceipt(html, posSettings.printerName || undefined);
                } else {
                    const response = await fetch(`${posSettings.printServerUrl}/print`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            html,
                            printerName: posSettings.printerName || undefined
                        })
                    });

                    if (!response.ok) throw new Error("Failed to send to print server");
                }
                
                toast({
                    title: "Print Sent",
                    description: "Receipt sent to thermal printer",
                });
            } else {
                window.print();
            }
        } catch (err: any) {
            toast({
                title: "Print Error",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setProcessingIds(prev => ({ ...prev, [tx.id]: null }));
        }
    };

    const handleCreditNote = async (tx: any) => {
        if (tx.status === 'credited') {
            toast({
                title: "Already Credited",
                description: "A credit note has already been issued for this sale.",
                variant: "destructive"
            });
            return;
        }

        if (!confirm(`Are you sure you want to issue a Credit Note for ${tx.invoiceNumber}?`)) return;

        setProcessingIds(prev => ({ ...prev, [tx.id]: 'crediting' }));
        try {
            await createCreditNote.mutateAsync(tx.id);
            refetch();
            toast({
                title: "Success",
                description: "Credit Note issued successfully.",
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setProcessingIds(prev => ({ ...prev, [tx.id]: null }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <History className="h-4 w-4" />
                        My Sales
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-none shadow-2xl">
                <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight">My Sales History</DialogTitle>
                            <p className="text-slate-500 text-sm font-medium mt-1">Transactions processed by you</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("pl-3 text-left font-bold border-slate-200 bg-white rounded-xl h-10 w-[200px]", !selectedDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && setSelectedDate(date)}
                                        initialFocus
                                        className="rounded-2xl"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-transparent">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Receipt No</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Time</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Customer</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Amount</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions?.map((tx: any) => {
                                    const isPrinting = processingIds[tx.id] === 'printing';
                                    const isCrediting = processingIds[tx.id] === 'crediting';
                                    const isBusy = isPrinting || isCrediting;

                                    return (
                                        <Fragment key={tx.id}>
                                            <TableRow 
                                                className={cn(
                                                    "border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group",
                                                    expandedId === tx.id && "bg-slate-50/80"
                                                )}
                                                onClick={() => !isBusy && setExpandedId(expandedId === tx.id ? null : tx.id)}
                                            >
                                                <TableCell className="py-4">
                                                    {expandedId === tx.id ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-black text-slate-600">{tx.invoiceNumber}</TableCell>
                                                <TableCell className="text-sm font-bold text-slate-500">{format(new Date(tx.issueDate), "HH:mm")}</TableCell>
                                                <TableCell className="text-sm font-bold text-slate-700">{tx.customerName || "Walk-in Guest"}</TableCell>
                                                <TableCell className="text-right font-black text-slate-900">${Number(tx.total).toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    {tx.syncedWithFdms ? (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-lg px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">Fiscalized</Badge>
                                                    ) : tx.status === 'credited' ? (
                                                        <Badge className="bg-amber-50 text-amber-600 border-none rounded-lg px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">Credited</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none rounded-lg px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">Pending</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 rounded-lg bg-white border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 text-slate-600 transition-all font-bold text-[10px] uppercase tracking-tight gap-1.5"
                                                            onClick={(e) => { e.stopPropagation(); handleReprint(tx); }}
                                                            disabled={isBusy}
                                                        >
                                                            {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                                                            Reprint
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 rounded-lg bg-white border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 text-slate-600 transition-all font-bold text-[10px] uppercase tracking-tight gap-1.5"
                                                            onClick={(e) => { e.stopPropagation(); handleCreditNote(tx); }}
                                                            disabled={tx.status === 'credited' || isBusy}
                                                        >
                                                            {isCrediting ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                                                            Credit Note
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {expandedId === tx.id && (
                                                <TableRow className="bg-slate-50/80 border-none hover:bg-slate-50/80">
                                                    <TableCell colSpan={7} className="py-0 px-6 pb-6 border-none">
                                                        <SaleItems invoiceId={tx.id} />
                                                        {/* Hidden receipt for silent printing */}
                                                        <div className="hidden">
                                                            <Receipt48
                                                                id={`reprint-${tx.id}`}
                                                                invoice={tx}
                                                                company={company}
                                                                user={user}
                                                                items={tx.items}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                                {transactions?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                                    <Receipt className="h-8 w-8 text-slate-200" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No transactions found</p>
                                                    <p className="text-xs text-slate-400 mt-1">Try another date or process new sales.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
