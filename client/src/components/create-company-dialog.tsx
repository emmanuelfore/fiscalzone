import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, type InsertCompany } from "@shared/schema";
import { useCreateCompany } from "@/hooks/use-companies";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function CreateCompanyDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createCompany = useCreateCompany();

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      country: "Zimbabwe",
    }
  });

  const onSubmit = async (data: InsertCompany) => {
    try {
      await createCompany.mutateAsync(data);
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Register Company</DialogTitle>
          <DialogDescription>
            Enter your company details to start issuing ZIMRA-compliant invoices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" {...form.register("name")} placeholder="Acme Corp Pvt Ltd" />
              {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading Name (Optional)</Label>
              <Input id="tradingName" {...form.register("tradingName")} placeholder="Acme" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register("address")} placeholder="123 Samora Machel Ave" />
              {form.formState.errors.address && <p className="text-red-500 text-xs">{form.formState.errors.address.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} placeholder="Harare" />
              {form.formState.errors.city && <p className="text-red-500 text-xs">{form.formState.errors.city.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} placeholder="+263 77 123 4567" />
              {form.formState.errors.phone && <p className="text-red-500 text-xs">{form.formState.errors.phone.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="accounts@acme.co.zw" />
              {form.formState.errors.email && <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>}
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="font-semibold mb-4 text-primary">ZIMRA Details</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin">TIN (Taxpayer ID)</Label>
              <Input id="tin" {...form.register("tin")} placeholder="1000012345" />
              {form.formState.errors.tin && <p className="text-red-500 text-xs">{form.formState.errors.tin.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input id="vatNumber" {...form.register("vatNumber")} placeholder="12345678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpNumber">BP Number</Label>
              <Input id="bpNumber" {...form.register("bpNumber")} placeholder="2000012345" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fdmsDeviceId">Fiscal Device ID</Label>
              <Input id="fdmsDeviceId" {...form.register("fdmsDeviceId")} placeholder="FD00123" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Company"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
