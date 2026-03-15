import { useState, useEffect } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, X } from "lucide-react";

export function PwaInstallPrompt() {
    const { isInstallable, promptInstall } = usePwaInstall();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Only show if installable and user hasn't previously dismissed it
        const hasDismissed = localStorage.getItem("pwa_install_dismissed");

        if (isInstallable && !hasDismissed) {
            // Add a small delay so it doesn't interrupt immediate app loading
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [isInstallable]);

    const handleInstall = async () => {
        setIsOpen(false);
        await promptInstall();
    };

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem("pwa_install_dismissed", "true");
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            handleDismiss();
        }
    };

    if (!isInstallable) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-col items-center gap-4 text-center sm:text-center mt-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <MonitorSmartphone className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-semibold tracking-tight">Install FiscalStack</DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground">
                            Add our app to your home screen for a faster, full-screen experience and true offline support.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <DialogFooter className="flex-col sm:flex-col gap-2 mt-6 pb-2">
                    <Button size="lg" className="w-full text-md font-medium" onClick={handleInstall}>
                        Install App Now
                    </Button>
                    <Button variant="ghost" size="lg" className="w-full" onClick={handleDismiss}>
                        Maybe Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
