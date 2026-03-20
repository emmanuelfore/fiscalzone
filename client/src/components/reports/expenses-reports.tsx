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
      <p className="text-sm font-black text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

// ── ExpenseDetailsReport ──────────────────────────────────────────────────────

export function ExpenseDetailsReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/expense-details", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "expense-details", dateRange));
      if (!res.ok) throw new Error(`Failed to load expense details (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["category", "description", "supplierName", "reference"]);
  const total = computeTotal(filtered, "amount");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expense Details</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No expenses in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Category</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Description</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Supplier</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Payment Method</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Amount</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Currency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{fmtDate(row.expenseDate)}</td>
                  <td className="px-4 py-2 text-slate-600">{row.category}</td>
                  <td className="px-4 py-2 text-slate-600">{row.description}</td>
                  <td className="px-4 py-2 text-slate-600">{row.supplierName ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{row.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.amount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.currency}</td>
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
              <DetailCard label="Date" value={fmtDate(selectedRow.expenseDate)} />
              <DetailCard label="Category" value={selectedRow.category} />
              <DetailCard label="Description" value={selectedRow.description} />
              <DetailCard label="Supplier" value={selectedRow.supplierName} />
              <DetailCard label="Payment Method" value={selectedRow.paymentMethod} />
              <DetailCard label="Reference" value={selectedRow.reference} />
              <DetailCard label="Amount" value={selectedRow.amount} />
              <DetailCard label="Currency" value={selectedRow.currency} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ExpensesByCategoryReport ──────────────────────────────────────────────────

export function ExpensesByCategoryReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/expenses-by-category", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "expenses-by-category", dateRange));
      if (!res.ok) throw new Error(`Failed to load expenses by category (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["category"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expenses by Category</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No expense categories in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Category</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Total</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Percentage</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{row.category}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.percentage}%</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.category}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Category" value={selectedRow.category} />
              <DetailCard label="Total" value={selectedRow.total} />
              <DetailCard label="Percentage" value={`${selectedRow.percentage}%`} />
              <DetailCard label="Count" value={selectedRow.count} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ExpensesByCustomerReport ──────────────────────────────────────────────────

export function ExpensesByCustomerReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/expenses-by-customer", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "expenses-by-customer", dateRange));
      if (!res.ok) throw new Error(`Failed to load expenses by customer (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["supplierName"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expenses by Supplier</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No supplier expenses in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Supplier</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Total</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{row.supplierName}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.supplierName}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Supplier" value={selectedRow.supplierName} />
              <DetailCard label="Total" value={selectedRow.total} />
              <DetailCard label="Count" value={selectedRow.count} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ExpensesByProjectReport ───────────────────────────────────────────────────

export function ExpensesByProjectReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/expenses-by-project", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "expenses-by-project", dateRange));
      if (!res.ok) throw new Error(`Failed to load expenses by project (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["project"]);
  const total = computeTotal(filtered, "total");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expenses by Project</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No project expenses in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Project</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Total</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{row.project}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.total}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!selectedRow ? <DetailEmpty /> : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{selectedRow.project}</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Project" value={selectedRow.project} />
              <DetailCard label="Total" value={selectedRow.total} />
              <DetailCard label="Count" value={selectedRow.count} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BillableExpenseDetailsReport ──────────────────────────────────────────────

export function BillableExpenseDetailsReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["reports/billable-expense-details", companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const res = await apiFetch(buildUrl(companyId, "billable-expense-details", dateRange));
      if (!res.ok) throw new Error(`Failed to load billable expense details (${res.status})`);
      return res.json();
    },
    enabled: !!companyId,
  });

  const filtered = filterRecords(data, search, ["category", "description", "status"]);
  const total = computeTotal(filtered, "amount");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>;
  if (error) return <EmptyState message="Failed to load report" />;

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Billable Expense Details</span>
          <span className="text-xs font-black text-slate-700">{filtered.length} rows · {total.toFixed(2)}</span>
        </div>
        {filtered.length === 0 ? <EmptyState message="No billable expenses in this period" /> : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Category</th>
                <th className="text-left px-4 py-2 font-bold text-slate-500">Description</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Amount</th>
                <th className="text-right px-4 py-2 font-bold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn("border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", selectedRow === row && "bg-violet-50")}
                  onClick={() => setSelectedRow(row === selectedRow ? null : row)}
                >
                  <td className="px-4 py-2 text-slate-600">{fmtDate(row.expenseDate)}</td>
                  <td className="px-4 py-2 text-slate-600">{row.category}</td>
                  <td className="px-4 py-2 text-slate-600">{row.description}</td>
                  <td className="px-4 py-2 text-right font-black text-slate-800">{row.amount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{row.status}</td>
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
              <DetailCard label="Date" value={fmtDate(selectedRow.expenseDate)} />
              <DetailCard label="Category" value={selectedRow.category} />
              <DetailCard label="Description" value={selectedRow.description} />
              <DetailCard label="Amount" value={selectedRow.amount} />
              <DetailCard label="Status" value={selectedRow.status} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
