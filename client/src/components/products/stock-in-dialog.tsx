
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useStockIn } from "@/hooks/use-inventory";
import { type Product } from "@shared/schema";
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
import { PlusCircle, Loader2, Package } from "lucide-react";
import { useState } from "react";

const stockInSchema = z.object({
    productId: z.number(),
    quantity: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive()),
    unitCost: z.string().transform((v) => parseFloat(v)).pipe(z.number().nonnegative()),
    supplierId: z.string().optional().transform((v) => v ? parseInt(v) : undefined),
    notes: z.string().optional(),
});

type StockInFormValues = z.infer<typeof stockInSchema>;

export function StockInDialog({ product, companyId }: { product: Product, companyId: number }) {
    const [open, setOpen] = useState(false);
    const { data: suppliers } = useSuppliers(companyId);
    const stockInMutation = useStockIn(companyId);

    const form = useForm<StockInFormValues>({
        // @ts-ignore
        resolver: zodResolver(stockInSchema),
        defaultValues: {
            productId: product.id,
            quantity: "" as any,
            unitCost: (product.unitCost?.toString() || "") as any,
            supplierId: "" as any,
            notes: "",
        },
    });

    const onSubmit = async (data: StockInFormValues) => {
        try {
            await stockInMutation.mutateAsync(data);
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error("Failed to record stock-in:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300">
                    <PlusCircle className="w-4 h-4" />
                    Stock In
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                        <Package className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">Record Stock In</DialogTitle>
                    <DialogDescription>
                        Adding stock for <span className="font-bold text-slate-900">{product.name}</span>. This will update the average cost and current stock level.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Quantity Received</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unitCost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Unit Cost (Base)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Supplier (Optional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value?.toString() || ""}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500/20">
                                                <SelectValue placeholder="Select supplier" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl shadow-xl">
                                            {suppliers?.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Notes / Reference</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="GRN Number, Invoice Ref, etc." className="resize-none rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={stockInMutation.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                                {stockInMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Complete Stock In
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
