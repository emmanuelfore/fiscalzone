import { useActiveCompany } from "@/hooks/use-active-company";
import { useOrderStatus } from "@/hooks/use-invoices";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Utensils, CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderStatus() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const companyUrlId = searchParams.get("companyId");
  const { activeCompanyId } = useActiveCompany();
  const companyId = companyUrlId ? parseInt(companyUrlId) : activeCompanyId;

  const { data: orders, isLoading } = useOrderStatus(companyId || 0);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const preparing = orders?.filter((o: any) => o.orderStatus === 'preparing' || o.orderStatus === 'pending') || [];
  const ready = orders?.filter((o: any) => o.orderStatus === 'ready') || [];

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="flex h-24 items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40 px-10 py-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Utensils className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">Order Board</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tracking-widest text-zinc-500 uppercase">Current Time</p>
            <p className="text-2xl font-mono font-bold text-zinc-200">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </header>

        {/* Main Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preparing Column */}
          <div className="flex flex-1 flex-col border-r border-zinc-800/40 bg-zinc-900/10">
            <div className="flex items-center gap-3 bg-zinc-800/20 px-10 py-8 shadow-inner">
              <PlayCircle className="h-10 w-10 text-amber-500" />
              <h2 className="text-5xl font-black tracking-tighter text-amber-500 uppercase italic">Preparing</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              <div className="flex flex-wrap gap-8">
                <AnimatePresence mode="popLayout">
                  {preparing.map((order: any) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex h-36 w-36 items-center justify-center rounded-3xl border-2 border-amber-500/20 bg-amber-500/5 shadow-lg shadow-amber-500/5"
                    >
                      <span className="text-6xl font-black text-amber-400 font-mono">
                        {order.orderNumber.replace('#', '')}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {preparing.length === 0 && (
                  <div className="flex flex-1 items-center justify-center pt-20 text-zinc-600 opacity-20">
                    <p className="text-2xl font-bold uppercase italic">No Orders Preparing</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ready Column */}
          <div className="flex flex-1 flex-col bg-zinc-900/30">
            <div className="flex items-center gap-3 bg-emerald-500/10 px-10 py-8 shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h2 className="text-5xl font-black tracking-tighter text-emerald-500 uppercase italic">Ready</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              <div className="flex flex-wrap gap-8">
                <AnimatePresence mode="popLayout">
                  {ready.map((order: any) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.5, y: -50 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 100 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 15,
                        layout: { duration: 0.3 }
                      }}
                      className="flex h-44 w-44 items-center justify-center rounded-[2.5rem] border-4 border-emerald-500/40 bg-emerald-500/20 shadow-2xl shadow-emerald-500/20 ring-4 ring-emerald-500/10"
                    >
                      <div className="relative">
                        <span className="text-8xl font-black text-white font-mono drop-shadow-lg">
                          {order.orderNumber.replace('#', '')}
                        </span>
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400"
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {ready.length === 0 && (
                  <div className="flex flex-1 items-center justify-center pt-20 text-zinc-600 opacity-20">
                    <p className="text-2xl font-bold uppercase italic font-mono">No Orders Ready</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Marquee or Info */}
        <footer className="h-16 border-t border-zinc-800/50 bg-zinc-900/60 px-10 py-4 backdrop-blur-sm">
          <p className="text-center font-bold tracking-widest text-zinc-500 uppercase">
             Please present your order number at the counter when called
          </p>
        </footer>
      </div>
    </div>
  );
}
