import { PosLayout } from "@/components/pos-layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

export default function MySalesPage() {
    const { logout } = useAuth();
    const { data: transactions, isLoading } = useQuery({
        queryKey: ["/api/pos/my-sales"],
        queryFn: async () => {
            const res = await apiFetch("/api/pos/my-sales");
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
                    <div className="ml-auto">
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

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Receipt No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions?.map((tx: any) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-mono">{tx.invoiceNumber}</TableCell>
                                        <TableCell>{format(new Date(tx.issueDate), "dd MMM HH:mm")}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal capitalize">
                                                {tx.cashierName || "System"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{tx.customerName || "Guest"}</TableCell>
                                        <TableCell>{tx.items?.length || 0}</TableCell>
                                        <TableCell className="font-bold">${Number(tx.total).toFixed(2)}</TableCell>
                                        <TableCell className="uppercase text-[10px] font-medium text-slate-500">{tx.paymentMethod}</TableCell>
                                        <TableCell>
                                            <Badge variant={tx.syncedWithFdms ? "default" : "secondary"} className={tx.syncedWithFdms ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                                {tx.syncedWithFdms ? "Fiscalized" : "Pending"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transactions?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Receipt className="h-8 w-8 text-slate-300" />
                                                <p className="text-slate-500 font-medium">No sales found for the last 30 days</p>
                                                <p className="text-sm text-slate-400">Start processing transactions in the POS to see them here.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PosLayout>
    );
}
