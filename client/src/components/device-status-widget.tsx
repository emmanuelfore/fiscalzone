import { useDeviceStatus } from "@/hooks/use-device-status";
import { Badge } from "@/components/ui/badge";
import { Loader2, Server, AlertCircle, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";

export function DeviceStatusWidget({ companyId }: { companyId: number }) {
    const { data: status, isLoading, isError } = useDeviceStatus(companyId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            </div>
        );
    }

    if (isError || !status) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/zimra-settings">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors">
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Error</span>
                            </div>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Failed to check device status</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (!status.isConfigured) {
        return (
            <Link href="/zimra-settings">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Setup Device</span>
                </div>
            </Link>
        );
    }

    // Determine state
    const isDayOpen = status.fiscalDayOpen;
    const isCloseFailed = status.fiscalDayStatus === 'FiscalDayCloseFailed';

    // Logic: 
    // Close Failed = Red (Critical)
    // Online + Day Open = Green
    // Online + Day Closed = Yellow (Warning)
    // Offline = Red

    let state: 'online' | 'warning' | 'offline' | 'error' = "online";
    if (!status.isOnline) state = "offline";
    else if (isCloseFailed) state = "error";
    else if (!isDayOpen) state = "warning";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href="/zimra-settings">
                        <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200
                        ${state === 'online' ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100' : ''}
                        ${state === 'warning' ? 'bg-amber-50 border-amber-100 hover:bg-amber-100' : ''}
                        ${state === 'offline' ? 'bg-slate-50 border-slate-100 hover:bg-slate-100' : ''}
                        ${state === 'error' ? 'bg-red-50 border-red-100 animate-pulse hover:bg-red-100 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''}
                    `}>
                            <div className={`w-2 h-2 rounded-full ${state === 'online' ? 'bg-emerald-500 animate-pulse' :
                                    state === 'warning' ? 'bg-amber-500' : 
                                    state === 'error' ? 'bg-red-500' : 'bg-slate-400'
                                }`} />
                            <span className={`text-[10px] font-black uppercase tracking-wide ${state === 'online' ? 'text-emerald-700' :
                                    state === 'warning' ? 'text-amber-700' : 
                                    state === 'error' ? 'text-red-700' : 'text-slate-500'
                                }`}>
                                {state === 'online' ? 'Fiscal Day Open' :
                                    state === 'warning' ? 'Fiscal Day Closed' : 
                                    state === 'error' ? 'CLOSE FAILED!' : 'Offline'}
                            </span>
                            {(state === 'warning' || state === 'error') && (
                                <AlertCircle className={`w-3 h-3 ml-1 ${state === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                            )}
                        </div>
                    </Link>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-xs space-y-1">
                        <p className="font-bold">Device Status: {status.isOnline ? 'Online' : 'Offline'}</p>
                        <p>{isDayOpen ? `Fiscal Day ${status.fiscalDayNumber} Open` : 'Fiscal Day is Closed'}</p>
                        {status.lastSync && <p className="text-slate-400">Last Open: {new Date(status.lastSync).toLocaleTimeString()}</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
