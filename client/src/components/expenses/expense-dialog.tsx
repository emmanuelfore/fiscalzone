
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, type InsertExpense, type Expense } from "@shared/schema";
import { useCreateExpense, useUpdateExpense } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Plus, Loader2, ReceiptText } from "lucide-react";
import { useState } from "react";

const expenseCategories = [
    "Rent",
    "Utilities",
    "Salary",
    "Marketing",
    "Equipment",
    "Inventory Purchase",
    "Software",
    "Taxes",
    "Legal & Professional",
    "Travel",
    "Other"
];

const paymentMethods = [
    "Cash",
    "Bank Transfer",
    "Card",
    "Mobile Money",
    "Other"
];

interface Props {
    companyId: number;
    expense?: Expense;
    trigger?: React.ReactNode;
}

export function ExpenseDialog({ companyId, expense, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const createExpense = useCreateExpense(companyId);
    const updateExpense = useUpdateExpense();
    const { data: suppliers } = useSuppliers(companyId);

    const isEditing = !!expense;

    const form = useForm<InsertExpense>({
        resolver: zodResolver(insertExpenseSchema),
        defaultValues: {
            companyId: companyId,
            description: expense?.description || "",
            amount: expense?.amount || "0",
            category: expense?.category || "Other",
            currency: expense?.currency || "USD",
            supplierId: expense?.supplierId || undefined,
            expenseDate: expense?.expenseDate ? new Date(expense.expenseDate) : new Date(),
            paymentMethod: expense?.paymentMethod || "Cash",
            reference: expense?.reference || "",
            status: expense?.status || "paid",
            notes: expense?.notes || "",
        },
    });

    const onSubmit = async (data: InsertExpense) => {
        try {
            if (isEditing) {
                await updateExpense.mutateAsync({ id: expense.id, data });
            } else {
                await createExpense.mutateAsync(data);
            }
            setOpen(false);
            if (!isEditing) form.reset();
        } catch (error) {
            console.error("Failed to save expense:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                        <Plus className="w-4 h-4" />
                        Record Expense
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                        <ReceiptText className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">
                        {isEditing ? "Edit Expense" : "Record New Expense"}
                    </DialogTitle>
                    <DialogDescription>
                        Track your business spending for accurate profit and loss reporting.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <div className="grid grid-cols-2 gap-5">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="What was this for?" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Category</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-amber-500/20">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                {expenseCategories.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-5">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Currency</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-amber-500/20">
                                                    <SelectValue placeholder="Cur" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="ZWG">ZWG</SelectItem>
                                                <SelectItem value="ZAR">ZAR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Status</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-amber-500/20">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <FormField
                                control={form.control}
                                name="expenseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Date</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                                className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Vendor / Supplier</FormLabel>
                                        <Select
                                            onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}
                                            value={field.value?.toString() || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-amber-500/20">
                                                    <SelectValue placeholder="Select vendor" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                <SelectItem value="none">None</SelectItem>
                                                {suppliers?.map((s) => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Payment Method</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || "Cash"}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-amber-500/20">
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                {paymentMethods.map((m) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
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
                                        <FormLabel className="text-slate-700 font-semibold">Reference #</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Receipt, Ref ID, etc." {...field} value={field.value || ""} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Additional Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Additional details..." className="resize-none rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20">
                                {(createExpense.isPending || updateExpense.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {isEditing ? "Update Expense" : "Record Expense"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
