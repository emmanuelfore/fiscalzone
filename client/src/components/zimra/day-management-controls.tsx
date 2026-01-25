
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ZReportPDF } from "@/components/invoices/z-report-pdf";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface DayManagementControlsProps {
    company: any;
    variant?: 'light' | 'dark';
}

export function DayManagementControls({ company, variant = 'light' }: DayManagementControlsProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [errorRecovery, setErrorRecovery] = useState<any>(null);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const isRegistered = !!company.fdmsDeviceId && !!company.zimraCertificate;

    // Live Status Query
    const zimraStatusQuery = useQuery({
        queryKey: ["zimraStatus", company.id],
        queryFn: async () => {
            if (!isRegistered) return null;
            const res = await apiFetch(`/api/companies/${company.id}/zimra/status`);
            if (!res.ok) return null;
            return await res.json();
        },
        enabled: isRegistered
    });

    const isOpen = zimraStatusQuery.data?.fiscalDayStatus === 'FiscalDayOpened' || (!zimraStatusQuery.data && company.fiscalDayOpen);
    const fiscalDayNo = zimraStatusQuery.data?.lastFiscalDayNo || company.currentFiscalDayNo || "N/A";

    // Close Day Mutation
    const closeDayMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${company.id}/zimra/day/close`, {
                method: "POST"
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw errorData;
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
            queryClient.invalidateQueries({ queryKey: ["zimraStatus", company.id] });
            queryClient.invalidateQueries({ queryKey: ["stats", "summary", company.id] });
            queryClient.invalidateQueries({ queryKey: ["zReport", company.id] });
            toast({ title: "Fiscal Day Closed", description: `Operation ID: ${data.operationID || 'N/A'}`, className: "bg-green-100 text-green-900" });
        },
        onError: (err: any) => {
            if (err.recovery) {
                setErrorRecovery(err);
                setShowErrorDialog(true);
            } else {
                toast({
                    title: "Close Day Failed",
                    description: err.message || "Unknown error occurred",
                    variant: "destructive"
                });
            }
        }
    });

    // Open Day Mutation (Mainly for dashboard use since settings might not have it prominent)
    const openDayMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${company.id}/zimra/day/open`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to open fiscal day");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Fiscal Day Opened",
                description: `Successfully opened day ${data.fiscalDayNo}.`,
                className: "bg-emerald-600 text-white"
            });
            queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
            queryClient.invalidateQueries({ queryKey: ["zimraStatus", company.id] });
            queryClient.invalidateQueries({ queryKey: ["zReport", company.id] });
        },
        onError: (err: Error) => {
            toast({
                title: "Opening Failed",
                description: err.message,
                variant: "destructive",
            });
        }
    });

    const isLight = variant === 'light';
    const textColor = isLight ? 'text-slate-900' : 'text-white';
    const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';
    const boxBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10';

    return (
        <div className="space-y-4">
            <div className={`${boxBg} p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <div className="text-center sm:text-left">
                    <p className={`text-xs uppercase tracking-wider font-semibold ${subTextColor}`}>Fiscal Day {fiscalDayNo}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xl font-bold ${textColor}`}>
                            {isOpen ? "Status: OPEN" : "Status: CLOSED"}
                        </p>
                        {zimraStatusQuery.isLoading && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    {/* X-Report (Only when open) */}
                    {isOpen && <XReportButton companyId={company.id} variant={variant} />}

                    {/* Z-Report (For closed days or after successful closure) */}
                    {!isOpen && <ZReportButton companyId={company.id} variant={variant} closeDayData={closeDayMutation.data} />}

                    {isOpen ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            className={!isLight ? "bg-red-600 hover:bg-red-700 h-9 font-bold px-4" : ""}
                            onClick={() => {
                                if (confirm("Are you sure you want to close the fiscal day?")) {
                                    closeDayMutation.mutate();
                                }
                            }}
                            disabled={closeDayMutation.isPending}
                        >
                            {closeDayMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Close Fiscal Day
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            className={!isLight ? "bg-emerald-600 hover:bg-emerald-700 h-9 font-bold px-4 text-white" : "bg-emerald-600 hover:bg-emerald-700"}
                            onClick={() => openDayMutation.mutate()}
                            disabled={openDayMutation.isPending}
                        >
                            {openDayMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Open Fiscal Day
                        </Button>
                    )}
                </div>
            </div>

            {/* Error Recovery Dialog */}
            <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                <DialogContent className="sm:max-w-lg border-2 border-red-100">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertTriangle className="w-6 h-6" />
                            <DialogTitle>Fiscal Day Closure Failed</DialogTitle>
                        </div>
                        <DialogDescription className="font-medium text-slate-700">
                            {errorRecovery?.message}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-3 rounded text-xs font-mono border text-slate-600">
                            {errorRecovery?.lastError && <p className="mb-1"><strong>Error:</strong> {errorRecovery.lastError}</p>}
                            {errorRecovery?.zimraErrorCode && <p><strong>Code:</strong> {errorRecovery.zimraErrorCode}</p>}
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-900">Suggested Recovery Actions:</h4>
                            <ul className="space-y-2">
                                {errorRecovery?.recovery?.options?.map((option: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                        {option}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowErrorDialog(false)}>Dismiss</Button>
                        <Button variant="default" onClick={() => { setShowErrorDialog(false); closeDayMutation.mutate(); }}>Retry Closure</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function XReportButton({ companyId, variant }: { companyId: number, variant: 'light' | 'dark' }) {
    const { data: reportData, isLoading, refetch } = useQuery({
        queryKey: ["xReport", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/zimra/day/x-report`);
            if (!res.ok) throw new Error("Failed to fetch X-report data");
            return await res.json();
        },
        enabled: false
    });

    const isLight = variant === 'light';

    if (reportData) {
        return (
            <PDFDownloadLink
                document={<ZReportPDF data={reportData} isZReport={false} />}
                fileName={`X-Report-Day-${reportData.fiscalDayNo}.pdf`}
            >
                {({ loading }) => (
                    <Button variant="outline" size="sm" className={!isLight ? "bg-white/10 text-white border-white/20 hover:bg-white/20" : ""}>
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? "Preparing..." : "Download X-Report"}
                    </Button>
                )}
            </PDFDownloadLink>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className={!isLight ? "bg-white/10 text-white border-white/20 hover:bg-white/20" : ""}
        >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate X-Report
        </Button>
    );
}

function ZReportButton({ companyId, variant, closeDayData }: { companyId: number, variant: 'light' | 'dark', closeDayData?: any }) {
    // Fetch Z-report data automatically for closed days
    const { data: reportData, isLoading } = useQuery({
        queryKey: ["zReport", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/zimra/day/z-report`);
            if (!res.ok) {
                // If it fails, it might be because the day is still open
                return null;
            }
            return await res.json();
        },
        enabled: true, // Always try to fetch
        retry: false,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    });

    const isLight = variant === 'light';

    // Use data from close mutation if available, otherwise use fetched data
    const data = closeDayData?.reportData || reportData;

    if (isLoading) {
        return (
            <Button variant="outline" size="sm" disabled className={!isLight ? "bg-white/10 text-white border-white/20" : ""}>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
            </Button>
        );
    }

    if (!data) {
        return null; // Don't show button if no data available
    }

    return (
        <PDFDownloadLink
            document={<ZReportPDF data={data} isZReport={true} />}
            fileName={`Z-Report-Day-${data.fiscalDayNo}.pdf`}
        >
            {({ loading }) => (
                <Button variant="outline" size="sm" className={!isLight ? "bg-white/10 text-white border-white/20 hover:bg-white/20" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"}>
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? "Preparing..." : "Download Z-Report"}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
