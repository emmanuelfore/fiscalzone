import { Layout } from "@/components/layout";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useOrderStatus, useUpdateOrderStatus } from "@/hooks/use-invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Utensils, CheckCircle2, Clock, MapPin, Search, Filter, MoreHorizontal, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function LiveOrdersPage() {
  const { activeCompanyId } = useActiveCompany();
  const { data: orders, isLoading } = useOrderStatus(activeCompanyId || 0);
  const updateStatus = useUpdateOrderStatus();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = orders?.filter((o: any) => 
    o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusUpdate = (orderId: number, status: string) => {
    if (!activeCompanyId) return;
    updateStatus.mutate({ id: orderId, status, companyId: activeCompanyId });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">Live Restaurant Orders</h1>
          <p className="text-slate-500 mt-0.5 text-sm font-medium italic">Track and manage active kitchen orders in real-time</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by order #, customer or invoice..." 
              className="pl-9 h-11 border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Badge variant="outline" className="px-4 py-2 border-slate-200 bg-slate-50 text-slate-600 font-bold">
              {orders?.length || 0} Total Active
            </Badge>
          </div>
        </div>

        <Card className="glass-card border-none overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="py-4 pl-6 font-black uppercase tracking-wider text-[10px] text-slate-400">Order</TableHead>
                  <TableHead className="py-4 font-black uppercase tracking-wider text-[10px] text-slate-400">Type</TableHead>
                  <TableHead className="py-4 font-black uppercase tracking-wider text-[10px] text-slate-400">Customer</TableHead>
                  <TableHead className="py-4 font-black uppercase tracking-wider text-[10px] text-slate-400">Items</TableHead>
                  <TableHead className="py-4 font-black uppercase tracking-wider text-[10px] text-slate-400">Wait Time</TableHead>
                  <TableHead className="py-4 font-black uppercase tracking-wider text-[10px] text-slate-400">Status</TableHead>
                  <TableHead className="py-4 pr-6 text-right font-black uppercase tracking-wider text-[10px] text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order: any) => (
                  <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setLocation(`/invoices/${order.id}`)}>
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 font-black text-sm border border-violet-100">
                          {order.orderNumber}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{order.invoiceNumber}</span>
                          <span className="text-[10px] text-slate-400 font-medium italic">{format(new Date(order.issueDate), "HH:mm")}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.diningOption === 'delivery' ? (
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 w-fit text-[10px] font-black">DELIVERY</Badge>
                          {order.deliveryAddress && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 max-w-[150px] truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {order.deliveryAddress}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-bold">
                          {order.diningOption?.toUpperCase() || 'DINE IN'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{order.customerName || 'Walk-in'}</span>
                        {order.customerPhone && <span className="text-[10px] text-slate-400">{order.customerPhone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-600">
                        {order.items?.length || 0} items
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(order.createdAt || order.issueDate))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`
                        font-bold text-[10px] px-2 py-0.5 rounded-full
                        ${order.orderStatus === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : ''}
                        ${order.orderStatus === 'preparing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : ''}
                        ${order.orderStatus === 'ready' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : ''}
                      `}>
                        {order.orderStatus?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {order.orderStatus === 'pending' && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50" onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                            <Utensils className="w-3 h-3 mr-1.5" /> Start
                          </Button>
                        )}
                        {order.orderStatus === 'preparing' && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50" onClick={() => handleStatusUpdate(order.id, 'ready')}>
                            <CheckCircle2 className="w-3 h-3 mr-1.5" /> Ready
                          </Button>
                        )}
                        {order.orderStatus === 'ready' && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800" onClick={() => handleStatusUpdate(order.id, 'served')}>
                            Finish
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">
                      No active orders match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
