
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { useUpdateCustomer } from "@/hooks/use-customers";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil, Loader2, Building2 } from "lucide-react";
import { useState } from "react";

interface Props {
    customer: Customer;
    trigger?: React.ReactNode;
}

export function EditCustomerDialog({ customer, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const updateCustomer = useUpdateCustomer();

    const form = useForm<InsertCustomer>({
        resolver: zodResolver(insertCustomerSchema),
        defaultValues: {
            name: customer.name,
            email: customer.email || "",
            phone: customer.phone || "",
            mobile: customer.mobile || "",
            address: customer.address || "",
            billingAddress: customer.billingAddress || "",
            city: customer.city || "",
            country: customer.country || "Zimbabwe",
            tin: customer.tin || "",
            vatNumber: customer.vatNumber || "",
            bpNumber: customer.bpNumber || "",
            notes: customer.notes || "",
            customerType: customer.customerType || "individual",
            companyId: customer.companyId,
            isActive: customer.isActive ?? true,
        },
    });

    const onSubmit = async (data: InsertCustomer) => {
        try {
            await updateCustomer.mutateAsync({ id: customer.id, data });
            setOpen(false);
        } catch (error) {
            console.error("Failed to update customer:", error);
        }
    };

    const customerType = form.watch("customerType");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-violet-50 hover:text-primary transition-all">
                        <Pencil className="w-4 h-4 text-slate-400" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">Edit Customer</DialogTitle>
                    <DialogDescription>
                        Update details for {customer.name}
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
                                        <FormLabel className="text-slate-700 font-semibold">Customer Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe or Company Name" {...field} className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="customerType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl shadow-xl">
                                                <SelectItem value="individual">Individual</SelectItem>
                                                <SelectItem value="business">Business</SelectItem>
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

                        {customerType === "business" && (
                            <div className="grid grid-cols-3 gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <div className="col-span-3 font-medium text-sm text-blue-900 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Business Details
                                    </span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">ZIMRA Requirement</span>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="tin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs uppercase tracking-wide text-slate-500">TIN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="10 Digits" value={field.value || ""} onChange={field.onChange} className="rounded-lg bg-white border-blue-200/50 focus-visible:ring-blue-500/20 font-mono text-sm" />
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
                                                <Input placeholder="9-10 Digits" value={field.value || ""} onChange={field.onChange} className="rounded-lg bg-white border-blue-200/50 focus-visible:ring-blue-500/20 font-mono text-sm" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bpNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs uppercase tracking-wide text-slate-500">BP Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional" value={field.value || ""} onChange={field.onChange} className="rounded-lg bg-white border-blue-200/50 focus-visible:ring-blue-500/20 font-mono text-sm" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-5">
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
                                name="billingAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700 font-semibold">Billing Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Same as physical if empty" className="resize-none h-20 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" value={field.value || ""} onChange={field.onChange} />
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
                                    <FormLabel className="text-slate-700 font-semibold">Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Internal notes..." className="resize-none rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20" value={field.value || ""} onChange={field.onChange} />
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
                                            Inactive customers won't appear in invoice selection
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
                            <Button type="submit" disabled={updateCustomer.isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                {updateCustomer.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
