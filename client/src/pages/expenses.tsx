
import { Layout } from "@/components/layout";
import { useExpenses } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { ReceiptText, Search, ChevronLeft, ChevronRight, Calendar, DollarSign, Tag, User, FileDown } from "lucide-react";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { downloadExcel } from "@/lib/export-utils";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

export default function ExpensesPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: expenses, isLoading } = useExpenses(companyId);
    const { data: suppliers } = useSuppliers(companyId);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter logic
    const filteredExpenses = expenses?.filter(e => {
        const matchesSearch =
            e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.reference && e.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory =
            categoryFilter === "all" ? true : e.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Unique categories for filter
    const categories = Array.from(new Set(expenses?.map(e => e.category) || []));

    // Pagination logic
    const totalPages = Math.ceil((filteredExpenses?.length || 0) / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedExpenses = filteredExpenses?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const totalAmount = filteredExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    const handleExportExcel = () => {
        downloadExcel(`/api/reports/export/expenses/${companyId}`, `Expenses_Report_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Expenses</h1>
                    <p className="text-slate-500 mt-1">Track your business spending and overheads</p>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <Button 
                        variant="outline" 
                        className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-all font-bold text-xs gap-2"
                        onClick={handleExportExcel}
                    >
                        <FileDown className="w-4 h-4" />
                        Export
                    </Button>
                    {companyId > 0 ? (
                        <ExpenseDialog companyId={companyId} />
                    ) : (
                        <Button disabled variant="outline" className="flex-1 sm:flex-none">Select a Company First</Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-lg bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Expenses</p>
                                <h3 className="text-2xl font-black text-slate-900 font-display">${totalAmount.toFixed(2)}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-lg bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <ReceiptText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Count</p>
                                <h3 className="text-2xl font-black text-slate-900 font-display">{filteredExpenses?.length || 0}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 w-full sm:max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors duration-200" />
                    <Input
                        placeholder="Search expenses..."
                        className="pl-9 bg-white border-slate-200/60 shadow-sm rounded-2xl focus-visible:ring-amber-500/20 transition-all duration-200"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[160px] bg-white border-slate-200/60 shadow-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(searchTerm || categoryFilter !== 'all') && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchTerm("");
                            setCategoryFilter("all");
                            setCurrentPage(1);
                        }}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl"
                    >
                        Reset
                    </Button>
                )}
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                <th className="p-6 font-bold text-slate-400">Date & Desc</th>
                                <th className="hidden sm:table-cell p-6 font-bold text-slate-400">Category</th>
                                <th className="hidden lg:table-cell p-6 font-bold text-slate-400">Vendor</th>
                                <th className="hidden md:table-cell p-6 font-bold text-slate-400">Reference</th>
                                <th className="p-6 font-bold text-slate-400">Amount</th>
                                <th className="p-6 font-bold text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        <div className="flex items-center justify-center py-12">
                                            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedExpenses?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                                <ReceiptText className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-900 mb-1">No expenses found</p>
                                            <p className="text-sm text-slate-500">Record your first business expense to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedExpenses?.map((e) => {
                                const supplier = suppliers?.find(s => s.id === e.supplierId);
                                return (
                                    <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors duration-200">
                                        <td className="p-6 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-700 text-sm group-hover:text-amber-600 transition-colors">
                                                    {e.description}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(e.expenseDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell p-6 align-middle">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none rounded-lg py-1 px-3 flex items-center gap-1.5 w-fit font-bold text-[10px] uppercase">
                                                <Tag className="w-3 h-3" />
                                                {e.category}
                                            </Badge>
                                        </td>
                                        <td className="hidden lg:table-cell p-6 align-middle">
                                            {supplier ? (
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    {supplier.name}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">N/A</span>
                                            )}
                                        </td>
                                        <td className="hidden md:table-cell p-6 align-middle">
                                            <span className="text-sm font-mono text-slate-500">{e.reference || "—"}</span>
                                        </td>
                                        <td className="p-6 align-middle">
                                            <div className="flex flex-col items-start leading-tight">
                                                <span className="text-base font-black text-slate-900 font-display">${Number(e.amount).toFixed(2)}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.currency}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right align-middle">
                                            <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <ExpenseDialog expense={e} companyId={companyId} />
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
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-amber-600 transition-all disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-amber-600 transition-all disabled:opacity-50"
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
