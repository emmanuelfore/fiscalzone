
import { Layout } from "@/components/layout";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { StockInDialog } from "@/components/products/stock-in-dialog";
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
import { ManageCategoriesDialog } from "@/components/products/manage-categories-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;

export default function ProductsPage() {
  const { activeCompanyId } = useActiveCompany();
  const companyId = activeCompanyId || 0;
  const { data: allItems, isLoading } = useProducts(companyId);
  const updateProduct = useUpdateProduct();
  const { taxTypes } = useTaxConfig(companyId || undefined);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [taxFilter, setTaxFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter for products (goods)
  const products = allItems?.filter(item => item.productType !== 'service'); // Treat undefined/'good' as product

  // Filter by search term
  // Filter logic
  const filteredProducts = products?.filter(p => {
    // 1. Search Term
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Status Filter
    const matchesStatus =
      statusFilter === "all" ? true :
        statusFilter === "active" ? p.isActive :
          statusFilter === "inactive" ? !p.isActive : true;

    // 3. Stock Filter
    let matchesStock = true;
    if (stockFilter !== "all" && p.isTracked) {
      const stock = Number(p.stockLevel);
      const lowThreshold = Number(p.lowStockThreshold || 0);

      if (stockFilter === "in_stock") matchesStock = stock > lowThreshold;
      if (stockFilter === "low_stock") matchesStock = stock <= lowThreshold && stock > 0;
      if (stockFilter === "out_of_stock") matchesStock = stock <= 0;
    } else if (stockFilter !== "all" && !p.isTracked) {
      // Decide how to handle unlimited items when filtering by stock
      // Usually "In Stock" includes unlimited. Low/Out don't apply.
      if (stockFilter === "low_stock" || stockFilter === "out_of_stock") matchesStock = false;
    }

    // 4. Tax Filter
    // We compare strings or loose equality
    const matchesTax =
      taxFilter === "all" ? true :
        parseFloat(p.taxRate || "0") === parseFloat(taxFilter);

    return matchesSearch && matchesStatus && matchesStock && matchesTax;
  });

  // Pagination logic
  const totalPages = Math.ceil((filteredProducts?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1 font-medium">Inventory and goods</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <ManageCategoriesDialog companyId={companyId} />
          <CsvImportDialog
            type="product"
            companyId={companyId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["products", companyId] });
            }}
          />
          {companyId > 0 ? (
            <CreateProductDialog companyId={companyId} defaultType="good" triggerLabel="Add Product" />
          ) : (
            <Button disabled variant="outline" className="rounded-xl flex-1 sm:flex-none">Select a Company First</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 w-full sm:max-w-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
          <Input
            placeholder="Search products..."
            className="pl-12 h-12 rounded-xl border-slate-200 bg-white shadow-sm focus:ring-violet-500/20 focus:border-violet-500 font-medium transition-all"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px] h-12 rounded-xl bg-white border-slate-200 font-bold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl bg-white border-slate-200 font-bold">
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={taxFilter} onValueChange={(v) => { setTaxFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] h-12 rounded-xl bg-white border-slate-200 font-bold">
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

        {(searchTerm || statusFilter !== 'all' || stockFilter !== 'all' || taxFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setStockFilter("all");
              setTaxFilter("all");
              setCurrentPage(1);
            }}
            className="text-slate-500 font-medium hover:text-slate-900 h-12 px-4 rounded-xl"
          >
            Reset
          </Button>
        )}
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm rounded-[2rem] overflow-hidden ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left min-w-[600px] md:min-w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Name</th>
                <th className="hidden lg:table-cell p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Code</th>
                <th className="hidden xl:table-cell p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Details</th>
                <th className="hidden sm:table-cell p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Category</th>
                <th className="p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Price</th>
                <th className="p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Stock</th>
                <th className="hidden md:table-cell p-5 font-black text-slate-400 uppercase tracking-widest text-xs">Tax Type</th>
                <th className="p-5 font-black text-slate-400 uppercase tracking-widest text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                      Loading products...
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="font-bold text-lg">No products found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts?.map((p) => {
                // Match tax rate to a known tax type if possible
                // We use loose comparison for string/number match on rate
                const matchedType = taxTypes.data?.find((t: any) => {
                  if (p.taxTypeId) return t.id === p.taxTypeId;
                  // Fallback for legacy data
                  if (parseFloat(t.rate) === parseFloat(p.taxRate || "0")) {
                    if (parseFloat(p.taxRate || "0") === 0) {
                      const isExempt = p.name.toLowerCase().includes("exempt") || p.description?.toLowerCase().includes("exempt");
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
                  <tr key={p.id} className={`group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-default ${!p.isActive ? 'opacity-50 grayscale' : ''}`}>
                    <td className="p-4 font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-display tracking-tight text-sm">{p.name}</span>
                        {!p.isActive && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider w-fit mt-1">Inactive</span>}
                        {p.description && <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{p.description}</span>}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell p-4 font-mono text-xs font-bold text-slate-500">
                      {p.sku || "—"}
                    </td>
                    <td className="hidden xl:table-cell p-4">
                      <div className="flex flex-col gap-1">
                        {p.hsCode && <div className="text-[10px] font-bold text-slate-400 font-mono uppercase">HS: {p.hsCode}</div>}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell p-4">
                      {p.category ? (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                          {p.category}
                        </Badge>
                      ) : (
                        <span className="text-slate-300 text-xs font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4 font-black text-slate-800 tracking-tight">${Number(p.price).toFixed(2)}</td>
                    <td className="p-4">
                      {p.isTracked ? (
                        <div className="flex items-center gap-2">
                          <span className={`${Number(p.stockLevel) <= Number(p.lowStockThreshold || 0) ? "text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100" : "text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"} font-mono text-xs font-bold`}>
                            {p.stockLevel}
                          </span>
                          {Number(p.stockLevel) <= Number(p.lowStockThreshold || 0) && (
                            <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-400 font-bold uppercase tracking-wider">Unlimited</Badge>
                      )}
                    </td>
                    <td className="hidden md:table-cell p-4">
                      {matchedType ? (
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold text-[10px] uppercase tracking-wider shadow-sm">
                          {matchedType.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">{p.taxRate}%</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.isTracked && <StockInDialog product={p} companyId={companyId} />}
                        <EditProductDialog product={p} />
                        <DeleteButton
                          title="Delete Product"
                          description={`Are you sure you want to delete ${p.name}? This will remove it from active inventory.`}
                          onConfirm={async () => {
                            await updateProduct.mutateAsync({
                              id: p.id,
                              data: { isActive: false }
                            });
                          }}
                          isDeleting={updateProduct.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl h-9 text-xs font-bold border-slate-200"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl h-9 text-xs font-bold border-slate-200"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
