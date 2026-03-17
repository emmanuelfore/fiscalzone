import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;
import { useCustomers, useUpdateCustomer } from "@/hooks/use-customers";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Phone, Mail, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
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
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomersPage() {
  const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
  const { data: customers, isLoading } = useCustomers(companyId);
  const updateCustomer = useUpdateCustomer();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic
  const filteredCustomers = customers?.filter(c => {
    // 1. Search Term
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.customerType && c.customerType.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Status Filter
    const matchesStatus =
      statusFilter === "all" ? true :
        statusFilter === "active" ? c.isActive :
          statusFilter === "inactive" ? !c.isActive : true;

    // 3. Type Filter
    const matchesType =
      typeFilter === "all" ? true :
        c.customerType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil((filteredCustomers?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">Manage your client base</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <CsvImportDialog
            type="customer"
            companyId={companyId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["customers", companyId] });
            }}
          />
          {companyId > 0 ? (
            <CreateCustomerDialog companyId={companyId} />
          ) : (
            <Button disabled variant="outline" className="flex-1 sm:flex-none">Select a Company First</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 w-full sm:max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors duration-200" />
          <Input
            placeholder="Search customers..."
            className="pl-9 bg-white border-slate-200/60 shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all duration-200"
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

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200/60 shadow-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
              <SelectValue placeholder="Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTypeFilter("all");
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
                <th className="p-6 font-bold text-slate-400">Name</th>
                <th className="hidden md:table-cell p-6 font-bold text-slate-400">Contact</th>
                <th className="hidden lg:table-cell p-6 font-bold text-slate-400">Tax Details</th>
                <th className="hidden sm:table-cell p-6 font-bold text-slate-400">Type</th>
                <th className="p-6 font-bold text-slate-400 text-right">Actions</th>
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
              ) : paginatedCustomers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-lg font-medium text-slate-900 mb-1">No customers found</p>
                      <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers?.map((c) => (
                <tr key={c.id} className={`group hover:bg-slate-50/50 transition-colors duration-200 ${!c.isActive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="p-6 align-middle">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${c.isActive ? 'bg-gradient-to-br from-violet-100 to-indigo-50 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/customers/${c.id}`}>
                          <span className="font-bold text-slate-700 group-hover:text-primary transition-colors cursor-pointer text-sm">
                            {c.name}
                          </span>
                        </Link>
                        {!c.isActive && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Inactive</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6 align-middle">
                    <div className="flex flex-col gap-1.5 text-sm">
                      {c.email && (
                        <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone}
                        </div>
                      )}
                      {!c.email && !c.phone && <span className="text-slate-400 text-xs italic">No contact info</span>}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell p-6 align-middle">
                    <div className="text-sm text-slate-600 space-y-1">
                      {c.tin && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">TIN</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-700">{c.tin}</span>
                        </div>
                      )}
                      {c.vatNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">VAT</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-700">{c.vatNumber}</span>
                        </div>
                      )}
                      {!c.tin && !c.vatNumber && <span className="text-slate-400 italic text-xs">—</span>}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell p-6 align-middle">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${c.customerType === 'business'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                      {c.customerType === 'business' ? <Building2 className="w-3 h-3 mr-1.5" /> : <Users className="w-3 h-3 mr-1.5" />}
                      {c.customerType}
                    </span>
                  </td>
                  <td className="p-6 text-right align-middle">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <EditCustomerDialog customer={c} />
                      <DeleteButton
                        title="Delete Customer"
                        description={`Are you sure you want to delete ${c.name}? This will mark them as inactive.`}
                        onConfirm={async () => {
                          await updateCustomer.mutateAsync({
                            id: c.id,
                            data: { isActive: false }
                          });
                        }}
                        isDeleting={updateCustomer.isPending}
                      />
                      <Link href={`/customers/${c.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-violet-50 rounded-full transition-all">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    {/* Placeholder to keep row height when actions are hidden, or simply let it flow? 
                        Typically better to have opacity 0 but still take space to avoid layout shift. 
                        The flex container handles spacing. */}
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
                  className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-primary transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border-slate-200 shadow-sm hover:bg-white hover:text-primary transition-all disabled:opacity-50"
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
