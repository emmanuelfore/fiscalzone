import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, RefreshCw, Settings } from "lucide-react";
import { Link } from "wouter";

interface SmartFixDialogProps {
    isOpen: boolean;
    onClose: () => void;
    error: any;
    onRetry: () => void;
}

export function SmartFixDialog({ isOpen, onClose, error, onRetry }: SmartFixDialogProps) {
    if (!error) return null;

    // Analyze error to determine type
    const errorMessage = error.message || String(error);
    const isDayClosed = errorMessage.includes("Fiscal Day Closed") || errorMessage.includes("fiscal day is closed");
    const isOffline = errorMessage.includes("offline") || errorMessage.includes("Network Error") || errorMessage.includes("fetch failed");
    const isCertError = errorMessage.includes("certificate") || errorMessage.includes("keys");

    let title = "Fiscalization Issue";
    let description = "An error occurred while processing the invoice.";
    let action = null;

    if (isDayClosed) {
        title = "Fiscal Day Closed";
        description = "The system attempted to open the fiscal day automatically but failed. This usually happens if the previous day wasn't closed properly or there is a data mismatch.";
        action = (
            <Link href="/zimra-settings">
                <Button variant="default" className="w-full sm:w-auto">
                    <Settings className="w-4 h-4 mr-2" />
                    Go to ZIMRA Settings
                </Button>
            </Link>
        );
    } else if (isOffline) {
        title = "Connection Issue";
        description = "The device appears to be offline or unreachable. The invoice has been queued safely and will be processed when the connection is restored.";
        action = (
            <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
                Got it, thanks
            </Button>
        );
    } else if (isCertError) {
        title = "Certificate Error";
        description = "There seems to be an issue with your ZIMRA digital certificate. You may need to re-issue it.";
        action = (
            <Link href="/zimra-settings">
                <Button variant="destructive" className="w-full sm:w-auto">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Manage Certificates
                </Button>
            </Link>
        );
    } else {
        // Generic Retry
        action = (
            <Button onClick={onRetry} variant="default" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Action
            </Button>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertCircle className="w-6 h-6" />
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-600 pt-2 text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-xs text-slate-500 font-mono break-all my-2">
                    Details: {errorMessage}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Dismiss
                    </Button>
                    {action}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { ShieldCheck } from "lucide-react";
