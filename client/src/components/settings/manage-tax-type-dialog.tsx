
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
    FormDescription,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().min(1, "Tax Code is required (e.g., VAT-STD)"),
    zimraCode: z.string().min(1, "ZIMRA Code is required (e.g. C)"),
    zimraTaxId: z.string().optional(),
    rate: z.string().min(1, "Rate is required").refine((val) => !isNaN(parseFloat(val)), "Must be a number"),
    effectiveFrom: z.string().min(1, "Effective Date is required"),
    effectiveTo: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    taxType?: any;
    trigger?: React.ReactNode;
}

export function ManageTaxTypeDialog({ taxType, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isEditing = !!taxType;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: taxType?.name || "",
            code: taxType?.code || "",
            zimraCode: taxType?.zimraCode || "",
            zimraTaxId: taxType?.zimraTaxId || "",
            rate: taxType?.rate?.toString() || "15.00",
            effectiveFrom: taxType?.effectiveFrom ? new Date(taxType.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effectiveTo: taxType?.effectiveTo ? new Date(taxType.effectiveTo).toISOString().split('T')[0] : "",
            description: taxType?.description || "",
            isActive: taxType?.isActive ?? true,
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const url = isEditing
                ? buildUrl(api.tax.updateType.path, { id: taxType.id })
                : api.tax.createType.path;

            const method = isEditing ? "PATCH" : "POST";

            // Data transformation
            const payload = {
                ...data,
                effectiveTo: data.effectiveTo === "" ? null : data.effectiveTo,
                zimraTaxId: data.zimraTaxId === "" ? null : data.zimraTaxId,
            };

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save tax type");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.tax.types.path] });
            setOpen(false);
            form.reset();
            toast({
                title: "Success",
                description: `Tax type ${isEditing ? "updated" : "created"} successfully.`,
            });
        },
        onError: (err: any) => {
            console.error("Failed to save tax type:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to save tax type",
                variant: "destructive",
            });
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
                        <Plus className="w-4 h-4" /> Add Tax Type
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? `Modify ${taxType.name} settings.` : "Create a new ZIMRA tax type configuration."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tax Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. STANDARD VAT" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="zimraCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax Code *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. C" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="zimraTaxId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax ID (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 3" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Internal Code *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. VAT-STD" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="rate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax Rate (%) *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="15.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="effectiveFrom"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valid From *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="effectiveTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valid Till</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Standard VAT rate for taxable supplies" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Status</FormLabel>
                                        <FormDescription>
                                            Inactive tax types won't appear in selection
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Save Changes" : "Create Tax Type"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
