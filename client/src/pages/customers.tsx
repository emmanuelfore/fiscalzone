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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">Manage your client base</p>
        </div>
        <div className="flex gap-2">
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
            <Button disabled variant="outline">Select a Company First</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
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

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px] bg-white">
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
                <th className="data-table-header p-4">Contact</th>
                <th className="data-table-header p-4">Tax Details</th>
                <th className="data-table-header p-4">Type</th>
                <th className="data-table-header p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : paginatedCustomers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-slate-200 mb-4" />
                      <p>No customers found</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers?.map((c) => (
                <tr key={c.id} className={`data-table-row ${!c.isActive ? 'opacity-50 grayscale' : ''}`}>
                  <td className="data-table-cell font-medium text-slate-900">
                    <Link href={`/customers/${c.id}`}>
                      <span className="hover:text-primary hover:underline cursor-pointer transition-colors block">
                        {c.name}
                        {!c.isActive && <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded no-underline">Inactive</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="data-table-cell">
                    <div className="flex flex-col text-sm">
                      {c.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2 text-slate-600 mt-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </div>
                      )}
                      {!c.email && !c.phone && <span className="text-slate-400 italic">No contact info</span>}
                    </div>
                  </td>
                  <td className="data-table-cell">
                    <div className="text-sm">
                      {c.tin && <div>TIN: {c.tin}</div>}
                      {c.vatNumber && <div>VAT: {c.vatNumber}</div>}
                      {!c.tin && !c.vatNumber && <span className="text-slate-400 italic">—</span>}
                    </div>
                  </td>
                  <td className="data-table-cell capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.customerType === 'business' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.customerType}
                    </span>
                  </td>
                  <td className="data-table-cell text-right p-4">
                    <div className="flex justify-end gap-2">
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
                        <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
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
