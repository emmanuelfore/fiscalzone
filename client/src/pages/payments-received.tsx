import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCompany } from "@/hooks/use-companies";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Download, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PaymentReceiptPDF } from "@/components/invoices/payment-receipt-pdf";
import { useInvoice } from "@/hooks/use-invoices";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

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

function ReceiptDownloader({ p, company }: { p: any; company: any }) {
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(p.invoiceId || 0);
  const { taxTypes } = useTaxConfig(company?.id || 0);

  return (
    <PDFDownloadLink
      document={
        <PaymentReceiptPDF
          payment={{
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            reference: p.reference,
            notes: p.notes,
            currency: p.currency,
            paymentDate: p.paymentDate,
            invoiceNumber: p.invoiceNumber,
            customerName: p.customerName,
            customerEmail: p.customerEmail,
          }}
          company={company}
          invoice={invoice}
          taxTypes={taxTypes}
        />
      }
      fileName={`Receipt-${p.invoiceNumber || p.id}-${format(new Date(p.paymentDate), "yyyyMMdd")}.pdf`}
    >
      {({ loading }) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loading || isLoadingInvoice} title="Download Receipt PDF">
          {loading || isLoadingInvoice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-slate-400 hover:text-primary" />}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

export default function PaymentsReceivedPage() {
  const { user } = useAuth();
  const { activeCompanyId, isLoading: companyLoading } = useActiveCompany(!!user);
  const companyId = activeCompanyId ?? 0;
  const { data: company } = useCompany(companyId);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(startOfMonth(new Date()), 2), // last 3 months by default
    to: endOfMonth(new Date()),
  });

  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ["/api/companies/payments", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = `/api/companies/${companyId}/reports/payments?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`Failed to fetch payments (${res.status})`);
      return await res.json() as any[];
    },
    enabled: !companyLoading && !!companyId,
  });

  const isLoading = companyLoading || paymentsLoading;

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

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Payments Received</h1>
          <p className="text-slate-500 mt-1 font-medium italic">All payments recorded against invoices</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="glass-card border-none">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Received</p>
            <p className="text-2xl font-black text-emerald-600 font-display">
              {filtered[0]?.currency || "USD"} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{filtered.length} payments</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-none shadow-xl">
        {/* Filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search invoice, customer, reference..."
              className="pl-9 h-10 rounded-xl border-slate-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-10 rounded-xl text-xs font-bold"
              onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>
              This Month
            </Button>
            <Button variant="outline" size="sm" className="h-10 rounded-xl text-xs font-bold"
              onClick={() => setDateRange({ from: subMonths(startOfMonth(new Date()), 2), to: endOfMonth(new Date()) })}>
              3 Months
            </Button>
            <Button variant="outline" size="sm" className="h-10 rounded-xl text-xs font-bold"
              onClick={() => setDateRange({ from: new Date(2020, 0, 1), to: endOfMonth(new Date()) })}>
              All Time
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-medium text-xs">
                  <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                  {format(dateRange.from, "dd MMM")} – {format(dateRange.to, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from) setDateRange({ from: range.from, to: range.to || range.from });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="h-11 px-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Date</TableHead>
                  <TableHead className="h-11 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Invoice</TableHead>
                  <TableHead className="h-11 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Customer</TableHead>
                  <TableHead className="h-11 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Method</TableHead>
                  <TableHead className="h-11 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Reference</TableHead>
                  <TableHead className="h-11 px-4 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">Amount</TableHead>
                  <TableHead className="h-11 px-5 w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                      <p className="font-bold">{paymentsError ? "Failed to load payments" : "No payments found"}</p>
                      {paymentsError && (
                        <p className="text-xs text-red-400 mt-1">{(paymentsError as Error).message}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id} className="border-none hover:bg-slate-50/50">
                    <TableCell className="px-5 py-3 text-slate-600 text-xs font-bold whitespace-nowrap">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {p.invoiceId ? (
                        <Link href={`/invoices/${p.invoiceId}`} className="font-black text-xs text-primary hover:underline font-mono">
                          {p.invoiceNumber || `#${p.invoiceId}`}
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-bold text-xs text-slate-800 max-w-[160px] truncate">
                      {p.customerName || <span className="text-slate-400 italic">Walk-in</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={cn("text-[9px] font-black uppercase border-none px-2", METHOD_COLORS[p.paymentMethod] || METHOD_COLORS.OTHER)}>
                        {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {p.reference || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 mr-1">{p.currency}</span>
                      {Number(p.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      {company && p.invoiceId && (
                        <ReceiptDownloader p={p} company={company} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
