import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useInvoices, useDeleteInvoice, useFiscalizeInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { useCreateRecurringInvoice } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Loader2, ShieldCheck, Send, MoreHorizontal, Copy, RefreshCw, Eye, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/delete-button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Filter,
  ClipboardList
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { SmartFixDialog } from "@/components/smart-fix-dialog";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";
import { useCurrencies } from "@/hooks/use-currencies";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/hooks/use-auth";

export default function InvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

  // State for Backend Filtering
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: result, isLoading } = useInvoices(selectedCompanyId, {
    page,
    limit: pageSize,
    search: searchTerm || undefined,
    status: statusFilter,
    type: typeFilter,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to

  });

  const { data: currencies } = useCurrencies(selectedCompanyId);
  const baseCurrency = currencies?.find(c => c.code === 'USD'); // Assuming USD base for now or first
  const currentSymbol = baseCurrency?.symbol || '$';

  // Fetch Stats Summary
  const { data: summary } = useQuery({
    queryKey: ["stats", "summary", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const res = await apiFetch(`/api/companies/${selectedCompanyId}/stats/summary`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!selectedCompanyId
  });

  const stats = {
    total: summary?.totalRevenue || 0,
    pending: summary?.pendingAmount || 0,
    overdue: summary?.overdueAmount || 0 // Hopeful matching
  };

  const invoices = result?.data;
  const totalPages = result?.pages || 0;
  const totalInvoices = result?.total || 0;

  const deleteInvoice = useDeleteInvoice();
  const fiscalize = useFiscalizeInvoice();
  const updateInvoice = useUpdateInvoice();
  const createRecurring = useCreateRecurringInvoice();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Reset page when filters change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setPage(1);
  };

  const handleIssue = async (invoice: any) => {
    try {
      setLoadingId(invoice.id);
      const invoiceNumber = invoice.invoiceNumber.startsWith('DRAFT')
        ? `INV-${Date.now().toString().slice(-6)}`
        : invoice.invoiceNumber;

      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: {
          status: "issued",
          invoiceNumber: invoiceNumber
        }
      });
      toast({
        title: "Invoice Issued",
        description: "Invoice has been issued successfully.",
      });
    } catch (error) {
      console.error("Failed to issue invoice:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleMakeRecurring = async (invoice: any) => {
    try {
      await createRecurring.mutateAsync({
        companyId: invoice.companyId,
        customerId: invoice.customerId,
        description: `Recurring bill for ${invoice.customer?.name || "Customer"}`,
        currency: invoice.currency,
        taxInclusive: invoice.taxInclusive,
        items: invoice.items,
        frequency: "monthly",
        startDate: new Date(),
        nextRunDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
        status: "active",
        autoSend: false,
        autoFiscalize: false
      });
    } catch (error) {
      console.error("Failed to make recurring:", error);
    }
  };

  const [smartError, setSmartError] = useState<any>(null);

  const handleFiscalize = async (id: number) => {
    setLoadingId(id);
    fiscalize.mutate(id, {
      onSettled: () => setLoadingId(null),
      onError: (err) => {
        // Check if it's a smart-fixable error
        const msg = err.message.toLowerCase();
        if (msg.includes("day closed") || msg.includes("offline") || msg.includes("certificate")) {
          setSmartError(err);
        } else {
          // Default toast behavior for other errors
          toast({
            title: "Fiscalization Failed",
            description: err.message,
            variant: "destructive"
          });
        }
      }
    });
  };

  return (
    <Layout>
      <SmartFixDialog
        isOpen={!!smartError}
        onClose={() => setSmartError(null)}
        error={smartError}
        onRetry={() => {
          setSmartError(null);
          // If they click retry, we don't have the ID here easily without state.
          // For simplicity, we just close. The user can click the button again.
        }}
      />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage and track your customer invoices</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quotations">
            <Button variant="outline" className="border-slate-200">
              <ClipboardList className="w-4 h-4 mr-2" />
              Quotations
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="card-depth border-none bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{currentSymbol}{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 mt-1">
              Across all issued invoices
            </p>
          </CardContent>
        </Card>
        <Card className="card-depth border-none bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Outstanding</p>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{currentSymbol}{stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Pending payments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-depth border-none overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice number or customer..."
                className="pl-9 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => handleFilterChange(setStatusFilter, val)}>
              <SelectTrigger className="w-full sm:w-[150px] border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Payment Pending</SelectItem>
                <SelectItem value="fiscalized">Fiscalized</SelectItem>
                <SelectItem value="pending-sync">Pending Sync</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(val) => handleFilterChange(setTypeFilter, val)}>
              <SelectTrigger className="w-full sm:w-[150px] border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FiscalInvoice">Invoices</SelectItem>
                <SelectItem value="CreditNote">Credit Notes</SelectItem>
                <SelectItem value="DebitNote">Debit Notes</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal border-slate-200 bg-slate-50",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Filter by Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => handleFilterChange(setDateRange, range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateRange) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDateRange(undefined);
                  setPage(1);
                }}
                className="text-slate-500"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[140px] px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Invoice #</TableHead>
                  <TableHead className="w-[120px] px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Type</TableHead>
                  <TableHead className="w-[180px] px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Reference</TableHead>
                  <TableHead className="w-[120px] px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Date</TableHead>
                  <TableHead className="px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Customer</TableHead>
                  <TableHead className="w-[140px] text-right px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Amount</TableHead>
                  <TableHead className="w-[100px] text-right px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Tax</TableHead>
                  <TableHead className="w-[120px] px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Status</TableHead>
                  <TableHead className="px-3 py-3 font-black text-slate-400 uppercase tracking-widest text-xs">Notes</TableHead>
                  <TableHead className="w-[60px] text-right px-3 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p>Loading invoices...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900">No invoices found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or create a new invoice</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices?.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="group cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, a, [role="menuitem"]')) return;
                      setLocation(`/invoices/${invoice.id}`);
                    }}
                  >
                    <TableCell className="px-3 py-2.5 font-bold font-mono text-slate-700">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {invoice.transactionType === 'CreditNote' ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">
                          Credit Note
                        </Badge>
                      ) : invoice.transactionType === 'DebitNote' ? (
                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">
                          Debit Note
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">
                          Invoice
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {invoice.relatedInvoiceId && (
                        <Link href={`/invoices/${invoice.relatedInvoiceId}`} className="text-xs text-primary hover:underline flex items-center group/link font-bold whitespace-nowrap">
                          <FileText className="w-3 h-3 mr-1 opacity-70 group-hover/link:opacity-100" />
                          Org #{invoice.relatedInvoiceId}
                        </Link>
                      )}
                      {invoice.transactionType === 'FiscalInvoice' && invoices?.some(inv => inv.relatedInvoiceId === invoice.id) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {invoices.filter(inv => inv.relatedInvoiceId === invoice.id).map(child => (
                            <Link key={child.id} href={`/invoices/${child.id}`} className="text-xs text-orange-600 hover:underline flex items-center group/link font-bold whitespace-nowrap bg-orange-50 px-1 rounded border border-orange-100">
                              <ShieldCheck className="w-3 h-3 mr-1 opacity-70 group-hover/link:opacity-100" />
                              {child.transactionType === 'CreditNote' ? 'CN' : 'DN'} #{child.id}
                            </Link>
                          ))}
                        </div>
                      )}
                      {!invoice.relatedInvoiceId && !invoices?.some(inv => inv.relatedInvoiceId === invoice.id) && (
                        <span className="text-slate-400 text-xs font-bold">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 px-3 py-2.5 font-medium text-xs whitespace-nowrap">
                      {invoice.issueDate ? format(new Date(invoice.issueDate), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 px-3 py-2.5 text-sm max-w-[200px] truncate">
                      {invoice.customer?.name || "Walk-in Customer"}
                    </TableCell>
                    <TableCell className="font-black text-slate-800 text-right px-3 py-2.5 tracking-tight whitespace-nowrap">
                      {invoice.currency} {Number(invoice.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-right px-3 py-2.5 font-bold text-xs whitespace-nowrap">
                      {Number(invoice.taxAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="flex flex-col gap-1 w-fit">
                        <StatusBadge status={invoice.status!} />

                        {invoice.fiscalCode && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0.5 h-auto font-bold gap-1 hover:bg-emerald-100 w-fit uppercase tracking-wider whitespace-nowrap">
                            <ShieldCheck className="w-3 h-3" /> Fiscalized
                          </Badge>
                        )}
                        {!invoice.syncedWithFdms && invoice.status === 'issued' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0.5 h-auto font-bold w-fit uppercase tracking-wider whitespace-nowrap">Pending Sync</Badge>
                        )}

                        {invoice.validationStatus && invoice.validationStatus !== 'valid' && (
                          <Badge variant="outline" className={cn(
                            "text-[10px] py-0.5 h-auto font-bold border-dashed w-fit uppercase tracking-wider whitespace-nowrap",
                            invoice.validationStatus === 'red' ? "text-red-700 bg-red-50 border-red-200" :
                              invoice.validationStatus === 'grey' ? "text-slate-600 bg-slate-100 border-slate-300" :
                                "text-yellow-700 bg-yellow-50 border-yellow-200"
                          )}>
                            {invoice.validationStatus === 'red' ? 'Critical Error' :
                              invoice.validationStatus === 'grey' ? 'Map Error' : 'Warning'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-[150px] truncate text-xs font-medium p-4 py-3" title={invoice.notes || ""}>
                      {invoice.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-3 p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice.id}`} className="w-full cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>

                          {invoice.status === 'draft' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/new?edit=${invoice.id}`} className="w-full cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Draft
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {invoice.status === 'issued' && !invoice.fiscalCode && (
                            <DropdownMenuItem
                              onClick={() => handleFiscalize(invoice.id)}
                              disabled={loadingId === invoice.id || fiscalize.isPending}
                            >
                              {loadingId === invoice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                              Fiscalize Now
                            </DropdownMenuItem>
                          )}

                          {invoice.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleIssue(invoice)}
                              disabled={loadingId === invoice.id}
                            >
                              <Send className="mr-2 h-4 w-4" /> Issue Invoice
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/new?duplicate=${invoice.id}`} className="w-full cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleMakeRecurring(invoice)}
                            className="cursor-pointer"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Make Recurring
                          </DropdownMenuItem>

                          {(invoice.status === 'draft' || user?.isSuperAdmin) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const confirmMsg = invoice.status === 'draft'
                                    ? "Are you sure you want to delete this draft?"
                                    : `WARNING: You are about to delete an ${invoice.status.toUpperCase()} invoice. This may cause accounting discrepancies. Continue?`;

                                  if (confirm(confirmMsg)) {
                                    await deleteInvoice.mutateAsync(invoice.id);
                                    toast({ title: "Invoice deleted" });
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete {invoice.status !== 'draft' && `(${invoice.status})`}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalInvoices)} of {totalInvoices} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[32px] text-sm font-medium">
                Page {page} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent >
      </Card >
    </Layout >
  );
}
