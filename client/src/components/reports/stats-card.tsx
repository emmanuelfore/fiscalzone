
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: any;
    isLoading?: boolean;
    symbol?: string;
    decimals?: number;
    icon?: LucideIcon;
    color?: string;
    bg?: string;
}

export function StatsCard({ 
    title, 
    value, 
    isLoading, 
    symbol = "$", 
    decimals = 2, 
    icon: Icon, 
    color, 
    bg 
}: StatsCardProps) {
    return (
        <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-slate-100">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black font-sans text-slate-400 uppercase tracking-widest">{title}</p>
                    {Icon && (
                        <div className={cn("p-2.5 rounded-2xl group-hover:scale-110 transition-transform duration-300", bg)}>
                            <Icon className={cn("w-5 h-5", color)} />
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div className="h-9 w-2/3 bg-slate-50 animate-pulse rounded-xl" />
                ) : (
                    <h3 className="text-2xl font-black font-display text-slate-900 tracking-tight">
                        {symbol}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                    </h3>
                )}
            </CardContent>
        </Card>
    );
}
