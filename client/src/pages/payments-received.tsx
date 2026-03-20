import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCompany, useCompanies } from "@/hooks/use-companies";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Download, CreditCard, Calendar as CalendarIcon, Eye, Building2, User as UserIcon, Printer, ArrowLeft, FileText } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, isValid } from "date-fns";
import { PaymentReceiptPDF } from "@/components/invoices/payment-receipt-pdf";
import { useInvoice } from "@/hooks/use-invoices";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Link, useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { pdf, PDFDownloadLink } from "@react-pdf/renderer";
import { DataTable } from "@/components/ui/data-table";
import { api } from "@shared/routes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  ECOCASH: "EcoCash",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700",
  CARD: "bg-blue-50 text-blue-700",
  ECOCASH: "bg-orange-50 text-orange-700",
  BANK_TRANSFER: "bg-purple-50 text-purple-700",
  OTHER: "bg-slate-50 text-slate-700",
};

function ReceiptDownloader({ p, company, label }: { p: any; company: any; label?: string }) {
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(p.invoiceId || 0);
  const { taxTypes } = useTaxConfig(company?.id || 0);

  const invoiceWithTotals = invoice
    ? {
        ...invoice,
        total: invoice.total ?? p.invoiceTotal,
        paidAmount: p.invoicePaidAmount,
      }
    : p.invoiceTotal != null
    ? { total: p.invoiceTotal, paidAmount: p.invoicePaidAmount, items: [] }
    : undefined;

  const safeDate = (dateStr: any) => {
    try {
      const d = new Date(dateStr);
      return isValid(d) ? d : new Date();
    } catch {
      return new Date();
    }
  };

  return (
    <PDFDownloadLink
      document={
        <PaymentReceiptPDF
          payment={{
            id: p.id,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            reference: p.reference || `REC-${p.id}`,
            notes: p.notes,
            currency: p.currency,
            paymentDate: safeDate(p.paymentDate),
            invoiceNumber: p.invoiceNumber || invoice?.invoiceNumber || "N/A",
            customerName: p.customerName || invoice?.customerName,
            customerEmail: p.customerEmail || invoice?.customerEmail,
          }}
          allPayments={[p]}
          overallBalance={p.invoiceTotal - p.invoicePaidAmount}
          company={company}
          invoice={invoiceWithTotals}
          taxTypes={taxTypes.data}
        />
      }
      fileName={`Receipt-${p.invoiceNumber || p.id}-${format(safeDate(p.paymentDate), "yyyyMMdd")}.pdf`}
    >
      {({ loading, error }) => (
        <Button
          variant={label ? "default" : "ghost"}
          size={label ? "sm" : "icon"}
          className={label ? "w-full rounded-xl font-bold h-11" : "h-7 w-7"}
          disabled={loading || isLoadingInvoice}
          title={error ? `PDF error: ${error}` : "Download Receipt PDF"}
        >
          {loading || isLoadingInvoice
            ? <Loader2 className={`w-3 h-3 animate-spin ${label ? 'mr-2' : ''}`} />
            : label ? <Download className="w-4 h-4 mr-2" /> : <Download className={`w-3 h-3 ${error ? 'text-red-400' : 'text-slate-400 hover:text-primary'}`} />}
          {label || null}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

function PaymentDetailsDialog({ p, company }: { p: any; company: any }) {
  const safeDate = (dateStr: any) => {
    try {
      const d = new Date(dateStr);
      return isValid(d) ? format(d, "dd MMM yyyy, HH:mm") : "Invalid Date";
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
      <DialogHeader className="bg-slate-900 text-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Payment Details</DialogTitle>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Reference: {p.reference || "N/A"}</p>
          </div>
        </div>
      </DialogHeader>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Amount Paid</p>
            <p className="text-2xl font-black text-slate-900 font-display">
              <span className="text-sm text-slate-400 mr-1">{p.currency}</span>
              {Number(p.amount).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
            <Badge className={cn("w-fit text-[9px] font-black uppercase border-none px-2", METHOD_COLORS[p.paymentMethod] || METHOD_COLORS.OTHER)}>
              {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <UserIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Customer</p>
              <p className="text-sm font-bold text-slate-800">{p.customerName || "Walk-in Customer"}</p>
              {p.customerEmail && <p className="text-xs text-slate-500">{p.customerEmail}</p>}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Related Invoice</p>
              {p.invoiceId ? (
                <Link href={`/invoices/${p.invoiceId}`} className="text-sm font-bold text-primary hover:underline font-mono">
                  {p.invoiceNumber || `#${p.invoiceId}`}
                </Link>
              ) : (
                <p className="text-sm text-slate-400 italic">No invoice linked</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Payment Date</p>
              <p className="text-sm font-bold text-slate-800">{safeDate(p.paymentDate)}</p>
            </div>
          </div>
        </div>

        {p.notes && (
          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Notes</p>
            <p className="text-sm text-orange-900 italic font-medium">"{p.notes}"</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        {p.invoiceId && (
          <div className="flex-1">
            <ReceiptDownloader p={p} company={company} label="Download Receipt PDF" />
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export default function PaymentsReceivedPage() {
  const [match, params] = useRoute("/payments-received/:id?");
  const [, setLocation] = useLocation();
  const selectedId = params?.id ? parseInt(params.id) : null;

  const { user } = useAuth();
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany(!!user);
  const companyId = activeCompanyId ?? 0;
  const { data: companies } = useCompanies();
  const company = companies?.find(c => c.id === companyId);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(startOfMonth(new Date()), 2),
    to: endOfMonth(new Date()),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/companies/payments", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = `/api/companies/${companyId}/reports/payments?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`Failed to fetch payments (${res.status})`);
      return await res.json() as any[];
    },
    enabled: !companyLoading && !!companyId,
  });

  const filtered = payments?.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.invoiceNumber?.toLowerCase().includes(q) ||
      p.customerName?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.paymentMethod?.toLowerCase().includes(q)
    );
  }) ?? [];

  const columns = [
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }: any) => {
        const d = new Date(row.original.paymentDate);
        return isValid(d) ? format(d, "dd MMM yyyy") : "—";
      }
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs font-bold">{row.original.invoiceNumber || "—"}</span>
      )
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }: any) => (
        <span className="font-bold text-xs">{row.original.customerName || "Walk-in"}</span>
      )
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-black text-xs">
          {row.original.currency} {Number(row.original.amount).toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <Layout>
      <div className="flex -m-6 min-h-screen bg-slate-50/30">
        {/* Left Panel: Payments List */}
        <div className={cn(
          "flex-1 border-r border-slate-200 bg-white min-h-screen shadow-sm transition-all duration-300",
          selectedId ? "hidden lg:block lg:max-w-md" : "block w-full"
        )}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Payments Received</h1>
              {selectedId && (
                <Button variant="outline" size="icon" onClick={() => setLocation("/payments-received")} title="Back to list" className="lg:hidden h-8 w-8 rounded-lg">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search payments..."
                className="pl-9 h-10 rounded-xl border-slate-200 focus:border-primary/50 transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
              <DataTable
                columns={columns}
                data={filtered}
                isLoading={paymentsLoading}
                onRowClick={(row) => setLocation(`/payments-received/${row.id}`)}
                selectedId={selectedId}
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className={cn(
          "flex-[2] bg-slate-50/50 min-h-screen transition-all duration-300",
          selectedId ? "block w-full" : "hidden lg:flex items-center justify-center p-12 text-center"
        )}>
          {selectedId ? (
            <PaymentDetailView paymentId={selectedId} company={company} setLocation={setLocation} />
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-400 max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner border border-slate-100">
                <Eye className="w-10 h-10 opacity-20" />
              </div>
              <div>
                <p className="font-black uppercase tracking-tight text-slate-600">No Payment Selected</p>
                <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Choose a payment from the list to preview the official receipt.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function PaymentDetailView({ paymentId, company, setLocation }: { paymentId: number, company: any, setLocation: any }) {
  const { data: payment, isLoading: isLoadingPayment } = useQuery<any>({
    queryKey: ["/api/payments", paymentId],
    queryFn: async () => {
      const res = await apiFetch(`/api/payments/${paymentId}`);
      if (!res.ok) throw new Error("Failed to fetch payment");
      return res.json();
    },
    enabled: !!paymentId,
  });

  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(payment?.invoiceId || 0);
  const { data: allInvoicePayments, isLoading: isLoadingAllPayments } = useQuery<any[]>({
    queryKey: ["/api/invoices", payment?.invoiceId, "payments"],
    queryFn: async () => {
      const res = await apiFetch(`/api/invoices/${payment.invoiceId}/payments`);
      if (!res.ok) throw new Error("Failed to fetch invoice payments");
      return res.json();
    },
    enabled: !!payment?.invoiceId,
  });

  const { data: statement, isLoading: isLoadingStatement } = useQuery<any>({
    queryKey: ["/api/customers", invoice?.customerId, "statement"],
    queryFn: async () => {
      const start = "2000-01-01";
      const end = format(new Date(), "yyyy-MM-dd");
      const res = await apiFetch(`/api/customers/${invoice.customerId}/statement?startDate=${start}&endDate=${end}&currency=${payment.currency || 'USD'}`);
      if (!res.ok) throw new Error("Failed to fetch customer statement");
      return res.json();
    },
    enabled: !!invoice?.id && !!invoice?.customerId,
  });

  const taxConfig = useTaxConfig(company?.id || 0);
  const taxTypesData = taxConfig.taxTypes.data;

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const pdfDocument = useMemo(() => {
    if (!payment || !company || !taxTypesData || !allInvoicePayments) return null;
    return (
      <PaymentReceiptPDF
        payment={{
          ...payment,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
          invoiceNumber: payment.invoiceNumber || invoice?.invoiceNumber || "N/A",
          reference: payment.reference || `REC-${payment.id}`,
        }}
        allPayments={allInvoicePayments}
        overallBalance={statement?.closingBalance}
        company={company}
        invoice={invoice}
        taxTypes={taxTypesData}
      />
    );
  }, [payment, company, invoice, taxTypesData, allInvoicePayments, statement]);

  useEffect(() => {
    const hasCustomer = !!invoice?.customerId;
    const isStatementReady = !hasCustomer || (!!statement && !isLoadingStatement);
    
    if (!payment || !company || !taxTypesData || !allInvoicePayments || !isStatementReady || isLoadingInvoice) return;
    if (!pdfDocument) return;

    let revoked = false;
    setPdfGenerating(true);

    const generatePdf = async () => {
      try {
        const blob = await pdf(pdfDocument).toBlob();
        if (!revoked) {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (error) {
        console.error("Failed to generate PDF:", error);
      } finally {
        if (!revoked) setPdfGenerating(false);
      }
    };

    generatePdf();
    return () => { revoked = true; };
  }, [pdfDocument, isLoadingInvoice, payment, company, taxTypesData, allInvoicePayments, statement, isLoadingStatement]);

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  if (isLoadingPayment || isLoadingInvoice || isLoadingAllPayments || (!!invoice?.customerId && isLoadingStatement) || pdfGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3 py-20 bg-white/50 m-6 rounded-2xl border border-dashed border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        <p className="font-bold uppercase tracking-widest text-[10px]">
          {pdfGenerating ? "Generating A4 Receipt..." : "Loading Payment Data..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-100/30">
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 lg:hidden" onClick={() => setLocation("/payments-received")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-black text-slate-900 uppercase tracking-tight text-sm">Receipt Preview</h2>
        </div>
        <div className="flex gap-2">
          {invoice?.customerId && (
            <Link href={`/reports/customer-statements?customerId=${invoice.customerId}`}>
              <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl font-bold border-violet-200 text-violet-700 hover:bg-violet-50 text-xs shadow-sm shadow-violet-100">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> View Statement
              </Button>
            </Link>
          )}
          {pdfBlobUrl && (
            <Button asChild size="sm" className="btn-gradient h-8 px-3 rounded-xl font-bold text-xs shadow-lg shadow-primary/20">
              <a href={pdfBlobUrl} download={`Receipt-${invoice?.invoiceNumber || paymentId}.pdf`}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 px-3 rounded-xl font-bold border-slate-200 text-xs text-slate-600 shadow-sm">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
        </div>
      </div>
      <div className="flex-1 flex justify-center py-12 px-4 shadow-inner min-h-screen">
        <div className="w-full max-w-[850px] bg-white shadow-2xl border border-slate-200 rounded-sm overflow-hidden h-fit">
          {pdfBlobUrl && (
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              title="Receipt"
              width="100%"
              style={{ height: "1400px", border: "none", display: "block" }}
              scrolling="no"
            />
          )}
        </div>
      </div>
    </div>
  );
}
