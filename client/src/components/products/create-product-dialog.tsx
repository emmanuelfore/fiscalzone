
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { useCreateProduct } from "@/hooks/use-products";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function CreateProductDialog({ companyId, defaultType = "good", triggerLabel = "Add Product" }: { companyId: number, defaultType?: "good" | "service", triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const createProduct = useCreateProduct(companyId);
    const { taxCategories, taxTypes } = useTaxConfig(companyId);
    const { toast } = useToast();

    const { data: categories } = useQuery({
        queryKey: ["product-categories", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/product-categories?companyId=${companyId}`);
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
        },
        enabled: open
    });

    const form = useForm<InsertProduct>({
        resolver: zodResolver(insertProductSchema),
        defaultValues: {
            name: "",
            description: "",
            sku: "",
            barcode: "",
            hsCode: "",
            category: "",
            price: "0.00",
            costPrice: "0.00",
            taxRate: "15.00",
            taxCategoryId: undefined, // Will be set by select
            isActive: true,
            isTracked: defaultType === "good",
            stockLevel: "0",
            lowStockThreshold: "10",
            productType: defaultType,
            companyId: companyId,
            taxTypeId: undefined,
        },
    });



    const onSubmit = async (data: InsertProduct) => {
        try {
            const { companyId: _, ...rest } = data;
            await createProduct.mutateAsync({ ...rest, productType: defaultType });
            toast({
                title: "Success",
                description: `${defaultType === "service" ? "Service" : "Product"} created successfully.`,
            });
            setOpen(false);
            form.reset({ ...form.getValues(), name: "", description: "", price: "0.00" });
        } catch (error: any) {
            console.error("Failed to create product:", error);
            toast({
                title: "Creation Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    const isTracked = form.watch("isTracked");
    const isService = defaultType === "service";

    const [selectedTaxTypeId, setSelectedTaxTypeId] = useState<string | undefined>(undefined);

    // Sync with default value or tax types load
    useEffect(() => {
        if (taxTypes.data && !selectedTaxTypeId && open) {
            const defaultType = taxTypes.data?.find(t => t.rate === form.getValues("taxRate"));
            if (defaultType) setSelectedTaxTypeId(defaultType.id.toString());
        }
    }, [taxTypes.data, open]);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setSelectedTaxTypeId(undefined);
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                    <Plus className="w-4 h-4" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">Add New {isService ? "Service" : "Product"}</DialogTitle>
                    <DialogDescription>
                        Create a {isService ? "service offering" : "physical product"} to add to your invoices.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">{isService ? "Service Name" : "Product Name"}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={isService ? "e.g. Consulting, Labor" : "e.g. Widget X"} {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
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
                                        defaultValue={field.value || undefined}
                                        value={field.value || undefined}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl shadow-xl">
                                            {categories?.map((cat: any) => (
                                                <SelectItem key={cat.id} value={cat.name}>
                                                    {cat.name}
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Details..." className="resize-none h-20 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" value={field.value || ""} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Tax Configuration Section */}
                        <div className="rounded-2xl bg-blue-50/50 p-5 border border-blue-100 space-y-4">
                            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                Tax Configuration
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="taxRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs uppercase tracking-wide text-blue-700 font-semibold">ZIMRA Tax Type</FormLabel>
                                            <Select
                                                onValueChange={(val) => {
                                                    setSelectedTaxTypeId(val);
                                                    const selectedType = taxTypes.data?.find((t: any) => t.id.toString() === val);
                                                    if (selectedType) {
                                                        field.onChange(selectedType.rate);
                                                        form.setValue("taxTypeId", selectedType.id);
                                                        form.setValue("taxCategoryId", null);
                                                    }
                                                }}
                                                value={selectedTaxTypeId}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="rounded-xl bg-white border-blue-200 focus:ring-blue-500/20 text-slate-700">
                                                        <SelectValue placeholder="Select Tax Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl shadow-xl">
                                                    {taxTypes.data?.map((t: any) => (
                                                        <SelectItem key={t.id} value={t.id.toString()}>
                                                            {t.name} ({t.rate}%)
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
                                    name="hsCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs uppercase tracking-wide text-blue-700 font-semibold">HS Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Fiscal Code" className="rounded-xl bg-white border-blue-200 focus-visible:ring-blue-500/20 font-mono text-sm" value={field.value || ""} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Selling Price ($)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">SKU / Code <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="Required" value={field.value || ""} onChange={field.onChange} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {!isService && (
                                <FormField
                                    control={form.control}
                                    name="barcode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-semibold">Barcode</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional" value={field.value || ""} onChange={field.onChange} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {!isService && (
                            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50">
                                <FormField
                                    control={form.control}
                                    name="isTracked"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 p-4 shadow-sm bg-white">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-semibold text-slate-700">Track Inventory</FormLabel>
                                                <FormDescription>
                                                    Enable stock tracking for this item
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value || false}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {isTracked && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="stockLevel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 font-semibold">Current Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || "0"} className="rounded-xl bg-white border-slate-200 focus-visible:ring-primary/20" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="lowStockThreshold"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 font-semibold">Low Stock Alert</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || "10"} className="rounded-xl bg-white border-slate-200 focus-visible:ring-primary/20" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createProduct.isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save {isService ? "Service" : "Product"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
