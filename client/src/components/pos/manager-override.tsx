import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Delete, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ManagerOverrideProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthorized: (manager: any) => void;
    title?: string;
    description?: string;
}

export function ManagerOverride({ isOpen, onClose, onAuthorized, title = "Manager Authorization", description = "Enter PIN to proceed" }: ManagerOverrideProps) {
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

    const handleVerify = async () => {
        if (!pin || pin.length < 4) return;
        setIsLoading(true);

        try {
            const res = await apiFetch(`/api/companies/${companyId}/auth/verify-manager-pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin })
            });

            const data = await res.json();

            if (res.ok && data.authorized) {
                toast({ title: "Authorized", description: `Approved by ${data.manager.name}` });
                onAuthorized(data.manager);
                setPin("");
                onClose();
            } else {
                toast({ title: "Access Denied", description: "Invalid PIN", variant: "destructive" });
                setPin("");
            }
        } catch (error) {
            toast({ title: "Error", description: "Verification failed", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInput = (val: string) => {
        if (isLoading) return;
        if (val === "DEL") setPin(prev => prev.slice(0, -1));
        else if (val === "CLEAR") setPin("");
        else if (pin.length < 6) setPin(prev => prev + val);
    };

    const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "DEL"];

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
                <div className="bg-slate-900 p-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-black">{title}</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">{description}</p>
                </div>

                <div className="p-8 bg-white space-y-6">
                    <div className="flex justify-center mb-6">
                        <div className="flex gap-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={cn(
                                    "w-4 h-4 rounded-full border-2 transition-all",
                                    pin.length > i ? "bg-slate-900 border-slate-900 scale-110" : "border-slate-200"
                                )} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {buttons.map(btn => (
                            <Button
                                key={btn}
                                variant="ghost"
                                disabled={isLoading}
                                className={cn(
                                    "h-16 text-xl font-black rounded-2xl transition-all active:scale-95",
                                    btn === "DEL" ? "text-red-500 hover:bg-red-50" :
                                        btn === "CLEAR" ? "text-orange-500 text-xs font-bold uppercase hover:bg-orange-50" :
                                            "bg-slate-50 hover:bg-slate-100 text-slate-700"
                                )}
                                onClick={() => handleInput(btn)}
                            >
                                {btn === "DEL" ? <Delete className="h-6 w-6" /> : btn}
                            </Button>
                        ))}
                    </div>

                    <Button
                        className="w-full h-14 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                        onClick={handleVerify}
                        disabled={pin.length < 4 || isLoading}
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
