import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { TaxTypesManager } from "./tax-types-manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TaxComplianceSettingsProps {
  companyId: number;
  formData: any;
  setFormData: (data: any) => void;
}

export function TaxComplianceSettings({ companyId, formData, setFormData }: TaxComplianceSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: syncZimra, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${companyId}/zimra/config/sync`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync ZIMRA configuration");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sync Successful", description: "ZIMRA tax levels updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tax & Compliance</h2>
        <p className="text-sm text-slate-500">Official tax identity and ZIMRA configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-8">
          <Card className="card-depth border-none">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                Identity Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">TIN (Tax ID)</Label>
                  <Input
                    value={formData.tin || ""}
                    onChange={e => setFormData({ ...formData, tin: e.target.value })}
                    placeholder="Taxpayer ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">BP Number</Label>
                  <Input
                    value={formData.bpNumber || ""}
                    onChange={e => setFormData({ ...formData, bpNumber: e.target.value })}
                    placeholder="Business Partner #"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">VAT Number</Label>
                  <Input
                    value={formData.vatNumber || ""}
                    onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="VAT Reg #"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <Checkbox
                    id="vatRegistered"
                    checked={formData.vatRegistered}
                    onCheckedChange={(checked) => setFormData({ ...formData, vatRegistered: checked === true })}
                  />
                  <label htmlFor="vatRegistered" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Company is VAT Registered
                  </label>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <Checkbox
                    id="vatEnabled"
                    checked={formData.vatEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, vatEnabled: checked === true })}
                  />
                  <label htmlFor="vatEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Apply VAT by default on new items
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-depth border-none h-fit">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Tax Rates Management</CardTitle>
                <CardDescription>Configure ZIMRA tax mappings</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <TaxTypesManager companyId={companyId} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-depth border-none bg-indigo-600 text-white overflow-hidden relative group">
            <Zap className="absolute -right-4 -top-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                ZIMRA Sync
              </CardTitle>
              <CardDescription className="text-indigo-100/80">
                Force update tax levels from ZIMRA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-indigo-100 italic">
                This will retrieve the latest ZIMRA tax levels and configuration for your device.
              </p>
              <Button 
                onClick={() => syncZimra()} 
                disabled={isSyncing} 
                variant="secondary" 
                className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl"
              >
                {isSyncing ? "Syncing..." : "Sync Tax Rates"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
