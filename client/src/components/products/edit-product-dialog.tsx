
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { useUpdateProduct } from "@/hooks/use-products";
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
import { Pencil, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
    product: any;
    trigger?: React.ReactNode;
}

export function EditProductDialog({ product, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const updateProduct = useUpdateProduct();
    const { taxCategories, taxTypes } = useTaxConfig(product.companyId);
    const { toast } = useToast();

    const isService = product.productType === "service";

    const form = useForm<InsertProduct>({
        resolver: zodResolver(insertProductSchema),
        defaultValues: {
            name: product.name,
            description: product.description || "",
            sku: product.sku || "",
            barcode: product.barcode || "",
            hsCode: product.hsCode || "",
            category: product.category || "",
            price: product.price?.toString() || "0.00",
            costPrice: product.costPrice?.toString() || "0.00",
            taxRate: product.taxRate?.toString() || "15.00",
            taxCategoryId: product.taxCategoryId,
            isActive: product.isActive,
            isTracked: product.isTracked,
            stockLevel: product.stockLevel?.toString() || "0",
            lowStockThreshold: product.lowStockThreshold?.toString() || "10",
            productType: product.productType,
            companyId: product.companyId,
            taxTypeId: product.taxTypeId,
        },
    });

    // Auto-update tax rate when category changes


    const onSubmit = async (data: InsertProduct) => {
        try {
            await updateProduct.mutateAsync({ id: product.id, data });
            toast({
                title: "Success",
                description: `${isService ? "Service" : "Product"} updated successfully.`,
            });
            setOpen(false);
        } catch (error: any) {
            console.error("Failed to update product:", error);
            toast({
                title: "Update Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    const isTracked = form.watch("isTracked");

    const [selectedTaxTypeId, setSelectedTaxTypeId] = useState<string | undefined>(undefined);

    // Sync with initial product once taxTypes load
    useEffect(() => {
        if (taxTypes.data && product && !selectedTaxTypeId && open) {
            // First try explicit taxTypeId from database
            if (product.taxTypeId) {
                setSelectedTaxTypeId(product.taxTypeId.toString());
            } else {
                // Fallback to heuristic for legacy data
                const initial = taxTypes.data?.find(t => {
                    if (t.rate === product.taxRate?.toString()) {
                        if (t.rate === "0" || t.rate === "0.00") {
                            const isExempt = product.name?.toLowerCase().includes("exempt") || product.description?.toLowerCase().includes("exempt");
                            if (isExempt) {
                                const zimraTaxId = t.zimraTaxId?.toString();
                                return zimraTaxId == "1" || t.zimraCode === 'C' || t.zimraCode === 'E' || t.name.toLowerCase().includes("exempt");
                            }
                            const zimraTaxId = t.zimraTaxId?.toString();
                            return zimraTaxId == "2" || t.zimraCode === 'D' || t.name.toLowerCase().includes("zero");
                        }
                        return true;
                    }
                    return false;
                })?.id.toString();
                if (initial) setSelectedTaxTypeId(initial);
            }
        }
    }, [taxTypes.data, product, open]);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setSelectedTaxTypeId(undefined); // Reset on close
        }}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit {isService ? "Service" : "Product"}</DialogTitle>
                    <DialogDescription>
                        Update details for {product.name}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isService ? "Service Name" : "Product Name"}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={isService ? "e.g. Consulting, Labor" : "e.g. Widget X"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Details..." className="resize-none h-20" value={field.value || ""} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Tax Configuration Section */}
                        <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 space-y-4">
                            <h4 className="text-sm font-medium text-slate-800 flex items-center gap-2">
                                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                Tax Configuration
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="taxRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ZIMRA Tax Type</FormLabel>
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
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select Tax Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
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
                                            <FormLabel>HS Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Fiscal Code" className="bg-white" value={field.value || ""} onChange={field.onChange} />
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
                                        <FormLabel>Selling Price ($)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" {...field} />
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
                                        <FormLabel>SKU / Code <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="Required" value={field.value || ""} onChange={field.onChange} />
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
                                            <FormLabel>Barcode</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional" value={field.value || ""} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {!isService && (
                            <div className="border rounded-lg p-4 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="isTracked"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                                            <div className="space-y-0.5">
                                                <FormLabel>Track Inventory</FormLabel>
                                                <FormDescription>
                                                    Enable stock tracking
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
                                                    <FormLabel>Current Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || "0"} />
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
                                                    <FormLabel>Low Stock Alert</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || "10"} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Status</FormLabel>
                                        <FormDescription>
                                            Inactive items won't appear in lists
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value ?? true}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateProduct.isPending}>
                                {updateProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
