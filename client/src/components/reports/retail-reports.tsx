import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { ShoppingCart, TrendingUp, ShoppingBag, Clock, AlertCircle } from "lucide-react";
import { format, isValid } from "date-fns";
import { Loader2, Package, List, History, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportProps {
  companyId: number;
  dateRange: { from: Date; to: Date };
  search: string;
}

export function OperationalMetricsReport({ companyId, dateRange }: ReportProps) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [api.reports.operationalMetrics.path, companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = buildUrl(api.reports.operationalMetrics.path, { companyId });
      const res = await apiFetch(`${url}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" /> Avg. Transaction (ATV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">${(data?.atv || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> profit margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{Math.round(data?.profitMargin || 0)}%</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-purple-500" /> Items per Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{(data?.itemsPerReceipt || 0).toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-800">Financial Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-tight">Total Revenue</span>
              <span className="text-lg font-black text-slate-900">${(data?.totalRevenue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-tight">Total Cost of Goods (COGS)</span>
              <span className="text-lg font-black text-rose-600">${(data?.totalCogs || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-emerald-50 px-4 rounded-xl">
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-tight">Gross Profit</span>
              <span className="text-xl font-black text-emerald-700">${((data?.totalRevenue || 0) - (data?.totalCogs || 0)).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function HourlySalesAnalysisReport({ companyId, dateRange }: ReportProps) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: [api.reports.hourlySales.path, companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = buildUrl(api.reports.hourlySales.path, { companyId });
      const res = await apiFetch(`${url}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6">
      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Hourly Sales Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(h) => `${h}:00`}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(val: number) => [`$${val.toFixed(2)}`, "Sales"]}
                  labelFormatter={(h) => `Time: ${h}:00`}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))">
                  {data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total > (Math.max(...data.map(d => d.total)) * 0.8) ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryHealthReport({ companyId, search }: ReportProps) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: [api.reports.stockAlerts.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.reports.stockAlerts.path, { companyId });
      const res = await apiFetch(url);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const filteredData = data?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="bg-rose-50 border-b border-rose-100">
          <CardTitle className="text-lg font-black text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Low Stock Items
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Product</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Current Stock</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Threshold</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    No low stock items found. Your inventory is healthy!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── StockOnHandReport ─────────────────────────────────────────────────────────

export function StockOnHandReport({ companyId, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: [api.reports.stockOnHand.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.reports.stockOnHand.path, { companyId });
      const res = await apiFetch(url);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const filteredData = data?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full min-h-[500px]">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Stock On Hand</span>
          <span className="text-xs font-black text-slate-700">{filteredData?.length || 0} Products</span>
        </div>
        <table className="w-full text-xs">
          <thead className="sticky top-[41px] bg-white border-b border-slate-100 z-10">
            <tr>
              <th className="text-left px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Product</th>
              <th className="text-right px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Stock</th>
              <th className="text-right px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredData?.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group",
                  selectedRow === row && "bg-blue-50/50"
                )}
                onClick={() => setSelectedRow(row === selectedRow ? null : row)}
              >
                <td className="px-6 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium italic">{row.sku || "No SKU"}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-right">
                  <span className={cn("font-black", Number(row.stockLevel) <= 0 ? "text-rose-500" : "text-slate-700")}>
                    {Number(row.stockLevel).toFixed(0)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-black text-slate-900">${Number(row.totalValue).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
        {!selectedRow ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
            <Package className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Select a product to view valuation details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                 <Package className="w-6 h-6 text-blue-600" />
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedRow.name}</h3>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{selectedRow.sku || "No SKU"}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Category</p>
                <p className="text-sm font-black text-slate-800">{selectedRow.category || "General"}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Cost (Avg/Current)</p>
                <p className="text-sm font-black text-slate-800">${Number(selectedRow.unitCost).toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 border-l-4 border-blue-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
                <p className="text-2xl font-black text-slate-900">{Number(selectedRow.stockLevel).toFixed(0)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 border-l-4 border-emerald-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Valuation</p>
                <p className="text-2xl font-black text-emerald-700">${Number(selectedRow.totalValue).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── InventoryMovementsReport ──────────────────────────────────────────────────

export function InventoryMovementsReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: [api.reports.inventoryMovements.path, companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = buildUrl(api.reports.inventoryMovements.path, { companyId });
      const res = await apiFetch(`${url}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const filteredData = data?.filter(item => 
    item.productName.toLowerCase().includes(search.toLowerCase()) || 
    (item.reference && item.reference.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full min-h-[500px]">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Log History</span>
          <span className="text-xs font-black text-slate-700">{filteredData?.length || 0} Events</span>
        </div>
        <table className="w-full text-xs">
          <thead className="sticky top-[41px] bg-white border-b border-slate-100 z-10">
            <tr>
              <th className="text-left px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Date</th>
              <th className="text-left px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Product</th>
              <th className="text-right px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Qty</th>
            </tr>
          </thead>
          <tbody>
            {filteredData?.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group",
                  selectedRow === row && "bg-violet-50/50"
                )}
                onClick={() => setSelectedRow(row === selectedRow ? null : row)}
              >
                <td className="px-6 py-3 text-slate-500 font-medium">{format(new Date(row.date), "dd MMM")}</td>
                <td className="px-6 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.productName}</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter w-fit",
                      row.type === "STOCK_IN" ? "text-emerald-600" : row.type === "STOCK_OUT" ? "text-rose-600" : "text-amber-600"
                    )}>
                      {row.type === "STOCK_IN" ? "↑ IN" : row.type === "STOCK_OUT" ? "↓ OUT" : "± ADJ"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-black text-slate-700">
                  {row.type === "STOCK_OUT" ? "-" : "+"}{Number(row.quantity).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
        {!selectedRow ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
            <History className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Select a movement to view transaction details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center",
                 selectedRow.type === "STOCK_IN" ? "bg-emerald-100" : "bg-rose-100"
               )}>
                 <History className={cn(
                   "w-6 h-6",
                   selectedRow.type === "STOCK_IN" ? "text-emerald-600" : "text-rose-600"
                 )} />
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-900 leading-tight">Stock {selectedRow.type === "STOCK_IN" ? "Arrival" : "Reduction"}</h3>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{format(new Date(selectedRow.date), "dd MMM yyyy 'at' HH:mm")}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Information</p>
                <p className="text-sm font-black text-slate-800">{selectedRow.productName}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity Flow</p>
                <p className={cn(
                  "text-xl font-black",
                  selectedRow.type === "STOCK_IN" ? "text-emerald-700" : "text-rose-700"
                )}>
                  {selectedRow.type === "STOCK_IN" ? "+" : "-"}{Number(selectedRow.quantity).toFixed(0)} units
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Related Reference</p>
                <p className="text-sm font-black text-slate-800">{selectedRow.reference || "Internal Sync"}</p>
              </div>
              {selectedRow.notes && (
                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movement Notes</p>
                  <p className="text-sm text-slate-600 italic">"{selectedRow.notes}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PurchaseHistoryReport ─────────────────────────────────────────────────────

export function PurchaseHistoryReport({ companyId, dateRange, search }: ReportProps) {
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: [api.reports.purchaseHistory.path, companyId, dateRange.from, dateRange.to],
    queryFn: async () => {
      const url = buildUrl(api.reports.purchaseHistory.path, { companyId });
      const res = await apiFetch(`${url}?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`);
      return res.json();
    },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const filteredData = data?.filter(item => 
    item.productName.toLowerCase().includes(search.toLowerCase()) || 
    (item.supplierName && item.supplierName.toLowerCase().includes(search.toLowerCase())) ||
    (item.reference && item.reference.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full min-h-[500px]">
      <div className="w-1/2 border-r border-slate-100 overflow-auto">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Incoming Stock</span>
          <span className="text-xs font-black text-slate-700">{filteredData?.length || 0} Records</span>
        </div>
        <table className="w-full text-xs">
          <thead className="sticky top-[41px] bg-white border-b border-slate-100 z-10">
            <tr>
              <th className="text-left px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Date</th>
              <th className="text-left px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Supplier / Product</th>
              <th className="text-right px-6 py-3 font-black text-slate-400 uppercase tracking-widest text-[9px]">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {filteredData?.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group",
                  selectedRow === row && "bg-emerald-50/50"
                )}
                onClick={() => setSelectedRow(row === selectedRow ? null : row)}
              >
                <td className="px-6 py-3 text-slate-500 font-medium">{format(new Date(row.date), "dd MMM")}</td>
                <td className="px-6 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 line-clamp-1">{row.supplierName || "Direct / Internal"}</span>
                    <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{row.productName}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-black text-slate-900">${Number(row.totalCost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
        {!selectedRow ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
            <Truck className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Select a purchase record to view costing</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                 <Truck className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h3 className="text-lg font-black text-slate-900 leading-tight">Purchase Confirmation</h3>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{format(new Date(selectedRow.date), "dd MMMM yyyy")}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</p>
                <p className="text-sm font-black text-slate-800">{selectedRow.supplierName || "General Vendor"}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Purchased</p>
                <p className="text-sm font-black text-slate-800">{selectedRow.productName}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Cost</p>
                <p className="text-xl font-black text-slate-900">${Number(selectedRow.unitCost).toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</p>
                <p className="text-xl font-black text-slate-900">{Number(selectedRow.quantity).toFixed(0)} units</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm space-y-1 col-span-2 border-l-8 border-emerald-500 bg-emerald-50/20">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Transaction Cost</p>
                <p className="text-3xl font-black text-emerald-800">${Number(selectedRow.totalCost).toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1 col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference / Invoice #</p>
                <p className="text-sm font-mono text-slate-700">{selectedRow.reference || "N/A"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
