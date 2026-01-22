
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
import { Pencil, Loader2 } from "lucide-react";
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Customer</DialogTitle>
                    <DialogDescription>
                        Update details for {customer.name}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe or Company Name" {...field} />
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
                                        <FormLabel>Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="individual">Individual</SelectItem>
                                                <SelectItem value="business">Business</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="email@example.com" value={field.value || ""} onChange={field.onChange} />
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
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+263..." value={field.value || ""} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {customerType === "business" && (
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                                <div className="col-span-3 font-medium text-sm text-slate-700 mb-2">Business Details</div>
                                <FormField
                                    control={form.control}
                                    name="tin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>TIN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Tax ID" value={field.value || ""} onChange={field.onChange} />
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
                                            <FormLabel>VAT Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional" value={field.value || ""} onChange={field.onChange} />
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
                                            <FormLabel>BP Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional" value={field.value || ""} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Physical Address" className="resize-none h-20" value={field.value || ""} onChange={field.onChange} />
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
                                        <FormLabel>Billing Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Same as physical if empty" className="resize-none h-20" value={field.value || ""} onChange={field.onChange} />
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
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Internal notes..." className="resize-none" value={field.value || ""} onChange={field.onChange} />
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

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateCustomer.isPending}>
                                {updateCustomer.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
