
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useBatchStockIn } from "@/hooks/use-inventory";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Trash2, ListPlus, DollarSign, ListOrdered, X } from "lucide-react";
import { cn } from "@/lib/utils";

const grnItemSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.string().min(1, "Qty required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be > 0"),
    unitCost: z.string().min(1, "Cost required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Must be >= 0"),
});

const grnSchema = z.object({
    supplierId: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(grnItemSchema).min(1, "At least one item is required"),
});

type GrnFormValues = z.infer<typeof grnSchema>;

export function GrnForm() {
    const [open, setOpen] = useState(false);
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: products } = useProducts(companyId);
    const { data: suppliers } = useSuppliers(companyId);
    const { mutate: batchStockIn, isPending } = useBatchStockIn(companyId);
    const { toast } = useToast();

    const form = useForm<GrnFormValues>({
        resolver: zodResolver(grnSchema),
        defaultValues: {
            supplierId: "",
            notes: "",
            items: [{ productId: "", quantity: "", unitCost: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const onSubmit = (values: GrnFormValues) => {
        batchStockIn({
            supplierId: values.supplierId ? parseInt(values.supplierId) : undefined,
            notes: values.notes,
            items: values.items.map(item => ({
                productId: parseInt(item.productId),
                quantity: item.quantity,
                unitCost: item.unitCost,
            })),
        }, {
            onSuccess: () => {
                toast({
                    title: "GRN Recorded",
                    description: "Batch stock has been successfully added to inventory.",
                });
                setOpen(false);
                form.reset();
            },
            onError: (error: any) => {
                toast({
                    title: "Error",
                    description: error.message || "Failed to record GRN",
                    variant: "destructive",
                });
            }
        });
    };

    const currencySymbol = localStorage.getItem("activeCurrency") || "USD";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Record GRN
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] rounded-[1.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black font-display uppercase tracking-tight">Record Goods Received</DialogTitle>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Multi-line batch entry</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 p-6 transition-all duration-300">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="supplierId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 border-slate-200 rounded-lg focus:ring-primary/20">
                                                        <SelectValue placeholder="Select a supplier" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                                    {suppliers?.map((supplier) => (
                                                        <SelectItem key={supplier.id} value={supplier.id.toString()} className="rounded-lg">
                                                            {supplier.name}
                                                        </SelectItem>
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
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference / Notes</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="GRN Number, Batch, etc." className="h-10 border-slate-200 rounded-lg focus:ring-primary/20" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Items Table */}
                            <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 py-2 px-4 grid grid-cols-[1fr,100px,120px,40px] gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unit Cost</span>
                                    <span></span>
                                </div>

                                <div className="divide-y divide-slate-50">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="p-3 grid grid-cols-[1fr,100px,120px,40px] gap-4 items-start group">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.productId`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <Select onValueChange={(val) => {
                                                            field.onChange(val);
                                                            // Auto-fill cost if product is selected
                                                            const p = products?.find(p => p.id.toString() === val);
                                                            if (p) {
                                                                form.setValue(`items.${index}.unitCost`, p.costPrice || "0");
                                                            }
                                                        }} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-9 border-slate-200 rounded-md focus:ring-primary/20 text-xs">
                                                                    <SelectValue placeholder="Select product" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-[300px]">
                                                                {products?.filter(p => p.isTracked).map((product) => (
                                                                    <SelectItem key={product.id} value={product.id.toString()} className="text-xs rounded-lg">
                                                                        {product.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormControl>
                                                            <Input {...field} placeholder="0.00" className="h-9 text-xs border-slate-200 rounded-md focus:ring-primary/20" />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unitCost`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormControl>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{currencySymbol}</span>
                                                                <Input {...field} placeholder="0.00" className="h-9 text-xs pl-8 border-slate-200 rounded-md focus:ring-primary/20 text-right font-mono" />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md"
                                                disabled={fields.length === 1}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-3 bg-slate-50/20 border-t border-slate-50">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({ productId: "", quantity: "", unitCost: "" })}
                                        className="h-8 rounded-lg gap-2 text-xs font-bold border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Line Item
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 sm:justify-between items-center">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items: {fields.length}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold flex-1 sm:flex-none">Cancel</Button>
                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20 flex-1 sm:flex-none"
                            disabled={isPending}
                        >
                            {isPending ? "Recording..." : "Finalize & Record GRN"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
