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

// ── SalesReport ───────────────────────────────────────────────────────────────

export function SalesReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/sales-summary", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "sales-summary", dateRange));
      if (!res.ok) throw new Error(`Failed to load sales summary (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["date"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Daily Sales</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No sales in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Date</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Invoices</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Subtotal</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Tax</th>
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
                  <td className="px-4 py-2 font-medium text-slate-700">{isValid(new Date(row.date)) ? format(new Date(row.date), "dd MMM yyyy") : row.date}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.invoiceCount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.subtotal}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.taxAmount}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Detail panel */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {isValid(new Date(selectedRow.date)) ? format(new Date(selectedRow.date), "dd MMM yyyy") : selectedRow.date}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Invoices", value: selectedRow.invoiceCount },
                { label: "Subtotal", value: selectedRow.subtotal },
                { label: "Tax Amount", value: selectedRow.taxAmount },
                { label: "Total", value: selectedRow.total },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SalesByCustomerReport ─────────────────────────────────────────────────────

export function SalesByCustomerReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/sales-by-customer", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "sales-by-customer", dateRange));
      if (!res.ok) throw new Error(`Failed to load sales by customer (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["customerName"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">By Customer</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No sales in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Customer</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Invoices</th>
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
                  <td className="px-4 py-2 font-medium text-slate-700">{row.customerName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.invoiceCount}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.customerName}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Customer ID", value: selectedRow.customerId },
                { label: "Invoice Count", value: selectedRow.invoiceCount },
                { label: "Total Revenue", value: selectedRow.total },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SalesByItemReport ─────────────────────────────────────────────────────────

export function SalesByItemReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/sales-by-item", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "sales-by-item", dateRange));
      if (!res.ok) throw new Error(`Failed to load sales by item (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["description"]);
  const total = computeTotal(filtered, "revenue");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">By Item</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No sales in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Item</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Qty Sold</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{row.description}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.quantitySold}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.description}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Product ID", value: selectedRow.productId ?? "N/A" },
                { label: "Qty Sold", value: selectedRow.quantitySold },
                { label: "Revenue", value: selectedRow.revenue },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-black text-slate-800">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SalesBySalespersonReport ──────────────────────────────────────────────────

export function SalesBySalespersonReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/sales-by-salesperson", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "sales-by-salesperson", dateRange));
      if (!res.ok) throw new Error(`Failed to load sales by salesperson (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["userName"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">By Salesperson</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No sales in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Salesperson</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Invoices</th>
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
                  <td className="px-4 py-2 font-medium text-slate-700">{row.userName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.invoiceCount}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.userName}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "User ID", value: selectedRow.userId },
                { label: "Invoice Count", value: selectedRow.invoiceCount },
                { label: "Total Revenue", value: selectedRow.total },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
