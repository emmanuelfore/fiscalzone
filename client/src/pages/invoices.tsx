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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-6 pt-2">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">Invoices</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and track your customer billing cycle</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link href="/quotations">
            <Button variant="outline" className="border-slate-200 rounded-xl hover:bg-slate-50 flex-1 sm:flex-none h-11">
              <ClipboardList className="w-4 h-4 mr-2" />
              Quotations
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="btn-gradient rounded-xl px-6 flex-1 sm:flex-none h-11">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-display tracking-tight flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">{currentSymbol}</span>
              {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
              Across all issued invoices
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outstanding</p>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-display tracking-tight flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">{currentSymbol}</span>
              {stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-600/70 mt-2 font-bold uppercase tracking-wider">
              Pending payments
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-none overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overdue</p>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-display tracking-tight flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">{currentSymbol}</span>
              {stats.overdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-rose-600/70 mt-2 font-bold uppercase tracking-wider">
              Critical attention needed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-none overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-100 bg-white/50">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice number or customer..."
                className="pl-9 h-11 border-slate-200 bg-white/80 rounded-xl focus:ring-primary/20 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => handleFilterChange(setStatusFilter, val)}>
                <SelectTrigger className="w-[160px] h-11 border-slate-200 bg-white/80 rounded-xl font-medium">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
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
                <SelectTrigger className="w-[160px] h-11 border-slate-200 bg-white/80 rounded-xl font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder="All Types" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
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
                      "w-auto sm:w-[260px] h-11 justify-start text-left font-medium border-slate-200 bg-white/80 rounded-xl",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
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
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => handleFilterChange(setDateRange, range)}
                    numberOfMonths={2}
                    className="p-3"
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
                  className="h-11 px-4 text-slate-500 font-bold hover:text-red-500 transition-colors"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[140px] h-12 px-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Invoice #</TableHead>
                  <TableHead className="w-[120px] h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Type</TableHead>
                  <TableHead className="w-[180px] h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Reference</TableHead>
                  <TableHead className="w-[120px] h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Date</TableHead>
                  <TableHead className="h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Customer</TableHead>
                  <TableHead className="w-[140px] text-right h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Amount</TableHead>
                  <TableHead className="w-[100px] text-right h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Tax</TableHead>
                  <TableHead className="w-[140px] h-12 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Status</TableHead>
                  <TableHead className="w-[60px] text-right h-12 px-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="relative">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                        </div>
                        <p className="font-display font-bold uppercase tracking-widest text-[10px]">Encrypting Data Streams...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center px-6">
                      <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:rotate-12">
                          <FileText className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="font-display font-black text-slate-900 uppercase tracking-tight text-lg">No Invoices Detected</p>
                        <p className="text-sm mt-1 font-medium">Initialize your first transaction to begin</p>
                        <Link href="/invoices/new">
                          <Button variant="link" className="text-primary font-bold mt-2">Create New Invoice</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices?.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="group cursor-pointer hover:bg-slate-50 transition-all duration-200 border-none"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, a, [role="menuitem"]')) return;
                      setLocation(`/invoices/${invoice.id}`);
                    }}
                  >
                    <TableCell className="px-6 py-4 font-black font-mono text-xs text-primary group-hover:translate-x-1 transition-transform">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {invoice.transactionType === 'CreditNote' ? (
                        <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none font-black whitespace-nowrap text-[9px] uppercase tracking-wider px-2 py-0.5">
                          Credit Note
                        </Badge>
                      ) : invoice.transactionType === 'DebitNote' ? (
                        <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-none font-black whitespace-nowrap text-[9px] uppercase tracking-wider px-2 py-0.5">
                          Debit Note
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none font-black whitespace-nowrap text-[9px] uppercase tracking-wider px-2 py-0.5">
                          Invoice
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {invoice.relatedInvoiceId && (
                        <Link href={`/invoices/${invoice.relatedInvoiceId}`} className="text-[10px] text-slate-400 hover:text-primary transition-colors flex items-center font-bold whitespace-nowrap">
                          <FileText className="w-3 h-3 mr-1 opacity-50" />
                          Org #{invoice.relatedInvoiceId}
                        </Link>
                      )}
                      {!invoice.relatedInvoiceId && (
                        <span className="text-slate-200 text-xs font-bold">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 px-4 py-4 font-bold text-[10px] whitespace-nowrap uppercase">
                      {invoice.issueDate ? format(new Date(invoice.issueDate), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-black text-slate-900 px-4 py-4 text-xs max-w-[180px] truncate uppercase tracking-tight">
                      {invoice.customer?.name || "Walk-in Customer"}
                    </TableCell>
                    <TableCell className="font-black text-slate-900 text-right px-4 py-4 tracking-tighter text-sm whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 mr-1">{invoice.currency}</span>
                      {Number(invoice.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-right px-4 py-4 font-bold text-[10px] whitespace-nowrap">
                      {Number(invoice.taxAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 w-fit">
                        <StatusBadge status={invoice.status!} />
                        {invoice.fiscalCode && (
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                            <ShieldCheck className="w-2.5 h-2.5" /> Fiscalized
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white hover:shadow-sm rounded-lg group/btn transition-all">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-slate-300 group-hover/btn:text-primary" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-slate-100 shadow-2xl p-2">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/invoices/${invoice.id}`)} className="rounded-lg font-bold text-xs space-x-2 cursor-pointer">
                            <Eye className="h-4 w-4 text-slate-400" /> <span>View Details</span>
                          </DropdownMenuItem>

                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => setLocation(`/invoices/new?edit=${invoice.id}`)} className="rounded-lg font-bold text-xs space-x-2 cursor-pointer">
                              <Edit className="h-4 w-4 text-slate-400" /> <span>Edit Draft</span>
                            </DropdownMenuItem>
                          )}

                          {invoice.status === 'issued' && !invoice.fiscalCode && (
                            <DropdownMenuItem
                              onClick={() => handleFiscalize(invoice.id)}
                              disabled={loadingId === invoice.id || fiscalize.isPending}
                              className="rounded-lg font-bold text-xs space-x-2 cursor-pointer text-primary"
                            >
                              {loadingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              <span>Fiscalize Now</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="bg-slate-50" />

                          <DropdownMenuItem onClick={() => setLocation(`/invoices/new?duplicate=${invoice.id}`)} className="rounded-lg font-bold text-xs space-x-2 cursor-pointer">
                            <Copy className="h-4 w-4 text-slate-400" /> <span>Duplicate</span>
                          </DropdownMenuItem>

                          {(invoice.status === 'draft' || user?.isSuperAdmin) && (
                            <DropdownMenuItem
                              className="rounded-lg font-bold text-xs space-x-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                              onClick={async (e) => {
                                e.preventDefault();
                                if (confirm("Proceed with deletion? This action cannot be undone.")) {
                                  await deleteInvoice.mutateAsync(invoice.id);
                                  toast({ title: "Invoice deleted" });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> <span>Delete</span>
                            </DropdownMenuItem>
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
          <div className="flex items-center justify-between px-6 py-6 border-t border-slate-50 bg-slate-50/30">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalInvoices)} of {totalInvoices} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-9 px-4 rounded-xl font-bold text-xs border-slate-200"
              >
                Previous
              </Button>
              <div className="px-4 flex items-center justify-center min-w-[32px] text-xs font-black font-display">
                {page} / {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="h-9 px-4 rounded-xl font-bold text-xs border-slate-200"
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
