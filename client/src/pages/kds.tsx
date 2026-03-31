import { useActiveCompany } from "@/hooks/use-active-company";
import { useOrderStatus, useUpdateOrderStatus } from "@/hooks/use-invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, Utensils, Clock, AlertCircle, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function KDS() {
  const { activeCompanyId } = useActiveCompany();
  const { data: orders, isLoading } = useOrderStatus(activeCompanyId || 0);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (orderId: number, status: string) => {
    if (!activeCompanyId) return;
    updateStatus.mutate({ id: orderId, status, companyId: activeCompanyId });
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Kitchen Display System</h1>
          <p className="text-zinc-400">Manage active restaurant orders</p>
        </div>
        <Badge variant="outline" className="border-zinc-800 bg-zinc-900/50 px-4 py-2 text-lg text-emerald-400">
          {orders?.length || 0} Active Orders
        </Badge>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {orders?.map((order: any) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden border-zinc-800 bg-zinc-900/40 shadow-2xl backdrop-blur-md">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/50 bg-zinc-800/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <span className="text-sm font-bold">{order.orderNumber}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-white">Order {order.orderNumber}</CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.createdAt || order.issueDate), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={`
                        ${order.orderStatus === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                        ${order.orderStatus === 'preparing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                        ${order.orderStatus === 'ready' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                      `}
                      variant="outline"
                    >
                      {order.orderStatus?.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Customer & Delivery Info */}
                      {(order.customerName || order.diningOption === 'delivery' || order.diningOption === 'takeaway') && (
                        <div className="rounded-md border border-zinc-700/50 bg-zinc-800/30 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white uppercase italic">{order.customerName || 'Online Order'}</span>
                            {order.diningOption === 'delivery' && (
                              <Badge className="bg-amber-600 font-bold h-5 text-[10px]">DELIVERY</Badge>
                            )}
                            {order.diningOption === 'takeaway' && (
                              <Badge variant="outline" className="text-zinc-400 h-5 text-[10px]">PICKUP</Badge>
                            )}
                          </div>
                          
                          {order.deliveryAddress && (
                            <div className="mt-2 text-xs text-zinc-400 flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 text-zinc-500 shrink-0" />
                              <span>{order.deliveryAddress}</span>
                            </div>
                          )}
                          {order.deliveryNotes && (
                            <div className="mt-1.5 text-xs text-amber-200/80 bg-amber-500/10 rounded p-1.5 border border-amber-500/20 italic">
                              <span className="font-bold uppercase text-amber-500 text-[9px] not-italic mr-1">Note:</span> {order.deliveryNotes}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start justify-between rounded-lg bg-zinc-800/30 p-2.5 transition-colors hover:bg-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-white">
                                {Math.round(item.quantity)}
                              </span>
                              <span className="text-sm font-medium text-zinc-200">{item.productName || item.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {order.orderStatus === 'pending' && (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700" 
                            onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          >
                            <Utensils className="mr-2 h-4 w-4" /> Start Prep
                          </Button>
                        )}
                        {order.orderStatus === 'preparing' && (
                          <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700" 
                            onClick={() => handleStatusUpdate(order.id, 'ready')}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Ready
                          </Button>
                        )}
                        {order.orderStatus === 'ready' && (
                          <Button 
                            className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200" 
                            onClick={() => handleStatusUpdate(order.id, 'served')}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {orders?.length === 0 && (
            <div className="col-span-full mt-20 flex flex-col items-center justify-center text-zinc-500">
              <div className="mb-4 rounded-full bg-zinc-900 p-6">
                <AlertCircle className="h-12 w-12 opacity-20" />
              </div>
              <p className="text-xl font-medium">No active orders</p>
              <p className="text-sm">New orders will appear here automatically</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
