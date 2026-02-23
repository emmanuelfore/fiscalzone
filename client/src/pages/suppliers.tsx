
import { Layout } from "@/components/layout";
import { useState } from "react";
import { useSuppliers, useUpdateSupplier } from "@/hooks/use-suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Phone, Mail, Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { CreateSupplierDialog } from "@/components/suppliers/create-supplier-dialog";
import { EditSupplierDialog } from "@/components/suppliers/edit-supplier-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 10;

export default function SuppliersPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: suppliers, isLoading } = useSuppliers(companyId);
    const updateSupplier = useUpdateSupplier();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter logic
    const filteredSuppliers = suppliers?.filter(s => {
        const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus =
            statusFilter === "all" ? true :
                statusFilter === "active" ? s.isActive :
                    statusFilter === "inactive" ? !s.isActive : true;

        return matchesSearch && matchesStatus;
    });

    // Pagination logic
    const totalPages = Math.ceil((filteredSuppliers?.length || 0) / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedSuppliers = filteredSuppliers?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Suppliers</h1>
                    <p className="text-slate-500 mt-1">Manage your vendor relationships</p>
                </div>
                <div className="flex gap-2">
                    {companyId > 0 ? (
                        <CreateSupplierDialog companyId={companyId} />
                    ) : (
                        <Button disabled variant="outline">Select a Company First</Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors duration-200" />
                    <Input
                        placeholder="Search suppliers..."
                        className="pl-9 bg-white border-slate-200/60 shadow-sm rounded-2xl focus-visible:ring-emerald-500/20 transition-all duration-200"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[130px] bg-white border-slate-200/60 shadow-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(searchTerm || statusFilter !== 'all') && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setCurrentPage(1);
                        }}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl"
                    >
                        Reset
                    </Button>
                )}
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <CardContent className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                <th className="p-6 font-bold text-slate-400">Supplier Name</th>
                                <th className="p-6 font-bold text-slate-400">Contact</th>
                                <th className="p-6 font-bold text-slate-400">Tax Details</th>
                                <th className="p-6 font-bold text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        <div className="flex items-center justify-center py-12">
                                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedSuppliers?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                                <Truck className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-900 mb-1">No suppliers found</p>
                                            <p className="text-sm text-slate-500">Try adding your first vendor.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedSuppliers?.map((s) => (
                                <tr key={s.id} className={`group hover:bg-slate-50/50 transition-colors duration-200 ${!s.isActive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                                    <td className="p-6 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${s.isActive ? 'bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-700 group-hover:text-emerald-600 transition-colors text-sm">
                                                    {s.name}
                                                </span>
                                                {s.contactPerson && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                                                        <User className="w-2.5 h-2.5" />
                                                        {s.contactPerson}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 align-middle">
                                        <div className="flex flex-col gap-1.5 text-sm">
                                            {s.email && (
                                                <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    {s.email}
                                                </div>
                                            )}
                                            {s.phone && (
                                                <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {s.phone}
                                                </div>
                                            )}
                                            {!s.email && !s.phone && <span className="text-slate-400 text-xs italic">No contact info</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 align-middle">
                                        <div className="text-sm text-slate-600 space-y-1">
                                            {s.tin && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">TIN</span>
                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-700">{s.tin}</span>
                                                </div>
                                            )}
                                            {s.vatNumber && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">VAT</span>
                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-700">{s.vatNumber}</span>
                                                </div>
                                            )}
                                            {!s.tin && !s.vatNumber && <span className="text-slate-400 italic text-xs">—</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right align-middle">
                                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <EditSupplierDialog supplier={s} />
                                            <DeleteButton
                                                title="Delete Supplier"
                                                description={`Are you sure you want to delete ${s.name}? This will mark them as inactive.`}
                                                onConfirm={async () => {
                                                    await updateSupplier.mutateAsync({
                                                        id: s.id,
                                                        data: { isActive: false }
                                                    });
                                                }}
                                                isDeleting={updateSupplier.isPending}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-emerald-600 transition-all disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-emerald-600 transition-all disabled:opacity-50"
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
