import { Layout } from "@/components/layout";
import { useInvoices, useDeleteInvoice } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Plus, Search, ClipboardList } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function QuotationsPage() {
    const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: allInvoices, isLoading } = useInvoices(selectedCompanyId);
    const deleteInvoice = useDeleteInvoice();
    const [searchTerm, setSearchTerm] = useState("");

    // Filter for quotations only
    const quotations = allInvoices?.filter(inv => inv.status === "quote");

    const filteredQuotations = quotations?.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.total.toString().includes(searchTerm)
    );

    return (
        <Layout>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Quotations</h1>
                    <p className="text-slate-500 mt-1">Manage and track your customer quotations</p>
                </div>
                <Link href="/invoices/new?type=quote">
                    <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Quotation
                    </Button>
                </Link>
            </div>

            <Card className="card-depth border-none overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by quote number..."
                            className="pl-9 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="data-table-header">Quote #</th>
                                    <th className="data-table-header">Date</th>
                                    <th className="data-table-header">Amount</th>
                                    <th className="data-table-header">Tax</th>
                                    <th className="data-table-header">Status</th>
                                    <th className="data-table-header text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">Loading quotations...</td>
                                    </tr>
                                ) : filteredQuotations?.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <ClipboardList className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <p className="font-medium">No quotations found</p>
                                                <p className="text-xs mt-1">Create your first quotation to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredQuotations?.map((quote) => (
                                    <tr key={quote.id} className="data-table-row group">
                                        <td className="data-table-cell font-medium font-mono text-slate-700">
                                            {quote.invoiceNumber}
                                        </td>
                                        <td className="data-table-cell">
                                            {new Date(quote.issueDate!).toLocaleDateString()}
                                        </td>
                                        <td className="data-table-cell font-semibold text-slate-900">
                                            ${Number(quote.total).toFixed(2)}
                                        </td>
                                        <td className="data-table-cell text-slate-500">
                                            ${Number(quote.taxAmount).toFixed(2)}
                                        </td>
                                        <td className="data-table-cell">
                                            <StatusBadge status={quote.status!} />
                                        </td>
                                        <td className="data-table-cell text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/invoices/${quote.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                                <DeleteButton
                                                    title="Delete Quotation"
                                                    description="Are you sure you want to delete this quotation? This action cannot be undone."
                                                    onConfirm={async () => {
                                                        await deleteInvoice.mutateAsync(quote.id);
                                                    }}
                                                    isDeleting={deleteInvoice.isPending}
                                                />
                                            </div>
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
