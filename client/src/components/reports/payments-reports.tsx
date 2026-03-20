import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { filterRecords, computeTotal } from "@/lib/report-utils";
import { format, isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportProps {
  companyId: number;
  dateRange: { from: Date; to: Date };
  search: string;
}

function buildUrl(companyId: number, endpoint: string, dateRange: { from: Date; to: Date }) {
  return `/api/companies/${companyId}/reports/${endpoint}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-slate-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-slate-300">
      <p className="text-sm">Select a row to view details</p>
    </div>
  );
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  const d = new Date(val);
  return isValid(d) ? format(d, "dd MMM yyyy") : val;
}

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

// ── TimeToGetPaidReport ───────────────────────────────────────────────────────

export function TimeToGetPaidReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/time-to-get-paid", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "time-to-get-paid", dateRange));
      if (!res.ok) throw new Error(`Failed to load time to get paid (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["invoiceNumber", "customerName"]);
  const total = computeTotal(filtered, "amount");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Time to Get Paid</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No payment data in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Invoice#</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Customer</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Issue Date</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Payment Date</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Days</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{row.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-600">{row.customerName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{fmtDate(row.issueDate)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{fmtDate(row.paymentDate)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.daysToPayment}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.invoiceNumber}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Customer" value={selectedRow.customerName} />
              <DetailCard label="Issue Date" value={fmtDate(selectedRow.issueDate)} />
              <DetailCard label="Payment Date" value={fmtDate(selectedRow.paymentDate)} />
              <DetailCard label="Days to Payment" value={selectedRow.daysToPayment} />
              <DetailCard label="Amount" value={selectedRow.amount} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RefundHistoryReport ───────────────────────────────────────────────────────

export function RefundHistoryReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/refund-history", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "refund-history", dateRange));
      if (!res.ok) throw new Error(`Failed to load refund history (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["invoiceNumber", "customerName", "relatedInvoiceNumber"]);
  const total = computeTotal(filtered, "amount");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Refund History</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No refunds in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Invoice#</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Customer</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Issue Date</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Amount</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Related Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{row.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-600">{row.customerName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{fmtDate(row.issueDate)}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.amount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.relatedInvoiceNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.invoiceNumber}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Customer" value={selectedRow.customerName} />
              <DetailCard label="Issue Date" value={fmtDate(selectedRow.issueDate)} />
              <DetailCard label="Amount" value={selectedRow.amount} />
              <DetailCard label="Related Invoice" value={selectedRow.relatedInvoiceNumber ?? "—"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WithholdingTaxReport ──────────────────────────────────────────────────────

export function WithholdingTaxReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/withholding-tax", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "withholding-tax", dateRange));
      if (!res.ok) throw new Error(`Failed to load withholding tax (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["invoiceNumber", "customerName"]);
  const total = computeTotal(filtered, "withheldAmount");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Withholding Tax</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No withholding tax data in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Invoice#</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Customer</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Issue Date</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Withheld Amount</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{row.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-600">{row.customerName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{fmtDate(row.issueDate)}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.withheldAmount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.invoiceNumber}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Customer" value={selectedRow.customerName} />
              <DetailCard label="Issue Date" value={fmtDate(selectedRow.issueDate)} />
              <DetailCard label="Withheld Amount" value={selectedRow.withheldAmount} />
              <DetailCard label="Total" value={selectedRow.total} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
