import { useState } from "react";
import { useCurrencies, useCreateCurrency, useUpdateCurrency, useDeleteCurrency } from "@/hooks/use-currencies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Coins } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DeleteButton } from "@/components/delete-button";

const currencySchema = z.object({
  code: z.string().min(3).max(3).toUpperCase(),
  name: z.string().min(2),
  symbol: z.string().min(1),
  exchangeRate: z.string().regex(/^\d*\.?\d*$/, "Must be a valid number").default("1.000000"),
  isBase: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type CurrencyFormValues = z.infer<typeof currencySchema>;

interface CurrencySettingsProps {
  companyId: number;
}

export function CurrencySettings({ companyId }: CurrencySettingsProps) {
  const { data: currencies, isLoading } = useCurrencies(companyId);
  const createCurrency = useCreateCurrency(companyId);
  const updateCurrency = useUpdateCurrency();
  const deleteCurrency = useDeleteCurrency();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      exchangeRate: "1.000000",
      isBase: false,
      isActive: true,
    }
  });

  const onSubmit = async (data: CurrencyFormValues) => {
    try {
      if (editingId) {
        await updateCurrency.mutateAsync({ id: editingId, data });
      } else {
        await createCurrency.mutateAsync(data);
      }
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    form.reset({
      code: "",
      name: "",
      symbol: "",
      exchangeRate: "1.000000",
      isBase: false,
      isActive: true,
    });
  };

  const handleEdit = (currency: any) => {
    setEditingId(currency.id);
    form.reset({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
      isBase: currency.isBase || false,
      isActive: currency.isActive || true,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Currency Management</h2>
          <p className="text-sm text-slate-500">Manage multiple currencies and exchange rates for reporting</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-gradient shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Currency
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black font-display">
                {editingId ? "Edit Currency" : "Add New Currency"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Code (e.g. USD)</Label>
                  <Input {...form.register("code")} placeholder="USD" maxLength={3} className="font-mono h-11" />
                  {form.formState.errors.code && <p className="text-red-500 text-[10px] font-bold">{form.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Symbol (e.g. $)</Label>
                  <Input {...form.register("symbol")} placeholder="$" className="font-mono h-11" />
                  {form.formState.errors.symbol && <p className="text-red-500 text-[10px] font-bold">{form.formState.errors.symbol.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Currency Name</Label>
                <Input {...form.register("name")} placeholder="US Dollar" className="h-11" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Exchange Rate (vs Base)</Label>
                <Input {...form.register("exchangeRate")} placeholder="1.000000" className="h-11 font-mono" />
                <p className="text-[10px] text-slate-400 italic">Rate relative to your base currency.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-slate-700">Set as Base Currency</Label>
                  <p className="text-[10px] text-slate-500 font-medium">Primary currency for reporting and VAT</p>
                </div>
                <Switch
                  checked={form.watch("isBase")}
                  onCheckedChange={(checked) => form.setValue("isBase", checked)}
                />
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl font-black btn-gradient shadow-lg" disabled={createCurrency.isPending || updateCurrency.isPending}>
                {createCurrency.isPending || updateCurrency.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editingId ? "Update Currency" : "Create Currency"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-depth border-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Code</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Name</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Symbol</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Rate</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-200" />
                    </TableCell>
                  </TableRow>
                ) : currencies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium">No currencies defined yet.</TableCell>
                  </TableRow>
                ) : (
                  currencies?.map((currency) => (
                    <TableRow key={currency.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-black font-mono">
                        {currency.code}
                        {currency.isBase && <Badge variant="secondary" className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 font-black border-none">BASE</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-700">{currency.name}</TableCell>
                      <TableCell className="font-mono text-xs">{currency.symbol}</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 font-bold">{Number(currency.exchangeRate).toFixed(6)}</TableCell>
                      <TableCell>
                        <Badge variant={currency.isActive ? "default" : "outline"} className={`text-[10px] h-5 font-black uppercase tracking-wider ${currency.isActive ? "bg-slate-900" : "text-slate-300 border-slate-200"}`}>
                          {currency.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(currency)} className="h-8 w-8 rounded-lg hover:bg-slate-100">
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                          <DeleteButton
                            title="Delete Currency"
                            description={`Remove ${currency.code} from the system?`}
                            onConfirm={async () => {
                              await deleteCurrency.mutateAsync(currency.id);
                            }}
                            isDeleting={deleteCurrency.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-800 flex gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h4 className="font-black uppercase tracking-tight mb-1">Exchange Rate Mechanics</h4>
          <p className="font-medium leading-relaxed italic opacity-80">
            Exchange rates are captured at the moment of invoice creation. Updating a rate here will not affect historical records, ensuring accounting integrity.
          </p>
        </div>
      </div>
    </div>
  );
}
