import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

interface EmailInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultEmail?: string;
    onSend: (email: string) => Promise<void>;
    isSending: boolean;
}

export function EmailInvoiceDialog({ open, onOpenChange, defaultEmail, onSend, isSending }: EmailInvoiceDialogProps) {
    const [email, setEmail] = useState(defaultEmail || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(email);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Invoice via Email</DialogTitle>
                    <DialogDescription>
                        Enter the recipient's email address. A PDF copy of the invoice will be attached.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Recipient Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="customer@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSending || !email}>
                            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                            Send Email
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
