import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { filterRecords, computeTotal } from "@/lib/report-utils";
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

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-black text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

// ── TaxSummaryReport ──────────────────────────────────────────────────────────

export function TaxSummaryReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/tax-summary", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "tax-summary", dateRange));
      if (!res.ok) throw new Error(`Failed to load tax summary (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["taxCode", "taxName"]);
  const netVatTotal = computeTotal(filtered, "netVat");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tax Summary</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows</span>
        </div>
        <div className="px-4 py-2 border-b border-slate-100 bg-violet-50 flex items-center justify-between">
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Net VAT Payable</span>
          <span className="text-sm font-black text-violet-800">{netVatTotal.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No tax data in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Tax Code</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Tax Name</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Rate</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Taxable Amount</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Output Tax</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Input Tax</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Net VAT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{row.taxCode}</td>
                  <td className="px-4 py-2 text-slate-600">{row.taxName}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.taxRate}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.taxableAmount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.outputTax}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.inputTax}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.netVat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.taxName}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Tax Code" value={selectedRow.taxCode} />
              <DetailCard label="Tax Name" value={selectedRow.taxName} />
              <DetailCard label="Tax Rate" value={selectedRow.taxRate} />
              <DetailCard label="Taxable Amount" value={selectedRow.taxableAmount} />
              <DetailCard label="Output Tax" value={selectedRow.outputTax} />
              <DetailCard label="Input Tax" value={selectedRow.inputTax} />
              <DetailCard label="Net VAT" value={selectedRow.netVat} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
