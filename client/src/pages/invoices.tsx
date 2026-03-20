import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useInvoices, useInvoice, useDeleteInvoice, useFiscalizeInvoice, useUpdateInvoice, useCreateCreditNote, useCreateDebitNote, usePayments, useConvertQuotation } from "@/hooks/use-invoices";
import { useCreateRecurringInvoice } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Loader2, ShieldCheck, Send, MoreHorizontal, Copy, Eye, Edit, Trash2, User, Download, Share2, MessageCircle, Mail, CreditCard, Undo2, MoreVertical, Printer, ClipboardList, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, Filter, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { SmartFixDialog } from "@/components/smart-fix-dialog";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrencies } from "@/hooks/use-currencies";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { useCompany } from "@/hooks/use-companies";
import QRCode from "qrcode";
import { PaymentModal } from "@/components/invoices/payment-modal";
import { EmailInvoiceDialog } from "@/components/invoices/email-invoice-dialog";
import { PaymentReceipt } from "@/components/invoices/payment-receipt";
import { ValidationErrorsDisplay } from "@/components/invoices/validation-errors-display";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { pdf } from "@react-pdf/renderer";

// ── Preview panel (used by invoice-details split view) ──────────────────────
export function InvoicePreviewPanel({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: company } = useCompany(invoice?.companyId || 0);
  const { taxTypes } = useTaxConfig(invoice?.companyId || 0);
  const fiscalize = useFiscalizeInvoice();
  const { data: payments } = usePayments(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const createCreditNote = useCreateCreditNote();
  const createDebitNote = useCreateDebitNote();
  const { toast } = useToast();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);
  const [isFiscalizing, setIsFiscalizing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isCreatingCN, setIsCreatingCN] = useState(false);
  const [isCreatingDN, setIsCreatingDN] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const totalPaid = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const balanceDue = Math.max(0, Number(invoice?.total || 0) - totalPaid);
  const isPaid = balanceDue <= 0.01;

  useEffect(() => {
    if (invoice?.fiscalCode) {
      const dataToEncode = invoice?.qrCodeData || company?.qrUrl;
      if (dataToEncode) QRCode.toDataURL(dataToEncode).then(setQrCodeDataUrl).catch(console.error);
    } else {
      setQrCodeDataUrl("");
    }
  }, [invoice?.fiscalCode, invoice?.qrCodeData, company?.qrUrl]);

  const handleIssue = async () => {
    if (isIssuing || !invoice) return;
    setIsIssuing(true);
    try {
      const invoiceNumber = invoice.invoiceNumber.startsWith("DRAFT") ? `INV-${Date.now().toString().slice(-6)}` : invoice.invoiceNumber;
      await updateInvoice.mutateAsync({ id: invoiceId, data: { status: "issued", invoiceNumber } });
      toast({ title: "Invoice Issued" });
    } finally { setIsIssuing(false); }
  };

  const handleShareWhatsapp = async () => {
    if (!invoice || !company) return;
    const phoneParam = (invoice.customer?.phone || "").replace(/\D/g, "");
    const text = `Hello ${invoice.customer?.name || "Customer"},\n\nHere is your *Invoice ${invoice.invoiceNumber}* from *${company.tradingName || company.name}*.\n\nTotal: *${invoice.currency} ${Number(invoice.total).toFixed(2)}*`;
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} />).toBlob();
      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `Invoice ${invoice.invoiceNumber}`, text }); return; }
    } catch (e) { /* fallback */ }
    window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendEmail = async (email: string) => {
    if (!invoice || !company) return;
    setIsSendingEmail(true);
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} />).toBlob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const res = await apiFetch(`/api/invoices/${invoiceId}/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, pdfBase64: reader.result }) });
        if (!res.ok) throw new Error((await res.json()).message || "Failed");
        toast({ title: "Email Sent", description: `Sent to ${email}`, className: "bg-emerald-600 text-white" });
        setShowEmailDialog(false);
        setIsSendingEmail(false);
      };
    } catch (e: any) {
      toast({ title: "Email Failed", description: e.message, variant: "destructive" });
      setIsSendingEmail(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!invoice) return null;

  const isCreditNote = invoice.transactionType === "CreditNote";
  const canPreview = !invoice.fiscalCode || !!qrCodeDataUrl;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}><ArrowLeft className="w-3.5 h-3.5" /></Button>
          <span className="text-xs font-bold text-slate-800 truncate">{isCreditNote ? "Credit Note" : "Invoice"} {invoice.invoiceNumber}</span>
          <StatusBadge status={(invoice.fdmsStatus === "failed" || invoice.validationStatus === "red") ? "failed" : invoice.status!} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => setLocation(`/invoices/${invoiceId}`)}>
            <Eye className="w-3 h-3" /> Full View
          </Button>
          {["issued", "paid"].includes(invoice.status || "") && !invoice.fiscalCode && (
            <Button size="sm" className={cn("h-7 px-2 text-[11px] gap-1 text-white", invoice.fdmsStatus === "failed" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => { if (isFiscalizing) return; setIsFiscalizing(true); fiscalize.mutate(invoiceId, { onSettled: () => setIsFiscalizing(false) }); }}
              disabled={fiscalize.isPending || isFiscalizing}>
              {isFiscalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Fiscalize
            </Button>
          )}
          {!isPaid && ["issued", "fiscalized"].includes(invoice.status || "") && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1 bg-blue-50 text-blue-700 border-blue-200" onClick={() => setShowPaymentModal(true)}>
              <CreditCard className="w-3 h-3" /> Pay
            </Button>
          )}
          {invoice.status === "draft" && (
            <Button size="sm" className="h-7 px-2 text-[11px] gap-1 bg-primary hover:bg-primary/90" onClick={handleIssue} disabled={isIssuing}>
              {isIssuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Issue
            </Button>
          )}
          {["issued", "paid", "fiscalized"].includes(invoice.status || "") && canPreview && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1"><Share2 className="w-3 h-3" /> Share</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShareWhatsapp}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEmailDialog(true)}><Mail className="w-4 h-4 mr-2" /> Email</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <PDFDownloadLink document={<InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} taxTypes={taxTypes.data} />} fileName={`${isCreditNote ? "CreditNote" : "Invoice"}-${invoice.invoiceNumber}.pdf`}>
                {({ loading }) => (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1" disabled={loading}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download
                  </Button>
                )}
              </PDFDownloadLink>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="w-3.5 h-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {invoice.status === "draft" && <DropdownMenuItem onClick={() => setLocation(`/invoices/new?edit=${invoiceId}`)}>Edit Draft</DropdownMenuItem>}
              {["issued", "paid", "fiscalized"].includes(invoice.status || "") && (
                <>
                  <DropdownMenuItem onClick={() => { setIsCreatingCN(true); createCreditNote.mutateAsync(invoiceId).then(n => setLocation(`/invoices/new?edit=${n.id}`)).finally(() => setIsCreatingCN(false)); }} disabled={isCreatingCN}>
                    <Undo2 className="w-4 h-4 mr-2" /> Issue Credit Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setIsCreatingDN(true); createDebitNote.mutateAsync(invoiceId).then(n => setLocation(`/invoices/new?edit=${n.id}`)).finally(() => setIsCreatingDN(false)); }} disabled={isCreatingDN}>
                    <Send className="w-4 h-4 mr-2" /> Issue Debit Note
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(invoice as any)?.validationErrors?.length > 0 && (
        <div className="px-4 pt-2 shrink-0"><ValidationErrorsDisplay errors={(invoice as any).validationErrors} /></div>
      )}

      <div className="flex-1 bg-slate-100 overflow-hidden">
        {canPreview ? (
          <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
            <InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} taxTypes={taxTypes.data} />
          </PDFViewer>
        ) : (
          <div className="flex items-center justify-center h-full gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Generating preview...
          </div>
        )}
      </div>

      <PaymentModal invoice={invoice} remainingBalance={balanceDue} open={showPaymentModal} onOpenChange={setShowPaymentModal} />
      <EmailInvoiceDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} defaultEmail={invoice.customer?.email ?? undefined} onSend={handleSendEmail} isSending={isSendingEmail} />
      {receiptPayment && (
        <PaymentReceipt open={!!receiptPayment} onClose={() => setReceiptPayment(null)}
          payment={{ amount: receiptPayment.amount, paymentMethod: receiptPayment.paymentMethod, reference: receiptPayment.reference, notes: receiptPayment.notes, currency: receiptPayment.currency || invoice.currency, createdAt: receiptPayment.paymentDate }}
          invoice={invoice} company={company} customer={invoice.customer} />
      )}
    </div>
  );
}

// ── Main invoices page ───────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: result, isLoading } = useInvoices(selectedCompanyId, {
    page, limit: pageSize,
    search: searchTerm || undefined,
    status: statusFilter, type: typeFilter,
    dateFrom: dateRange?.from, dateTo: dateRange?.to,
  });

  const { data: currencies } = useCurrencies(selectedCompanyId);
  const currentSymbol = currencies?.find((c: any) => c.code === "USD")?.symbol || "$";

  const { data: summary } = useQuery({
    queryKey: ["stats", "summary", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const res = await apiFetch(`/api/companies/${selectedCompanyId}/stats/summary`);
      return res.ok ? res.json() : null;
    },
    enabled: !!selectedCompanyId,
  });

  const stats = { total: summary?.totalRevenue || 0, pending: summary?.pendingAmount || 0, overdue: summary?.overdueAmount || 0 };
  const invoices = result?.data;
  const totalPages = result?.pages || 0;
  const totalInvoices = result?.total || 0;

  const deleteInvoice = useDeleteInvoice();
  const fiscalize = useFiscalizeInvoice();
  const updateInvoice = useUpdateInvoice();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [smartError, setSmartError] = useState<any>(null);

  const handleFilterChange = (setter: any, value: any) => { setter(value); setPage(1); };

  const handleIssue = async (invoice: any) => {
    setLoadingId(invoice.id);
    try {
      const invoiceNumber = invoice.invoiceNumber.startsWith("DRAFT") ? `INV-${Date.now().toString().slice(-6)}` : invoice.invoiceNumber;
      await updateInvoice.mutateAsync({ id: invoice.id, data: { status: "issued", invoiceNumber } });
      toast({ title: "Invoice Issued" });
    } finally { setLoadingId(null); }
  };

  const handleFiscalize = (id: number) => {
    setLoadingId(id);
    fiscalize.mutate(id, {
      onSettled: () => setLoadingId(null),
      onError: (err) => {
        const msg = err.message.toLowerCase();
        if (msg.includes("day closed") || msg.includes("offline") || msg.includes("certificate")) setSmartError(err);
        else toast({ title: "Fiscalization Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Layout>
      <SmartFixDialog isOpen={!!smartError} onClose={() => setSmartError(null)} error={smartError} onRetry={() => setSmartError(null)} />

      {/* Page header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Invoices</h1>
          <p className="text-slate-500 mt-0.5 text-sm font-medium italic">Manage and track your customer billing cycle</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quotations">
            <Button variant="outline" className="border-slate-200 rounded-xl h-10">
              <ClipboardList className="w-4 h-4 mr-2" /> Quotations
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="btn-gradient rounded-xl px-5 h-10">
              <Plus className="w-4 h-4 mr-2" /> Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Revenue", value: stats.total, icon: TrendingUp, color: "emerald" },
          { label: "Outstanding", value: stats.pending, icon: Clock, color: "amber" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "rose" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass-card border-none overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
                <div className={`w-9 h-9 rounded-xl bg-${color}-50 flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 text-${color}-600`} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-display">
                <span className="text-sm font-bold text-slate-400 mr-1">{currentSymbol}</span>
                {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Table */}
      <Card className="glass-card border-none overflow-hidden">
        <CardContent className="p-0">
          {/* Filter bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search invoices..." className="pl-9 h-10 border-slate-200 rounded-xl" value={searchTerm} onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="w-[150px] h-10 border-slate-200 rounded-xl">
                <div className="flex items-center gap-2"><Filter className="w-3.5 h-3.5 text-slate-400" /><SelectValue placeholder="Status" /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="fiscalized">Fiscalized</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
              <SelectTrigger className="w-[150px] h-10 border-slate-200 rounded-xl">
                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-slate-400" /><SelectValue placeholder="Type" /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FiscalInvoice">Invoices</SelectItem>
                <SelectItem value="CreditNote">Credit Notes</SelectItem>
                <SelectItem value="DebitNote">Debit Notes</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 text-sm justify-start border-slate-200 rounded-xl font-medium min-w-[180px]", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd MMM")} – ${format(dateRange.to, "dd MMM")}` : format(dateRange.from, "dd MMM yyyy")) : "Date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(r) => handleFilterChange(setDateRange, r)} numberOfMonths={2} className="p-3" />
              </PopoverContent>
            </Popover>
            {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || dateRange) && (
              <Button variant="ghost" size="sm" className="h-10 px-4 text-slate-500 hover:text-red-500 rounded-xl"
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setTypeFilter("all"); setDateRange(undefined); setPage(1); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : invoices?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <FileText className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-bold">No invoices found</p>
              <Link href="/invoices/new"><Button variant="link" className="text-primary text-sm">Create your first invoice</Button></Link>
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3 pl-6">Invoice #</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3">Type</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3">Reference</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3">Date</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3">Customer</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3 text-right">Tax</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3">Status</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-slate-400 py-3 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices!.map((invoice: any) => {
                    const hasError = invoice.fdmsStatus?.toLowerCase() === "failed" || invoice.validationStatus === "red";
                    const isCN = invoice.transactionType === "CreditNote";
                    const isDN = invoice.transactionType === "DebitNote";
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors group"
                        onClick={() => setLocation(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="py-3 pl-6">
                          <div className="flex items-center gap-2">
                            {hasError && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs text-xs">
                                  {invoice.validationStatus === "red" ? "ZIMRA validation error — must resolve before closing fiscal day" : "Fiscalization failed"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="text-sm font-black font-mono text-primary">{invoice.invoiceNumber}</span>
                            {invoice.fiscalCode && (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Fiscal</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {isCN ? <Badge className="bg-orange-100 text-orange-600 border-none text-xs">Credit Note</Badge>
                            : isDN ? <Badge className="bg-blue-100 text-blue-600 border-none text-xs">Debit Note</Badge>
                            : <span className="text-xs text-slate-400">Invoice</span>}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-500 max-w-[120px] truncate">
                          {invoice.reference || <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-500 whitespace-nowrap">
                          {invoice.issueDate ? format(new Date(invoice.issueDate), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="py-3">
                          {invoice.customerId ? (
                            <Link href={`/customers/${invoice.customerId}`} onClick={(e) => e.stopPropagation()}>
                              <span className="text-sm font-medium text-slate-700 hover:text-primary">{invoice.customer?.name || "Unknown"}</span>
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">{invoice.customer?.name || "Walk-in"}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm text-slate-500 whitespace-nowrap">
                          {invoice.currency} {Number(invoice.taxAmount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-3">
                          <StatusBadge status={hasError ? "failed" : invoice.status!} />
                        </TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/${invoice.id}`); }} className="text-xs rounded-lg">
                                <Eye className="h-3.5 w-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              {invoice.status === "draft" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/new?edit=${invoice.id}`); }} className="text-xs rounded-lg">
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Draft
                                </DropdownMenuItem>
                              )}
                              {invoice.status === "draft" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleIssue(invoice); }} className="text-xs rounded-lg text-primary" disabled={loadingId === invoice.id}>
                                  {loadingId === invoice.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />} Issue
                                </DropdownMenuItem>
                              )}
                              {invoice.status === "issued" && !invoice.fiscalCode && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleFiscalize(invoice.id); }} className="text-xs rounded-lg text-emerald-700" disabled={loadingId === invoice.id}>
                                  {loadingId === invoice.id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-2" />} Fiscalize
                                </DropdownMenuItem>
                              )}
                              {invoice.customerId && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/customers/${invoice.customerId}`); }} className="text-xs rounded-lg">
                                  <User className="h-3.5 w-3.5 mr-2" /> Customer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/new?duplicate=${invoice.id}`); }} className="text-xs rounded-lg">
                                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              {["draft", "issued"].includes(invoice.status || "") && (
                                <DropdownMenuItem className="text-xs rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50"
                                  onClick={async (e) => { e.stopPropagation(); if (confirm("Delete this invoice?")) { await deleteInvoice.mutateAsync(invoice.id); toast({ title: "Invoice deleted" }); } }}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}

          {/* Pagination */}
          {!isLoading && invoices && invoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalInvoices)} of {totalInvoices} invoices
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>Previous</Button>
                <span className="text-sm font-bold text-slate-500 px-2">{page} / {totalPages || 1}</span>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
