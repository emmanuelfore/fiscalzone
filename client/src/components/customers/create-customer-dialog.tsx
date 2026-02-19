
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type InsertCustomer } from "@shared/schema";
import { useCreateCustomer } from "@/hooks/use-customers";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is available in Layout, but good to have imports valid? global Toaster is in App.tsx.

export function CreateCustomerDialog({ companyId }: { companyId: number }) {
    const [open, setOpen] = useState(false);
    const createCustomer = useCreateCustomer(companyId);

    const form = useForm<InsertCustomer>({
        resolver: zodResolver(insertCustomerSchema),
        defaultValues: {
            name: "",
            email: "", // Initialize as empty strings to avoid uncontrolled warnings
            phone: "",
            mobile: "",
            address: "",
            billingAddress: "",
            city: "",
            country: "Zimbabwe",
            tin: "",
            vatNumber: "",
            bpNumber: "",
            notes: "",
            customerType: "individual",
            companyId: companyId, // Pre-fill company ID
        },
    });

    const onSubmit = async (data: InsertCustomer) => {
        try {
            const { companyId: _, ...rest } = data;
            await createCustomer.mutateAsync(rest);
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error("Failed to create customer:", error);
        }
    };

    const customerType = form.watch("customerType");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                    <Plus className="w-4 h-4" />
                    Add Customer
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold text-slate-900">Add New Customer</DialogTitle>
                    <DialogDescription>
                        Enter the details of your new customer for invoicing and records.
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-slate-200 text-slate-600 hover:text-slate-900">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createCustomer.isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                {createCustomer.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Customer
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
