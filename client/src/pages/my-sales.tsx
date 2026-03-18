import { PosLayout } from "@/components/pos-layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Receipt, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";
import { useState, useEffect, Fragment } from "react";
import { useInvoice } from "@/hooks/use-invoices";
import { useCompany } from "@/hooks/use-companies";
import { POSReceipt } from "@/components/pos-receipt";
import { cn } from "@/lib/utils";

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
        return <div className="text-center py-4 text-slate-500 text-xs italic">No items found for this sale</div>;
    }

    return (
        <div className="bg-slate-50/50 rounded-xl p-4 my-2 border border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Itemized Contents</h4>
            <Table>
                <TableHeader className="bg-transparent border-none">
                    <TableRow className="border-none hover:bg-transparent h-8">
                        <TableHead className="h-8 text-[9px] uppercase font-bold text-slate-400">Description</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase font-bold text-slate-400 text-center">Qty</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase font-bold text-slate-400 text-right">Price</TableHead>
                        <TableHead className="h-8 text-[9px] uppercase font-bold text-slate-400 text-right pr-0">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoice.items.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-slate-100/50 hover:bg-transparent h-10">
                            <TableCell className="py-2 text-xs font-bold text-slate-700">{item.description}</TableCell>
                            <TableCell className="py-2 text-xs text-center text-slate-500">{item.quantity}</TableCell>
                            <TableCell className="py-2 text-xs text-right text-slate-500">${Number(item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell className="py-2 text-xs text-right font-black text-slate-900 pr-0">${Number(item.lineTotal).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function ReprintManager({ invoiceId, company, onComplete }: { invoiceId: number; company: any; onComplete: () => void }) {
    const { data: invoice, isLoading } = useInvoice(invoiceId);

    useEffect(() => {
        if (!isLoading && invoice) {
            // Give a moment for the component to settle in the DOM
            const timer = setTimeout(() => {
                window.print();
                onComplete();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, invoice, onComplete]);

    if (isLoading || !invoice) return null;

    return (
        <div id="reprint-container" className="hidden">
            <POSReceipt 
                invoice={invoice} 
                company={company} 
                customer={invoice.customer}
                items={invoice.items}
            />
        </div>
    );
}

export default function MySalesPage() {
    const { logout } = useAuth();
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: company } = useCompany(companyId);
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
    const [reprintId, setReprintId] = useState<number | null>(null);

    const { data: transactions, isLoading } = useQuery({
        queryKey: ["/api/pos/my-sales", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/pos/my-sales?companyId=${companyId}`);
            if (!res.ok) throw new Error("Failed to fetch sales");
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <PosLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PosLayout>
        );
    }

    return (
        <PosLayout>
            <div className="container mx-auto py-8">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/pos">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900">My Sales History</h1>
                        <p className="text-slate-500">Recent transactions processed by you</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button
                            variant="outline"
                            className="bg-white text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 h-11 px-6 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all"
                            onClick={() => logout()}
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Receipt No</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Date</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Customer</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Amount</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Method</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                                    <TableHead className="w-20 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions?.map((tx: any) => (
                                    <Fragment key={tx.id}>
                                        <TableRow 
                                            className={cn(
                                                "border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer",
                                                expandedInvoiceId === tx.id && "bg-slate-50/80"
                                            )}
                                            onClick={() => setExpandedInvoiceId(expandedInvoiceId === tx.id ? null : tx.id)}
                                        >
                                            <TableCell className="py-4 pl-6">
                                                {expandedInvoiceId === tx.id ? (
                                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-black text-slate-600">{tx.invoiceNumber}</TableCell>
                                            <TableCell className="text-sm font-bold text-slate-500">{format(new Date(tx.issueDate), "dd MMM HH:mm")}</TableCell>
                                            <TableCell className="text-sm font-bold text-slate-700">{tx.customerName || "Walk-in Guest"}</TableCell>
                                            <TableCell className="text-right font-black text-slate-900">${Number(tx.total).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black bg-white border-slate-200 text-slate-500">
                                                    {tx.paymentMethod}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {tx.syncedWithFdms ? (
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-lg px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">
                                                        Fiscalized
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none rounded-lg px-2 py-0.5 font-black text-[9px] uppercase tracking-widest">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setReprintId(tx.id);
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedInvoiceId === tx.id && (
                                            <TableRow className="bg-slate-50/80 border-none hover:bg-slate-50/80">
                                                <TableCell colSpan={8} className="py-0 px-6 pb-6 border-none">
                                                    <SaleItems invoiceId={tx.id} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                ))}
                                {transactions?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                                    <Receipt className="h-8 w-8 text-slate-200" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No transactions found</p>
                                                    <p className="text-xs text-slate-400 mt-1">Start processing sales in the POS to see them here.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Hidden Printing Components */}
            {reprintId && company && (
                <ReprintManager 
                    invoiceId={reprintId} 
                    company={company} 
                    onComplete={() => setReprintId(null)} 
                />
            )}

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                        height: 0;
                        overflow: hidden;
                    }
                    header, nav, footer, aside {
                      display: none !important;
                    }
                    #pos-receipt, #pos-receipt * {
                        visibility: visible;
                        height: auto;
                        overflow: visible;
                    }
                    #pos-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 79mm;
                        padding: 4mm;
                        margin: 0;
                        background: white;
                    }
                }
            `}</style>
        </PosLayout>
    );
}

