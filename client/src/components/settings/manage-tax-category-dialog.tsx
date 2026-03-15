
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { useActiveCompany } from "@/hooks/use-active-company";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    zimraCategoryCode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    category?: any;
    trigger?: React.ReactNode;
}

export function ManageTaxCategoryDialog({ category, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditing = !!category;
    const { activeCompanyId } = useActiveCompany();
    const companyId = activeCompanyId;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: category?.name || "",
            description: category?.description || "",
            zimraCategoryCode: category?.zimraCategoryCode || "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const url = isEditing
                ? buildUrl(api.tax.updateCategory.path, { id: category.id })
                : api.tax.createCategory.path;

            const method = isEditing ? "PATCH" : "POST";

            if (companyId == null) {
                throw new Error("Select a company first before creating a tax category");
            }
            const urlWithCompany = companyId ? `${url}?companyId=${companyId}` : url;
            const res = await apiFetch(urlWithCompany, {
                method,
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to save tax category");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.tax.categories.path] });
            setOpen(false);
            form.reset();
        },
    });

    const onSubmit = (data: FormValues) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Category
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Tax Category" : "Add Tax Category"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? `Modify ${category.name}` : "Create a new ZIMRA tax category."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Basic Food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="zimraCategoryCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ZIMRA Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. FOOD_BASIC" {...field} />
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
                                        <Input placeholder="Details..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Save Changes" : "Create Category"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
