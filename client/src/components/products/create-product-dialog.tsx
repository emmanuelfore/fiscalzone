
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

export function CreateProductDialog({ companyId, defaultType = "good", triggerLabel = "Add Product" }: { companyId: number, defaultType?: "good" | "service", triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const createProduct = useCreateProduct(companyId);
    const { taxCategories, taxTypes } = useTaxConfig();

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
        },
    });



    const onSubmit = async (data: InsertProduct) => {
        try {
            const { companyId: _, ...rest } = data;
            await createProduct.mutateAsync({ ...rest, productType: defaultType });
            setOpen(false);
            form.reset({ ...form.getValues(), name: "", description: "", price: "0.00" });
        } catch (error) {
            console.error("Failed to create product:", error);
        }
    };

    const isTracked = form.watch("isTracked");
    const isService = defaultType === "service";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New {isService ? "Service" : "Product"}</DialogTitle>
                    <DialogDescription>
                        Create a {isService ? "service offering" : "physical product"} to add to your invoices.
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
                                <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
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
                                                    const selectedType = taxTypes.data?.find((t: any) => t.rate === val);
                                                    if (selectedType) {
                                                        field.onChange(selectedType.rate);
                                                        form.setValue("taxCategoryId", null);
                                                    }
                                                }}
                                                value={field.value?.toString()}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select Tax Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {taxTypes.data?.map((t: any) => (
                                                        <SelectItem key={t.id} value={t.rate}>
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

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createProduct.isPending}>
                                {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save {isService ? "Service" : "Product"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
