import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAddPayment } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
    }),
    paymentMethod: z.string().min(1, "Payment method is required"),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

interface PaymentModalProps {
    invoice: any;
    remainingBalance: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PaymentModal({
    invoice,
    remainingBalance,
    open,
    onOpenChange,
}: PaymentModalProps) {
    const addPayment = useAddPayment();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: remainingBalance.toFixed(2),
            paymentMethod: "CASH",
            reference: "",
            notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                amount: remainingBalance.toFixed(2),
                paymentMethod: "CASH",
                reference: "",
                notes: "",
            });
        }
    }, [open, remainingBalance, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await addPayment.mutateAsync({
                invoiceId: invoice.id,
                data: {
                    ...values,
                    // Convert string amount to number/decimal string for API
                    amount: values.amount,
                    currency: invoice.currency || "USD",
                    exchangeRate: invoice.exchangeRate || "1.000000",
                },
            });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Add a payment for Invoice #{invoice.invoiceNumber}.
                        Remaining Balance: {invoice.currency} {remainingBalance.toFixed(2)}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount ({invoice.currency})</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" step="0.01" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="CASH">Cash</SelectItem>
                                            <SelectItem value="CARD">Card / Swipe</SelectItem>
                                            <SelectItem value="ECOCASH">EcoCash / Mobile</SelectItem>
                                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference (Optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. Transaction ID, Check #" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Any additional details..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addPayment.isPending}>
                                {addPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Record Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
