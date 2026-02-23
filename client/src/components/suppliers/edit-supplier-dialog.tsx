
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "@shared/schema";
import { useUpdateSupplier } from "@/hooks/use-suppliers";
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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil, Loader2, Truck } from "lucide-react";
import { useState } from "react";

interface Props {
    supplier: Supplier;
    trigger?: React.ReactNode;
}

export function EditSupplierDialog({ supplier, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const updateSupplier = useUpdateSupplier();

    const form = useForm<InsertSupplier>({
        resolver: zodResolver(insertSupplierSchema),
        defaultValues: {
            name: supplier.name,
            contactPerson: supplier.contactPerson || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            tin: supplier.tin || "",
            vatNumber: supplier.vatNumber || "",
            isActive: supplier.isActive ?? true,
            companyId: supplier.companyId,
        },
    });

    const onSubmit = async (data: InsertSupplier) => {
        try {
            await updateSupplier.mutateAsync({ id: supplier.id, data });
            setOpen(false);
        } catch (error) {
            console.error("Failed to update supplier:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                        <Pencil className="w-4 h-4 text-slate-400" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">Edit Supplier</DialogTitle>
                    <DialogDescription>
                        Update details for {supplier.name}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                        <div className="grid grid-cols-2 gap-5">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Supplier Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Company Name" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contactPerson"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Contact Person</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" value={field.value || ""} onChange={field.onChange} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="email@example.com" value={field.value || ""} onChange={field.onChange} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+263..." value={field.value || ""} onChange={field.onChange} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                            <div className="col-span-2 font-medium text-sm text-emerald-900 mb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Tax & Business IDs
                            </div>
                            <FormField
                                control={form.control}
                                name="tin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs uppercase tracking-wide text-slate-500">TIN</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Supplier TIN" value={field.value || ""} onChange={field.onChange} className="rounded-lg bg-white border-emerald-200/50 focus-visible:ring-emerald-500/20 font-mono text-sm" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="vatNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs uppercase tracking-wide text-slate-500">VAT Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Supplier VAT" value={field.value || ""} onChange={field.onChange} className="rounded-lg bg-white border-emerald-200/50 focus-visible:ring-emerald-500/20 font-mono text-sm" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Address</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Physical Address" className="resize-none h-20 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" value={field.value || ""} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-xl border-slate-200 p-4 shadow-sm bg-slate-50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base font-semibold text-slate-700">Active Status</FormLabel>
                                        <FormDescription className="text-slate-500">
                                            Inactive suppliers won't appear in purchase selection
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateSupplier.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                                {updateSupplier.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
