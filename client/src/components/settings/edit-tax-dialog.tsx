
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { useTaxConfig } from "@/hooks/use-tax-config";

const updateSchema = z.object({
    hsCode: z.string().optional(),
    taxCategoryId: z.string().optional(),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

export function EditTaxDialog({ product }: { product: any }) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const { taxCategories, taxTypes } = useTaxConfig();

    const form = useForm<UpdateFormValues>({
        resolver: zodResolver(updateSchema),
        defaultValues: {
            hsCode: product.hsCode || "",
            taxCategoryId: product.taxCategoryId?.toString() || "",
        },
    });

    // Reset form when product changes or dialog opens
    useEffect(() => {
        if (open) {
            form.reset({
                hsCode: product.hsCode || "",
                taxCategoryId: product.taxCategoryId?.toString() || "",
            });
        }
    }, [open, product, form]);

    const updateProduct = useMutation({
        mutationFn: async (data: UpdateFormValues) => {
            const url = buildUrl(api.products.update.path, { id: product.id });

            // Calculate tax rate from category if selected
            let taxRate = product.taxRate;
            let taxCategoryId = data.taxCategoryId ? parseInt(data.taxCategoryId) : null;

            if (taxCategoryId && taxCategories.data && taxTypes.data) {
                const category = taxCategories.data.find((c: any) => c.id === taxCategoryId);
                if (category && category.defaultTaxTypeId) {
                    const type = taxTypes.data.find((t: any) => t.id === category.defaultTaxTypeId);
                    if (type) {
                        taxRate = type.rate;
                    }
                }
            }

            const payload = {
                hsCode: data.hsCode,
                taxCategoryId: taxCategoryId,
                taxRate: taxRate // Auto-update legacy rate for compatibility
            };

            const res = await apiFetch(url, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to update product");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
            setOpen(false);
        }
    });

    const onSubmit = (data: UpdateFormValues) => {
        updateProduct.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4 text-slate-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Tax Details</DialogTitle>
                    <DialogDescription>
                        Configure tax category for {product.name}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="taxCategoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tax Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a tax category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {taxCategories.data?.map((category: any) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
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
                                        <Input placeholder="Fiscal Code" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={updateProduct.isPending}>
                                {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
