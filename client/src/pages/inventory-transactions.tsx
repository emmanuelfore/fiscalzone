
import { Layout } from "@/components/layout";
import { useInventoryTransactions } from "@/hooks/use-inventory";
import { useProducts } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Search, ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, History, Package, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { GrnForm } from "@/components/inventory/grn-form";

const ITEMS_PER_PAGE = 15;

export default function InventoryTransactionsPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: transactions, isLoading } = useInventoryTransactions(companyId);
    const { data: products } = useProducts(companyId);
    const { data: suppliers } = useSuppliers(companyId);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter logic
    const filteredTransactions = transactions?.filter(t => {
        const product = products?.find(p => p.id === t.productId);
        const matchesSearch =
            product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.type.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    // Pagination logic
    const totalPages = Math.ceil((filteredTransactions?.length || 0) / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTransactions = filteredTransactions?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Stock Ledger</h1>
                    <p className="text-slate-500 mt-1">Full audit trail of all inventory movements</p>
                </div>
                <GrnForm />
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors duration-200" />
                    <Input
                        placeholder="Search transactions..."
                        className="pl-9 bg-white border-slate-200/60 shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all duration-200"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                <th className="p-6 font-bold text-slate-400">Date & Type</th>
                                <th className="p-6 font-bold text-slate-400">Product</th>
                                <th className="p-6 font-bold text-slate-400">Qty Change</th>
                                <th className="p-6 font-bold text-slate-400">Cost Focus</th>
                                <th className="p-6 font-bold text-slate-400">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        <div className="flex items-center justify-center py-12">
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedTransactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                                <History className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-900 mb-1">No transactions found</p>
                                            <p className="text-sm text-slate-500">Inventory history will appear here once you record sales or stock-ins.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedTransactions?.map((t) => {
                                const product = products?.find(p => p.id === t.productId);
                                const supplier = suppliers?.find(s => s.id === t.supplierId);
                                const isPositive = Number(t.quantity) > 0;

                                return (
                                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors duration-200">
                                        <td className="p-6 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {isPositive ? (
                                                        <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <ArrowUpRight className="w-4 h-4 text-blue-500" />
                                                    )}
                                                    <span className="font-bold text-slate-700 text-sm">
                                                        {t.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-6">
                                                    {new Date(t.createdAt!).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-slate-400" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-600 text-sm">{product?.name || "Unknown Product"}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono italic">{product?.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                {isPositive ? '+' : ''}{Number(t.quantity).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">${Number(t.unitCost || 0).toFixed(2)} / unit</span>
                                                <span className="text-[10px] text-slate-400">Total: ${Number(t.totalCost || 0).toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase tracking-widest bg-white">
                                                    {t.referenceType || 'Manual'}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-slate-500">{t.referenceId}</span>
                                                {supplier && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                        <User className="w-2.5 h-2.5" />
                                                        {supplier.name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-6 border-t border-slate-50 bg-slate-50/30">
                            <div className="text-xs text-slate-400 font-medium">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white transition-all disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white transition-all disabled:opacity-50"
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Layout>
    );
}
