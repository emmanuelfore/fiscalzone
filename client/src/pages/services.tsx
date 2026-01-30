
import { Layout } from "@/components/layout";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, AlertCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;

export default function ServicesPage() {
    const { activeCompanyId } = useActiveCompany();
    const companyId = activeCompanyId || 0;
    const { data: allItems, isLoading } = useProducts(companyId);
    const updateProduct = useUpdateProduct();
    const { taxTypes } = useTaxConfig(companyId || undefined);
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [taxFilter, setTaxFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter for services
    const services = allItems?.filter(item => item.productType === 'service');

    // Filter by search term
    // Filter logic
    const filteredServices = services?.filter(s => {
        // 1. Search Term
        const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.sku && s.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Status Filter
        const matchesStatus =
            statusFilter === "all" ? true :
                statusFilter === "active" ? s.isActive :
                    statusFilter === "inactive" ? !s.isActive : true;

        // 3. Tax Filter
        const matchesTax =
            taxFilter === "all" ? true :
                parseFloat(s.taxRate || "0") === parseFloat(taxFilter);

        return matchesSearch && matchesStatus && matchesTax;
    });

    // Pagination logic
    const totalPages = Math.ceil((filteredServices?.length || 0) / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedServices = filteredServices?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Services</h1>
                    <p className="text-slate-500 mt-1">Manage service offerings</p>
                </div>
                <div className="flex gap-2">
                    <CsvImportDialog
                        type="service"
                        companyId={companyId}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["products", companyId] });
                        }}
                    />
                    <CreateProductDialog companyId={companyId} defaultType="service" triggerLabel="Add Service" />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search services..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[130px] bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={taxFilter} onValueChange={(v) => { setTaxFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue placeholder="Tax Class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Taxes</SelectItem>
                            {taxTypes.data?.map((t: any) => (
                                <SelectItem key={t.id} value={t.rate.toString()}>
                                    {t.name} ({t.rate}%)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(searchTerm || statusFilter !== 'all' || taxFilter !== 'all') && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setTaxFilter("all");
                            setCurrentPage(1);
                        }}
                        className="text-slate-500"
                    >
                        Reset
                    </Button>
                )}
            </div>

            <Card className="card-depth border-none overflow-hidden">
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="data-table-header p-4">Name</th>
                                <th className="data-table-header p-4">Code</th>
                                <th className="data-table-header p-4">Description</th>
                                <th className="data-table-header p-4">Rate/Price</th>
                                <th className="data-table-header p-4">Tax Type</th>
                                <th className="data-table-header p-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading services...</td>
                                </tr>
                            ) : paginatedServices?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Briefcase className="w-12 h-12 text-slate-200 mb-4" />
                                            <p>No services found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedServices?.map((s) => {
                                const matchedType = taxTypes.data?.find((t: any) => {
                                    if (s.taxTypeId) return t.id === s.taxTypeId;
                                    // Fallback for legacy data
                                    if (parseFloat(t.rate) === parseFloat(s.taxRate || "0")) {
                                        if (parseFloat(s.taxRate || "0") === 0) {
                                            const isExempt = s.name.toLowerCase().includes("exempt") || s.description?.toLowerCase().includes("exempt");
                                            if (isExempt) {
                                                const zimraTaxId = t.zimraTaxId?.toString();
                                                return zimraTaxId == "1" || t.zimraCode === 'C' || t.zimraCode === 'E' || t.name.toLowerCase().includes("exempt");
                                            }
                                            return t.zimraTaxId === "2" || t.name.toLowerCase().includes("zero");
                                        }
                                        return true;
                                    }
                                    return false;
                                });
                                return (
                                    <tr key={s.id} className={`data-table-row border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!s.isActive ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="data-table-cell p-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <span>{s.name}</span>
                                                {!s.isActive && <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Inactive</span>}
                                                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">Service</Badge>
                                            </div>
                                        </td>
                                        <td className="data-table-cell p-4 font-mono text-xs text-slate-600">
                                            {s.sku || "—"}
                                        </td>
                                        <td className="data-table-cell p-4 text-slate-600 max-w-xs truncate">
                                            {s.description || "—"}
                                        </td>
                                        <td className="data-table-cell p-4 font-medium">${Number(s.price).toFixed(2)}</td>
                                        <td className="data-table-cell p-4">
                                            {matchedType ? (
                                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal">
                                                    {matchedType.name} ({matchedType.rate}%)
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-500 text-sm">{s.taxRate}%</span>
                                            )}
                                        </td>
                                        <td className="data-table-cell p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <EditProductDialog product={s} />
                                                <DeleteButton
                                                    title="Delete Service"
                                                    description={`Are you sure you want to delete ${s.name}? This will mark it as inactive.`}
                                                    onConfirm={async () => {
                                                        await updateProduct.mutateAsync({
                                                            id: s.id,
                                                            data: { isActive: false }
                                                        });
                                                    }}
                                                    isDeleting={updateProduct.isPending}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end p-4 border-t border-slate-100 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="text-sm text-slate-500 px-2">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Layout>
    );
}
