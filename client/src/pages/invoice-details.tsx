import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useInvoices, useInvoice, useDeleteInvoice, useFiscalizeInvoice, useUpdateInvoice, useCreateCreditNote, useCreateDebitNote, usePayments, useConvertQuotation } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Link, useLocation, useRoute } from "wouter";
import { PaymentReceipt } from "@/components/invoices/payment-receipt";
import { ArrowLeft, Printer, Send, ShieldCheck, Loader2, Download, Undo2, ClipboardList, MessageCircle, MoreVertical, Mail, Share2, CreditCard, Search, FileText, Filter, MoreHorizontal, Eye, Edit, Trash2, User, Copy, AlertCircle } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { useCompany } from "@/hooks/use-companies";
import QRCode from "qrcode";
import { useState, useEffect } from "react";
import { PaymentModal } from "@/components/invoices/payment-modal";
import { EmailInvoiceDialog } from "@/components/invoices/email-invoice-dialog";
import { pdf } from "@react-pdf/renderer";
import { apiFetch } from "@/lib/api";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { useToast } from "@/hooks/use-toast";
import { ValidationErrorsDisplay } from "@/components/invoices/validation-errors-display";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/use-auth";

export default function InvoiceDetailsPage() {
  const { user } = useAuth();
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const invoiceId = parseInt(params?.id || "0");

  // ── List panel state ──────────────────────────────────────────────────────
  const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: listResult, isLoading: listLoading } = useInvoices(selectedCompanyId, {
    page, limit: pageSize,
    search: searchTerm || undefined,
    status: statusFilter,
    dateFrom: dateRange?.from, dateTo: dateRange?.to,
  });
  const listInvoices = listResult?.data;
  const totalPages = listResult?.pages || 0;
  const totalInvoices = listResult?.total || 0;
  const deleteInvoice = useDeleteInvoice();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // ── Selected invoice (right pane) ─────────────────────────────────────────
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: company } = useCompany(invoice?.companyId || 0);
  const { taxTypes } = useTaxConfig(invoice?.companyId || 0);
  const fiscalize = useFiscalizeInvoice();
  const { data: payments } = usePayments(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const createCreditNote = useCreateCreditNote();
  const createDebitNote = useCreateDebitNote();
  const convertQuotation = useConvertQuotation();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);
  const [isFiscalizing, setIsFiscalizing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isCreatingCN, setIsCreatingCN] = useState(false);
  const [isCreatingDN, setIsCreatingDN] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

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

  // Generate PDF blob URL for the viewer (no internal scroll)
  useEffect(() => {
    if (!invoice || !canPreview) { setPdfBlobUrl(null); return; }
    let revoked = false;
    setPdfGenerating(true);
    pdf(<InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} taxTypes={taxTypes.data} />)
      .toBlob()
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      })
      .catch(console.error)
      .finally(() => { if (!revoked) setPdfGenerating(false); });
    return () => { revoked = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.status, invoice?.fiscalCode, qrCodeDataUrl, company?.id]);

  const handleIssue = async () => {
    if (isIssuing || !invoice) return;
    setIsIssuing(true);
    try {
      const invoiceNumber = invoice.invoiceNumber.startsWith("DRAFT") ? `INV-${Date.now().toString().slice(-6)}` : invoice.invoiceNumber;
      await updateInvoice.mutateAsync({ id: invoiceId, data: { status: "issued", invoiceNumber } });
      toast({ title: "Invoice Issued" });
    } finally { setIsIssuing(false); }
  };

  const handleCreateCreditNote = async () => {
    if (!invoice || isCreatingCN) return;
    setIsCreatingCN(true);
    try { const n = await createCreditNote.mutateAsync(invoiceId); setLocation(`/invoices/new?edit=${n.id}`); }
    finally { setIsCreatingCN(false); }
  };

  const handleCreateDebitNote = async () => {
    if (!invoice || isCreatingDN) return;
    setIsCreatingDN(true);
    try { const n = await createDebitNote.mutateAsync(invoiceId); setLocation(`/invoices/new?edit=${n.id}`); }
    finally { setIsCreatingDN(false); }
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
        setShowEmailDialog(false); setIsSendingEmail(false);
      };
    } catch (e: any) { toast({ title: "Email Failed", description: e.message, variant: "destructive" }); setIsSendingEmail(false); }
  };

  const isCreditNote = invoice?.transactionType === "CreditNote";
  const canPreview = !invoice?.fiscalCode || !!qrCodeDataUrl;

  return (
    <Layout>
      {/* Split panel */}
      <div className="flex -mx-4 sm:-mx-8 -mt-6">

        {/* ── LEFT: invoice list ── */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Invoices</span>
            <Button size="sm" className="h-7 px-2.5 text-xs btn-gradient rounded-lg" onClick={() => setLocation("/invoices/new")}>+ New</Button>
          </div>

          {/* Filters */}
          <div className="px-3 py-2 border-b border-slate-100 shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="Search..." className="pl-8 h-8 text-xs border-slate-200 rounded-lg" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 rounded-lg">
                  <div className="flex items-center gap-1.5"><Filter className="w-3 h-3 text-slate-400" /><SelectValue placeholder="Status" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="fiscalized">Fiscalized</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 px-2 text-xs border-slate-200 rounded-lg", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(r) => { setDateRange(r); setPage(1); }} numberOfMonths={1} className="p-3" />
                </PopoverContent>
              </Popover>
              {(searchTerm || statusFilter !== "all" || dateRange) && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-red-400" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setDateRange(undefined); setPage(1); }}>✕</Button>
              )}
            </div>
          </div>

          {/* Invoice rows */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : listInvoices?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                <FileText className="w-7 h-7 text-slate-200" />
                <p className="text-xs font-bold">No invoices found</p>
              </div>
            ) : (
              <TooltipProvider>
                {listInvoices!.map((inv: any) => {
                  const hasError = inv.fdmsStatus?.toLowerCase() === "failed" || inv.validationStatus === "red";
                  const isCN = inv.transactionType === "CreditNote";
                  const isDN = inv.transactionType === "DebitNote";
                  const isSelected = inv.id === invoiceId;
                  return (
                    <div
                      key={inv.id}
                      className={cn(
                        "flex items-start gap-2 px-3 py-2.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group",
                        isSelected && "bg-violet-50 border-l-2 border-l-violet-500"
                      )}
                      onClick={() => setLocation(`/invoices/${inv.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            {hasError && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                            <span className="text-xs font-black font-mono text-primary truncate">{inv.invoiceNumber}</span>
                            {inv.fiscalCode && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full shrink-0">✓</span>}
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0">{inv.currency} {Number(inv.total).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-slate-500 truncate">{inv.customer?.name || "Walk-in"}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{inv.issueDate ? format(new Date(inv.issueDate), "dd MMM yy") : ""}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <StatusBadge status={hasError ? "failed" : inv.status!} />
                          {isCN && <Badge className="bg-orange-100 text-orange-600 border-none text-[9px] px-1 py-0">CN</Badge>}
                          {isDN && <Badge className="bg-blue-100 text-blue-600 border-none text-[9px] px-1 py-0">DN</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/${inv.id}`); }} className="text-xs rounded-lg"><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          {inv.status === "draft" && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/new?edit=${inv.id}`); }} className="text-xs rounded-lg"><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>}
                          {inv.customerId && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/customers/${inv.customerId}`); }} className="text-xs rounded-lg"><User className="h-3.5 w-3.5 mr-2" /> Customer</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/new?duplicate=${inv.id}`); }} className="text-xs rounded-lg"><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                          {["draft", "issued"].includes(inv.status || "") && (
                            <DropdownMenuItem className="text-xs rounded-lg text-red-600 focus:bg-red-50"
                              onClick={async (e) => { e.stopPropagation(); if (confirm("Delete?")) { await deleteInvoice.mutateAsync(inv.id); toast({ title: "Deleted" }); } }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </TooltipProvider>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold">{totalInvoices} total</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-md" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || listLoading}>‹</Button>
              <span className="text-[10px] font-bold text-slate-500 px-1">{page}/{totalPages || 1}</span>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-md" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || listLoading}>›</Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: invoice preview ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !invoice ? (
            <div className="flex items-center justify-center h-full text-slate-400">Invoice not found</div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={() => setLocation("/invoices")}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {invoice.status === "quote" ? "Quotation" : isCreditNote ? "Credit Note" : "Invoice"} {invoice.invoiceNumber}
                  </span>
                  <StatusBadge status={(invoice.fdmsStatus === "failed" || invoice.validationStatus === "red") ? "failed" : invoice.status!} />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {["issued", "paid"].includes(invoice.status || "") && !invoice.fiscalCode && (
                    <Button size="sm" className={cn("h-8 px-3 text-xs gap-1.5 text-white", (invoice.fdmsStatus === "failed" || invoice.validationStatus === "red") ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}
                      onClick={() => { if (isFiscalizing) return; setIsFiscalizing(true); fiscalize.mutate(invoiceId, { onSettled: () => setIsFiscalizing(false) }); }}
                      disabled={fiscalize.isPending || isFiscalizing}>
                      {isFiscalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                      {(invoice.fdmsStatus === "failed" || invoice.validationStatus === "red") ? "Result" : "Fiscalize"}
                    </Button>
                  )}
                  {!isPaid && ["issued", "fiscalized"].includes(invoice.status || "") && (
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5 bg-blue-50 text-blue-700 border-blue-200" onClick={() => setShowPaymentModal(true)}>
                      <CreditCard className="w-3 h-3" /> Pay
                    </Button>
                  )}
                  {invoice.status === "draft" && (
                    <Button size="sm" className="h-8 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={handleIssue} disabled={isIssuing}>
                      {isIssuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Issue
                    </Button>
                  )}
                  {invoice.status === "quote" && (
                    <Button size="sm" className="h-8 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={() => convertQuotation.mutate(invoiceId)} disabled={convertQuotation.isPending}>
                      {convertQuotation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />} Convert
                    </Button>
                  )}
                  {["issued", "paid", "fiscalized"].includes(invoice.status || "") && canPreview && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5"><Share2 className="w-3 h-3" /> Share</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Share Invoice</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleShareWhatsapp}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}><Mail className="w-4 h-4 mr-2" /> Email</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <PDFDownloadLink document={<InvoicePDF invoice={invoice} company={company} customer={invoice.customer} qrCodeUrl={qrCodeDataUrl} taxTypes={taxTypes.data} />} fileName={`${isCreditNote ? "CreditNote" : "Invoice"}-${invoice.invoiceNumber}.pdf`}>
                        {({ loading }) => (
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" disabled={loading}>
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download
                          </Button>
                        )}
                      </PDFDownloadLink>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {invoice.status === "draft" && <DropdownMenuItem onClick={() => setLocation(`/invoices/new?edit=${invoiceId}`)}>Edit Draft</DropdownMenuItem>}
                      {invoice.status === "quote" && <DropdownMenuItem onClick={() => setLocation(`/quotations/new?edit=${invoiceId}`)}>Edit Quotation</DropdownMenuItem>}
                      {["issued", "paid", "fiscalized"].includes(invoice.status || "") && (
                        <>
                          <DropdownMenuItem onClick={handleCreateCreditNote} disabled={isCreatingCN}><Undo2 className="w-4 h-4 mr-2" /> Issue Credit Note</DropdownMenuItem>
                          <DropdownMenuItem onClick={handleCreateDebitNote} disabled={isCreatingDN}><Send className="w-4 h-4 mr-2" /> Issue Debit Note</DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Validation banners */}
              {(invoice as any)?.validationErrors?.length > 0 && (
                <div className="px-4 pt-2 shrink-0"><ValidationErrorsDisplay errors={(invoice as any).validationErrors} /></div>
              )}
              {invoice?.validationStatus && invoice.validationStatus !== "valid" && (
                <div className={cn("mx-4 mt-2 border rounded-lg p-3 flex items-start gap-3 shrink-0",
                  invoice.validationStatus === "red" ? "bg-red-50 border-red-200" : invoice.validationStatus === "grey" ? "bg-slate-50 border-slate-200" : "bg-yellow-50 border-yellow-200")}>
                  <ShieldCheck className={cn("h-4 w-4 mt-0.5 shrink-0", invoice.validationStatus === "red" ? "text-red-400" : invoice.validationStatus === "grey" ? "text-slate-400" : "text-yellow-400")} />
                  <p className={cn("text-xs", invoice.validationStatus === "red" ? "text-red-700" : invoice.validationStatus === "grey" ? "text-slate-700" : "text-yellow-700")}>
                    <span className="font-bold">ZIMRA {invoice.validationStatus.toUpperCase()}: </span>
                    {invoice.validationStatus === "red" && "Major validation errors — cannot close fiscal day until resolved."}
                    {invoice.validationStatus === "grey" && "Missing previous receipt in chain — cannot close fiscal day until resolved."}
                    {invoice.validationStatus === "yellow" && "Minor validation issues — review recommended."}
                  </p>
                </div>
              )}

              {/* PDF viewer — blob URL in plain iframe, page scroll handles everything */}
              <div className="bg-slate-100">
                {canPreview ? (
                  pdfGenerating || !pdfBlobUrl ? (
                    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Generating preview...
                    </div>
                  ) : (
                    <iframe
                      src={pdfBlobUrl}
                      title="Invoice Preview"
                      width="100%"
                      style={{ height: "1400px", border: "none", display: "block" }}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating preview...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {invoice && <PaymentModal invoice={invoice} remainingBalance={balanceDue} open={showPaymentModal} onOpenChange={setShowPaymentModal} />}
      <EmailInvoiceDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} defaultEmail={invoice?.customer?.email ?? undefined} onSend={handleSendEmail} isSending={isSendingEmail} />
      {receiptPayment && invoice && (
        <PaymentReceipt open={!!receiptPayment} onClose={() => setReceiptPayment(null)}
          payment={{ amount: receiptPayment.amount, paymentMethod: receiptPayment.paymentMethod, reference: receiptPayment.reference, notes: receiptPayment.notes, currency: receiptPayment.currency || invoice.currency, createdAt: receiptPayment.paymentDate }}
          invoice={invoice} company={company} customer={invoice.customer} />
      )}
    </Layout>
  );
}
