import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  children
}: {
  status: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    issued: "bg-blue-100 text-blue-700 border-blue-200",
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    overdue: "bg-rose-100 text-rose-700 border-rose-200",
    quote: "bg-indigo-100 text-indigo-700 border-indigo-200",
    fiscalized: "bg-green-100 text-green-700 border-green-200",
    "pending-sync": "bg-orange-100 text-orange-700 border-orange-200 animate-pulse",
  };

  const style = styles[status.toLowerCase()] || styles.draft;

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wide",
      style,
      className
    )}>
      {children || status}
    </span>
  );
}
